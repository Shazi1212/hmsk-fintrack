import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { isBankSyncEnabled, syncBankAccount } from '@/lib/truelayer'

// POST - sync one connected account owned by the logged-in user
export async function POST(req: NextRequest) {
  if (!isBankSyncEnabled()) {
    return NextResponse.json({ error: 'Bank sync is not configured on this server' }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { accountId } = body
  if (!accountId) return NextResponse.json({ error: 'accountId required' }, { status: 400 })

  const connection = await db.bankConnection.findUnique({ where: { bankAccountId: accountId } })
  if (!connection || connection.userId !== session.user.id) {
    return NextResponse.json({ error: 'No bank connection found' }, { status: 404 })
  }

  const result = await syncBankAccount(accountId)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result)
}

// GET - sync all connected accounts for the logged-in user
export async function GET() {
  if (!isBankSyncEnabled()) {
    return NextResponse.json({ error: 'Bank sync is not configured on this server' }, { status: 404 })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const connections = await db.bankConnection.findMany({ where: { userId: session.user.id } })

  const results = []
  for (const conn of connections) {
    const r = await syncBankAccount(conn.bankAccountId)
    results.push({ accountId: conn.bankAccountId, ...r })
  }
  return NextResponse.json({ results })
}
