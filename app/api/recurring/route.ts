import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const recurringSchema = z.object({
  accountId: z.string(),
  categoryId: z.string().nullable().optional(),
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']).default('EXPENSE'),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
  nextDate: z.string(), // ISO date string
  active: z.boolean().default(true),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recurring = await db.recurringTransaction.findMany({
    where: { userId: session.user.id },
    include: {
      account: { select: { id: true, name: true, currency: true, color: true } },
      category: { select: { id: true, name: true, color: true, icon: true } },
    },
    orderBy: { nextDate: 'asc' },
  })

  return NextResponse.json(recurring)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const data = recurringSchema.parse(body)

    // Verify account belongs to user
    const account = await db.bankAccount.findFirst({
      where: { id: data.accountId, userId: session.user.id },
    })
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const recurring = await db.recurringTransaction.create({
      data: {
        userId: session.user.id,
        accountId: data.accountId,
        categoryId: data.categoryId ?? null,
        description: data.description,
        amount: data.amount,
        type: data.type,
        frequency: data.frequency,
        nextDate: new Date(data.nextDate),
        active: data.active,
      },
      include: {
        account: { select: { id: true, name: true, currency: true, color: true } },
        category: { select: { id: true, name: true, color: true, icon: true } },
      },
    })

    return NextResponse.json(recurring, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
