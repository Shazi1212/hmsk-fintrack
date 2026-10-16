import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bankName: z.string().min(1).max(100).optional(),
  currency: z.string().length(3).optional(),
  balance: z.number().optional(),
  color: z.string().optional(),
})

async function getAccount(id: string, userId: string) {
  return db.bankAccount.findFirst({ where: { id, userId } })
}

// Next.js 15: params is now a Promise
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const account = await db.bankAccount.findFirst({
    where: { id, userId: session.user.id },
    include: {
      transactions: {
        orderBy: { date: 'desc' },
        include: { category: true, transferTo: { select: { id: true, name: true } } },
      },
      statements: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  return NextResponse.json(account)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const account = await getAccount(id, session.user.id)
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    const updated = await db.bankAccount.update({
      where: { id },
      data,
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
  const account = await getAccount(id, session.user.id)
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

  await db.bankAccount.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
