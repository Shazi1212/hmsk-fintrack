import { parseAmount } from '@/lib/utils'
import { autoDetectCategory, detectTransactionType } from '@/lib/categorizer'

export interface ParsedTransaction {
  date: Date
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  category: string
  rawLine?: string
}

export interface ParseResult {
  transactions: ParsedTransaction[]
  errors: string[]
  rawText?: string
}

// Date pattern variants across locales
const DATE_PATTERNS = [
  // DD/MM/YYYY or DD.MM.YYYY (European)
  /(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})/,
  // MM/DD/YYYY (US)
  /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
  // YYYY-MM-DD (ISO)
  /(\d{4})-(\d{1,2})-(\d{1,2})/,
  // DD Mon YYYY (e.g. 15 Jan 2024)
  /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
  // DD/MM (missing year - infer current)
  /(\d{1,2})[.\/](\d{1,2})/,
]

const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  // German
  mär: 3, mai: 5, okt: 10, dez: 12,
  // Portuguese
  fev: 2, abr: 4, ago: 8, set: 9, out: 10,
}

function parseDate(text: string): Date | null {
  const currentYear = new Date().getFullYear()

  // ISO date
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]))
  }

  // DD Mon YYYY
  const wordMatch = text.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{4})/i)
  if (wordMatch) {
    const month = MONTH_MAP[wordMatch[2].toLowerCase().slice(0, 3)]
    if (month) {
      return new Date(parseInt(wordMatch[3]), month - 1, parseInt(wordMatch[1]))
    }
  }

  // DD/MM/YYYY or DD.MM.YYYY
  const euroMatch = text.match(/(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})/)
  if (euroMatch) {
    let year = parseInt(euroMatch[3])
    if (year < 100) year += 2000
    const d = parseInt(euroMatch[1])
    const m = parseInt(euroMatch[2])
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(year, m - 1, d)
    }
  }

  // DD/MM (no year)
  const shortMatch = text.match(/(\d{1,2})[.\/](\d{1,2})/)
  if (shortMatch) {
    const d = parseInt(shortMatch[1])
    const m = parseInt(shortMatch[2])
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(currentYear, m - 1, d)
    }
  }

  return null
}

function parseAmountFromLine(line: string): number | null {
  // Try to find a standalone number at end of line (common in bank statements)
  // Handles: 1,234.56 | 1.234,56 | -1234.56 | 1 234.56 | (1,234.56)
  const patterns = [
    // negative in parens: (1,234.56)
    /\((\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?)\)\s*$/,
    // with +/- sign
    /([+-]?\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?)\s*$/,
    // plain number
    /([+-]?\d+[.,]\d{2})\s*$/,
  ]

  for (const pattern of patterns) {
    const match = line.match(pattern)
    if (match) {
      const raw = match[1].replace(/\s/g, '')
      const amount = parseAmount(raw)
      if (!isNaN(amount) && amount !== 0) {
        // negative in parens = debit
        if (line.match(/\([\d.,]+\)/)) return -Math.abs(amount)
        return amount
      }
    }
  }
  return null
}

export async function parsePDFBuffer(buffer: Buffer): Promise<ParseResult> {
  const errors: string[] = []
  const transactions: ParsedTransaction[] = []

  let text = ''
  try {
    // Dynamically import pdf-parse to avoid Next.js bundling issues
    const pdfParse = (await import('pdf-parse')).default
    const pdfData = await pdfParse(buffer)
    text = pdfData.text
  } catch (err) {
    errors.push('Could not extract text from PDF. Make sure it is a text-based PDF (not scanned image).')
    return { transactions, errors }
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip header/footer lines
    if (
      line.match(/^(page|seite|página|account|konto|conta|balance|datum|date|data|beschreibung|description|descrição|debit|credit|betrag|amount|valor)/i) ||
      line.match(/^\d+$/) // page numbers
    ) continue

    const date = parseDate(line)
    if (!date) continue

    const amount = parseAmountFromLine(line)
    if (amount === null) continue

    // Description: everything between date and amount, or next line
    let description = line
      .replace(/(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})/, '')
      .replace(/([+-]?\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2})?)$/, '')
      .replace(/\([\d.,]+\)/, '')
      .trim()

    if (description.length < 3 && i + 1 < lines.length) {
      description = lines[i + 1]
    }

    if (description.length < 2) continue

    const category = autoDetectCategory(description)
    const type = detectTransactionType(description, amount)

    transactions.push({
      date,
      description: description.slice(0, 200),
      amount: type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount),
      type,
      category,
      rawLine: line,
    })
  }

  if (transactions.length === 0) {
    errors.push('No transactions could be parsed. The PDF may use an unsupported format.')
  }

  return { transactions, errors, rawText: text.slice(0, 500) }
}
