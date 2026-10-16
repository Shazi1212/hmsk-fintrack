import { NextResponse } from 'next/server'
import { isBankSyncEnabled, truelayerEnv } from '@/lib/truelayer'

export const dynamic = 'force-dynamic'

// Tells the UI whether the optional TrueLayer bank sync is configured.
export async function GET() {
  const enabled = isBankSyncEnabled()
  return NextResponse.json({ enabled, env: enabled ? truelayerEnv() : null })
}
