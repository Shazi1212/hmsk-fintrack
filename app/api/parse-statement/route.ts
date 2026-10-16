import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { parsePDFBuffer } from '@/lib/pdf-parser'

export const maxDuration = 60 // Allow up to 60s for PDF parsing

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const accountId = formData.get('accountId') as string | null

    if (!file || !accountId) {
      return NextResponse.json({ error: 'Missing file or accountId' }, { status: 400 })
    }

    // Verify account belongs to user
    const account = await db.bankAccount.findFirst({
      where: { id: accountId, userId: session.user.id },
    })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    // Create a statement record
    const statement = await db.statement.create({
      data: {
        accountId,
        fileName: file.name,
        status: 'PROCESSING',
      },
    })

    // Parse the PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    const { transactions, errors } = await parsePDFBuffer(buffer)

    if (transactions.length === 0) {
      await db.statement.update({
        where: { id: statement.id },
        data: { status: 'FAILED', errorMsg: errors[0] || 'No transactions found' },
      })
      return NextResponse.json({ error: errors[0] || 'Could not parse any transactions', errors }, { status: 422 })
    }

    // Fetch user's categories
    const categories = await db.category.findMany({
      where: { userId: session.user.id },
    })
    const catMap = Object.fromEntries(categories.map(c => [c.name, c.id]))

    // Deduplicate: check for existing transactions on same date/amount/description
    const existing = await db.transaction.findMany({
      where: { accountId },
      select: { date: true, amount: true, description: true },
    })
    const existingKeys = new Set(
      existing.map(t => `${t.date.toISOString().slice(0, 10)}_${t.amount}_${t.description.slice(0, 30)}`)
    )

    let imported = 0
    let skipped = 0
    let balanceDelta = 0

    for (const tx of transactions) {
      const key = `${tx.date.toISOString().slice(0, 10)}_${tx.amount}_${tx.description.slice(0, 30)}`
      if (existingKeys.has(key)) {
        skipped++
        continue
      }

      const categoryId = catMap[tx.category] || null

      await db.transaction.create({
        data: {
          accountId,
          date: tx.date,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          categoryId,
          importedFrom: file.name,
        },
      })

      balanceDelta += tx.amount
      imported++
    }

    // Update account balance
    if (balanceDelta !== 0) {
      await db.bankAccount.update({
        where: { id: accountId },
        data: { balance: { increment: balanceDelta } },
      })
    }

    // Mark statement as complete
    await db.statement.update({
      where: { id: statement.id },
      data: { status: 'COMPLETED', parsedCount: imported },
    })

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: transactions.length,
      errors,
    })
  } catch (error) {
    console.error('Parse statement error:', error)
    return NextResponse.json({ error: 'Failed to process statement' }, { status: 500 })
  }
}
