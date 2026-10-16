import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const connection = await db.bankConnection.findUnique({
    where: { bankAccountId: accountId },
  })

  if (!connection || connection.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await db.bankConnection.delete({ where: { id: connection.id } })
  return NextResponse.json({ success: true })
}
