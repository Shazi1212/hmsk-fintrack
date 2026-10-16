import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { autoDetectCategory } from '@/lib/categorizer'

const txSchema = z.object({
  accountId: z.string(),
  date: z.string(),
  description: z.string().min(1).max(300),
  amount: z.number(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  categoryId: z.string().optional().nullable(),
  transferToId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const month = searchParams.get('month') // YYYY-MM
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  // Build where clause
  const where: Record<string, unknown> = {
    account: { userId: session.user.id },
  }

  if (accountId) where.accountId = accountId

  if (month) {
    const [year, mon] = month.split('-').map(Number)
    where.date = {
      gte: new Date(year, mon - 1, 1),
      lt: new Date(year, mon, 1),
    }
  }

  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where,
      include: {
        category: true,
        account: { select: { id: true, name: true, currency: true, color: true } },
        transferTo: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.transaction.count({ where }),
  ])

  return NextResponse.json({ transactions, total })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = txSchema.parse(body)

    // Verify account belongs to user
    const account = await db.bankAccount.findFirst({
      where: { id: data.accountId, userId: session.user.id },
    })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    // Auto-assign category if not provided
    let categoryId = data.categoryId
    if (!categoryId) {
      const suggestedName = autoDetectCategory(data.description)
      const cat = await db.category.findFirst({
        where: { userId: session.user.id, name: suggestedName },
      })
      if (cat) categoryId = cat.id
    }

    // Normalize amount sign by type
    const amount = data.type === 'EXPENSE'
      ? -Math.abs(data.amount)
      : Math.abs(data.amount)

    const tx = await db.transaction.create({
      data: {
        accountId: data.accountId,
        date: new Date(data.date),
        description: data.description,
        amount,
        type: data.type,
        categoryId: categoryId || null,
        transferToId: data.transferToId || null,
        notes: data.notes || null,
      },
      include: { category: true, transferTo: { select: { id: true, name: true } } },
    })

    // Update account balance
    await db.bankAccount.update({
      where: { id: data.accountId },
      data: { balance: { increment: amount } },
    })

    // If transfer, create mirror transaction on destination account
    if (data.type === 'TRANSFER' && data.transferToId) {
      const destAccount = await db.bankAccount.findFirst({
        where: { id: data.transferToId, userId: session.user.id },
      })
      if (destAccount) {
        await db.transaction.create({
          data: {
            accountId: data.transferToId,
            date: new Date(data.date),
            description: `Transfer from ${account.name}`,
            amount: Math.abs(amount),
            type: 'INCOME',
            notes: `Transfer from ${account.name}`,
          },
        })
        await db.bankAccount.update({
          where: { id: data.transferToId },
          data: { balance: { increment: Math.abs(amount) } },
        })
      }
    }

    return NextResponse.json(tx, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Create transaction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
