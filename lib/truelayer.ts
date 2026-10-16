import { db } from '@/lib/db'
import { autoDetectCategory, detectTransactionType } from '@/lib/categorizer'

/**
 * Optional TrueLayer bank sync.
 *
 * The feature is OFF unless both TRUELAYER_CLIENT_ID and TRUELAYER_CLIENT_SECRET
 * are set. TRUELAYER_ENV selects "sandbox" (default) or "live".
 */

export function isBankSyncEnabled(): boolean {
  return Boolean(process.env.TRUELAYER_CLIENT_ID && process.env.TRUELAYER_CLIENT_SECRET)
}

export function truelayerEnv(): 'sandbox' | 'live' {
  return process.env.TRUELAYER_ENV === 'live' ? 'live' : 'sandbox'
}

export function truelayerHosts() {
  return truelayerEnv() === 'live'
    ? { auth: 'https://auth.truelayer.com', api: 'https://api.truelayer.com' }
    : { auth: 'https://auth.truelayer-sandbox.com', api: 'https://api.truelayer-sandbox.com' }
}

export function truelayerProviders(): string {
  if (process.env.TRUELAYER_PROVIDERS) return process.env.TRUELAYER_PROVIDERS
  return truelayerEnv() === 'live'
    ? 'uk-ob-all uk-oauth-all'
    : 'uk-cs-mock uk-ob-all uk-oauth-all'
}

export function appUrl(): string {
  return (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export function redirectUri(): string {
  return `${appUrl()}/api/banking/callback`
}

async function refreshAccessToken(connection: {
  id: string
  refreshToken: string
}): Promise<string | null> {
  const res = await fetch(`${truelayerHosts().auth}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.TRUELAYER_CLIENT_ID!,
      client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
      refresh_token: connection.refreshToken,
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  await db.bankConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || connection.refreshToken,
      tokenExpiresAt: expiresAt,
    },
  })

  return tokens.access_token
}

export type SyncResult =
  | { success: true; imported: number; total: number }
  | { success: false; error: string; status: number }

/** Pull the last 90 days of transactions + current balance for one linked account. */
export async function syncBankAccount(accountId: string): Promise<SyncResult> {
  if (!isBankSyncEnabled()) {
    return { success: false, error: 'Bank sync is not configured', status: 404 }
  }

  const connection = await db.bankConnection.findUnique({
    where: { bankAccountId: accountId },
  })
  if (!connection) {
    return { success: false, error: 'No bank connection found', status: 404 }
  }

  let accessToken = connection.accessToken
  if (new Date() >= connection.tokenExpiresAt) {
    const refreshed = await refreshAccessToken(connection)
    if (!refreshed) {
      return { success: false, error: 'Token refresh failed. Please reconnect your bank.', status: 401 }
    }
    accessToken = refreshed
  }

  const api = truelayerHosts().api
  const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to = new Date().toISOString().split('T')[0]

  const txRes = await fetch(
    `${api}/data/v1/accounts/${connection.truelayerAccountId}/transactions?from=${from}&to=${to}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!txRes.ok) {
    return { success: false, error: 'Failed to fetch transactions from bank', status: 502 }
  }

  const txData = await txRes.json()
  const transactions = txData.results || []

  const balanceRes = await fetch(
    `${api}/data/v1/accounts/${connection.truelayerAccountId}/balance`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (balanceRes.ok) {
    const balanceData = await balanceRes.json()
    const balance = balanceData.results?.[0]?.current
    if (balance !== undefined) {
      await db.bankAccount.update({ where: { id: accountId }, data: { balance } })
    }
  }

  const existingTxs = await db.transaction.findMany({
    where: { accountId, importedFrom: { startsWith: 'truelayer:' } },
    select: { importedFrom: true },
  })
  const existingIds = new Set(existingTxs.map(t => t.importedFrom))

  const userCategories = await db.category.findMany({
    where: { userId: connection.userId },
    select: { id: true, name: true },
  })
  const categoryMap = new Map(userCategories.map(c => [c.name.toLowerCase(), c.id]))

  let imported = 0
  for (const tx of transactions) {
    const truelayerId = `truelayer:${tx.transaction_id}`
    if (existingIds.has(truelayerId)) continue

    const amount = tx.amount // TrueLayer: positive = credit, negative = debit
    const description = tx.description || tx.merchant_name || 'Bank transaction'
    const type = detectTransactionType(description, amount)
    const detectedCategory = autoDetectCategory(description)
    const categoryId = categoryMap.get(detectedCategory.toLowerCase()) ?? null

    await db.transaction.create({
      data: {
        accountId,
        date: new Date(tx.timestamp),
        description: description.slice(0, 200),
        amount: type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount),
        type,
        ...(categoryId ? { categoryId } : {}),
        importedFrom: truelayerId,
        notes: tx.merchant_name ? `Merchant: ${tx.merchant_name}` : undefined,
      },
    })
    imported++
  }

  await db.bankConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date() },
  })

  return { success: true, imported, total: transactions.length }
}
