import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isBankSyncEnabled, syncBankAccount } from '@/lib/truelayer'

export const dynamic = 'force-dynamic'

/**
 * Syncs all connected bank accounts. Call it once a day from any scheduler
 * (system cron, a container scheduler, Vercel Cron, ...):
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/cron/sync-banks
 *
 * Disabled unless TrueLayer credentials AND CRON_SECRET are set.
 */
export async function GET(req: Request) {
  if (!isBankSyncEnabled() || !process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Bank sync cron is not configured' }, { status: 404 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const connections = await db.bankConnection.findMany()
  const results = []

  for (const conn of connections) {
    try {
      const r = await syncBankAccount(conn.bankAccountId)
      results.push({ accountId: conn.bankAccountId, ...r })
    } catch {
      results.push({ accountId: conn.bankAccountId, success: false, error: 'sync failed' })
    }
  }

  return NextResponse.json({ synced: results.length, results })
}
