import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  date: z.string().optional(),
  description: z.string().min(1).max(300).optional(),
  amount: z.number().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  categoryId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

// Next.js 15: params is now a Promise
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const tx = await db.transaction.findFirst({
    where: { id, account: { userId: session.user.id } },
  })
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    // Recompute balance delta if amount/type changed
    if (data.amount !== undefined || data.type !== undefined) {
      const newType = data.type ?? tx.type
      const newRawAmount = data.amount ?? Math.abs(tx.amount)
      const newAmount = newType === 'EXPENSE' ? -Math.abs(newRawAmount) : Math.abs(newRawAmount)
      const delta = newAmount - tx.amount

      await db.bankAccount.update({
        where: { id: tx.accountId },
        data: { balance: { increment: delta } },
      })

      const updated = await db.transaction.update({
        where: { id },
        data: {
          ...data,
          date: data.date ? new Date(data.date) : undefined,
          amount: newAmount,
        },
        include: { category: true },
      })

      return NextResponse.json(updated)
    }

    const updated = await db.transaction.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      },
      include: { category: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const tx = await db.transaction.findFirst({
    where: { id, account: { userId: session.user.id } },
  })
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })

  // Reverse the balance effect
  await db.bankAccount.update({
    where: { id: tx.accountId },
    data: { balance: { decrement: tx.amount } },
  })

  await db.transaction.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
