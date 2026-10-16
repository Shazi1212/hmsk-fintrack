import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().optional(),
  icon: z.string().nullable().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const cat = await db.category.findFirst({ where: { id, userId: session.user.id } })
  if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)
    const updated = await db.category.update({ where: { id }, data })
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

  const cat = await db.category.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { transactions: true } } },
  })
  if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if ((cat as any)._count.transactions > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${(cat as any)._count.transactions} transactions use this category` },
      { status: 409 }
    )
  }

  await db.category.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
