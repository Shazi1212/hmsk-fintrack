'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, CreditCard, TrendingUp, TrendingDown, ArrowUpRight, Link2, Link2Off, RefreshCw, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import AccountForm from '@/components/accounts/AccountForm'

interface Account {
  id: string
  name: string
  bankName: string
  currency: string
  balance: number
  color: string
  _count: { transactions: number }
  transactions: Array<{ amount: number; type: string }>
  bankConnection?: { lastSyncedAt: string | null } | null
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [bankSyncEnabled, setBankSyncEnabled] = useState(false)
  const searchParams = useSearchParams()

  async function fetchAccounts() {
    const res = await fetch('/api/accounts')
    if (res.ok) setAccounts(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    fetchAccounts()
    fetch('/api/banking/status')
      .then(r => (r.ok ? r.json() : { enabled: false }))
      .then(d => setBankSyncEnabled(!!d.enabled))
      .catch(() => setBankSyncEnabled(false))
    if (searchParams.get('connected') === 'true') {
      setSuccessMsg('Bank connected successfully! Transactions are being imported.')
      setTimeout(() => setSuccessMsg(null), 5000)
    }
    if (searchParams.get('error')) {
      setSuccessMsg(`Connection failed: ${searchParams.get('error')}`)
      setTimeout(() => setSuccessMsg(null), 5000)
    }
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this account and all its transactions? This cannot be undone.')) return
    await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    fetchAccounts()
  }

  async function handleConnect(accountId: string) {
    window.location.href = `/api/banking/connect?accountId=${accountId}`
  }

  async function handleDisconnect(accountId: string) {
    if (!confirm('Disconnect this bank? Existing transactions will be kept.')) return
    await fetch(`/api/banking/disconnect?accountId=${accountId}`, { method: 'DELETE' })
    fetchAccounts()
  }

  async function handleSync(accountId: string) {
    setSyncing(accountId)
    const res = await fetch('/api/banking/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    })
    const data = await res.json().catch(() => ({}))
    setSyncing(null)
    if (data.imported !== undefined) {
      setSuccessMsg(`Synced! ${data.imported} new transactions imported.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      fetchAccounts()
    } else if (data.error) {
      setSuccessMsg(`Sync failed: ${data.error}`)
      setTimeout(() => setSuccessMsg(null), 5000)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-32" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-44 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {successMsg && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
          successMsg.includes('failed') || successMsg.includes('error')
            ? 'bg-red-50 text-red-700'
            : 'bg-emerald-50 text-emerald-700'
        }`}>
          <CheckCircle size={16} />
          {successMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight font-normal text-slate-900">Accounts</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your bank accounts</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={15} />
          Add Account
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="text-brand-500" size={28} />
          </div>
          <h2 className="font-serif text-slate-900 font-medium text-xl mb-2">Add your first account</h2>
          <p className="text-slate-500 text-sm mb-6">Track balances, import statements, and analyze spending across all your banks.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary mx-auto flex items-center gap-2">
            <Plus size={15} />
            Add Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(account => {
            const recentIncome = account.transactions
              .filter(t => t.type === 'INCOME')
              .reduce((s, t) => s + t.amount, 0)
            const recentExpenses = account.transactions
              .filter(t => t.type === 'EXPENSE')
              .reduce((s, t) => s + Math.abs(t.amount), 0)
            const isConnected = !!account.bankConnection

            return (
              <div key={account.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: account.color }}
                    >
                      {account.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-slate-900 font-semibold text-sm">{account.name}</p>
                        {bankSyncEnabled && isConnected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Auto-sync active" />
                        )}
                      </div>
                      <p className="text-slate-400 text-xs">{account.bankName}</p>
                    </div>
                  </div>
                  <Link
                    href={`/accounts/${account.id}`}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                  >
                    <ArrowUpRight size={14} />
                  </Link>
                </div>

                <div className="mb-4">
                  <p className="text-slate-400 text-xs mb-1">Current balance</p>
                  <p className={`font-serif text-[2rem] leading-tight tabular-nums break-words ${account.balance < 0 ? 'text-red-500' : 'text-brand-500'}`}>
                    {formatCurrency(account.balance, account.currency)}
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {account.currency}
                    {account.balance < 0 && <span className="ml-1.5 text-red-400 font-medium">· Amount owed</span>}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-rule">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <TrendingUp size={13} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Income</p>
                      <p className="text-slate-700 text-sm font-semibold">{formatCurrency(recentIncome, account.currency)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                      <TrendingDown size={13} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs">Expenses</p>
                      <p className="text-slate-700 text-sm font-semibold">{formatCurrency(recentExpenses, account.currency)}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-rule space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-slate-400 text-xs">{account._count.transactions} transactions</p>
                    <button
                      onClick={() => handleDelete(account.id)}
                      className="text-slate-500 hover:text-red-500 text-xs underline underline-offset-2 transition-colors"
                    >
                      Delete
                    </button>
                  </div>

                  {!bankSyncEnabled ? null : isConnected ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSync(account.id)}
                        disabled={syncing === account.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                      >
                        <RefreshCw size={11} className={syncing === account.id ? 'animate-spin' : ''} />
                        {syncing === account.id ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Link2Off size={11} />
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(account.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                    >
                      <Link2 size={11} />
                      Connect Bank
                    </button>
                  )}

                  {bankSyncEnabled && isConnected && account.bankConnection?.lastSyncedAt && (
                    <p className="text-slate-400 text-xs text-center">
                      Last synced {new Date(account.bankConnection.lastSyncedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Bank Account" size="md">
        <AccountForm
          onSuccess={() => { setShowAdd(false); fetchAccounts() }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </div>
  )
}
