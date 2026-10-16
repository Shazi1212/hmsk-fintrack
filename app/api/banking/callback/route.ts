import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { appUrl, isBankSyncEnabled, redirectUri, syncBankAccount, truelayerHosts } from '@/lib/truelayer'

export async function GET(req: NextRequest) {
  const base = appUrl()

  if (!isBankSyncEnabled()) {
    return NextResponse.redirect(`${base}/accounts?error=bank_sync_not_configured`)
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.redirect(`${base}/login`)

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) return NextResponse.redirect(`${base}/accounts?error=bank_connection_failed`)
  if (!code || !state) return NextResponse.redirect(`${base}/accounts?error=missing_params`)

  let accountId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    accountId = decoded.accountId
    if (decoded.userId !== session.user.id) throw new Error('user mismatch')
  } catch {
    return NextResponse.redirect(`${base}/accounts?error=invalid_state`)
  }

  // The account must belong to the signed-in user
  const account = await db.bankAccount.findFirst({
    where: { id: accountId, userId: session.user.id },
  })
  if (!account) return NextResponse.redirect(`${base}/accounts?error=invalid_state`)

  const { auth, api } = truelayerHosts()

  // Exchange code for tokens
  const tokenRes = await fetch(`${auth}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.TRUELAYER_CLIENT_ID!,
      client_secret: process.env.TRUELAYER_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      code,
    }),
  })
  if (!tokenRes.ok) return NextResponse.redirect(`${base}/accounts?error=token_exchange_failed`)

  const tokens = await tokenRes.json()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  // Use the first account TrueLayer returns for this consent
  const accountsRes = await fetch(`${api}/data/v1/accounts`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  let truelayerAccountId = 'default'
  if (accountsRes.ok) {
    const accountsData = await accountsRes.json()
    if (accountsData.results?.length > 0) truelayerAccountId = accountsData.results[0].account_id
  }

  await db.bankConnection.upsert({
    where: { bankAccountId: accountId },
    create: {
      userId: session.user.id,
      bankAccountId: accountId,
      truelayerAccountId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
    },
    update: {
      truelayerAccountId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: expiresAt,
    },
  })

  // Initial import (errors are non-fatal; the user can press "Sync now")
  await syncBankAccount(accountId).catch(() => null)

  return NextResponse.redirect(`${base}/accounts?connected=true`)
}
