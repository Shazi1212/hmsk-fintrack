import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { addDays, addWeeks, addMonths, addYears } from 'date-fns'

const updateSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  amount: z.number().positive().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  nextDate: z.string().optional(),
  active: z.boolean().optional(),
  categoryId: z.string().nullable().optional(),
  applyNow: z.boolean().optional(), // create a transaction immediately
})

function advanceDate(date: Date, frequency: string): Date {
  switch (frequency) {
    case 'daily': return addDays(date, 1)
    case 'weekly': return addWeeks(date, 1)
    case 'yearly': return addYears(date, 1)
    default: return addMonths(date, 1)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const rec = await db.recurringTransaction.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)
    const { applyNow, ...updateData } = data

    // Apply the recurring transaction NOW (e.g. user taps "Log it")
    if (applyNow) {
      const freq = rec.frequency
      const newNextDate = advanceDate(rec.nextDate, freq)
      const amount = rec.type === 'EXPENSE' ? -Math.abs(rec.amount) : Math.abs(rec.amount)

      await Promise.all([
        db.transaction.create({
          data: {
            accountId: rec.accountId,
            categoryId: rec.categoryId,
            date: new Date(),
            description: rec.description,
            amount,
            type: rec.type,
          },
        }),
        db.bankAccount.update({
          where: { id: rec.accountId },
          data: { balance: { increment: amount } },
        }),
        db.recurringTransaction.update({
          where: { id },
          data: { nextDate: newNextDate },
        }),
      ])

      return NextResponse.json({ success: true, nextDate: newNextDate })
    }

    const updated = await db.recurringTransaction.update({
      where: { id },
      data: {
        ...updateData,
        nextDate: updateData.nextDate ? new Date(updateData.nextDate) : undefined,
      },
      include: {
        account: { select: { id: true, name: true, currency: true, color: true } },
        category: { select: { id: true, name: true, color: true, icon: true } },
      },
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
  const rec = await db.recurringTransaction.findFirst({ where: { id, userId: session.user.id } })
  if (!rec) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.recurringTransaction.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
