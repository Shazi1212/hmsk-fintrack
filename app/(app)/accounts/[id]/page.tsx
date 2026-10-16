'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ArrowLeft, Plus, Edit2, Upload, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import TransactionTable from '@/components/transactions/TransactionTable'
import Modal from '@/components/ui/Modal'
import TransactionForm from '@/components/transactions/TransactionForm'
import AccountForm from '@/components/accounts/AccountForm'

interface AccountDetail {
  id: string
  name: string
  bankName: string
  currency: string
  balance: number
  color: string
  transactions: Array<any>
  statements: Array<{ id: string; fileName: string; status: string; parsedCount: number; createdAt: string }>
}

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [account, setAccount] = useState<AccountDetail | null>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [allAccounts, setAllAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddTx, setShowAddTx] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [activeMonth, setActiveMonth] = useState<string>('')

  async function fetchData() {
    const [accRes, catRes, accsRes] = await Promise.all([
      fetch(`/api/accounts/${id}`),
      fetch('/api/categories'),
      fetch('/api/accounts'),
    ])
    if (!accRes.ok) { router.push('/accounts'); return }
    setAccount(await accRes.json())
    if (catRes.ok) setCategories(await catRes.json())
    if (accsRes.ok) setAllAccounts(await accsRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  async function handleDeleteTx(txId: string) {
    if (!confirm('Delete this transaction?')) return
    await fetch(`/api/transactions/${txId}`, { method: 'DELETE' })
    fetchData()
  }

  if (loading || !account) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="h-32 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    )
  }

  // Build monthly category breakdown
  const categoryTotals: Record<string, { total: number; color: string; icon?: string }> = {}
  for (const tx of account.transactions) {
    if (tx.type !== 'EXPENSE') continue
    const name = tx.category?.name || 'Uncategorized'
    if (!categoryTotals[name]) {
      categoryTotals[name] = { total: 0, color: tx.category?.color || '#94a3b8', icon: tx.category?.icon }
    }
    categoryTotals[name].total += Math.abs(tx.amount)
  }
  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 8)

  const barData = sortedCategories.map(([name, v]) => ({
    name: name.length > 12 ? name.slice(0, 12) + '…' : name,
    amount: v.total,
    fill: v.color,
  }))

  // Month filter options
  const months = Array.from(new Set(
    account.transactions.map(tx => tx.date.slice(0, 7))
  )).sort().reverse().slice(0, 12)

  const filteredTx = activeMonth
    ? account.transactions.filter(tx => tx.date.slice(0, 7) === activeMonth)
    : account.transactions

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/accounts" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: account.color }}>
              {account.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{account.name}</h1>
              <p className="text-slate-500 text-sm">{account.bankName} · {account.currency}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Edit2 size={14} /> Edit
          </button>
          <Link href="/upload" className="btn-secondary flex items-center gap-2 text-sm">
            <Upload size={14} /> Import
          </Link>
          <button onClick={() => setShowAddTx(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={14} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Balance card */}
      <div className="card p-6" style={{ background: `linear-gradient(135deg, ${account.color}15, ${account.color}05)`, borderColor: account.color + '30' }}>
        <p className="text-slate-500 text-sm mb-1">Current balance</p>
        <p className={`text-4xl font-bold ${account.balance < 0 ? 'text-red-500' : 'text-slate-900'}`}>
          {formatCurrency(account.balance, account.currency)}
        </p>
        {account.balance < 0 && (
          <p className="text-red-400 text-xs font-medium mt-0.5">Amount owed</p>
        )}
        <p className="text-slate-400 text-sm mt-1">{account.transactions.length} total transactions</p>
      </div>

      {/* Category breakdown chart */}
      {sortedCategories.length > 0 && (
        <div className="card p-5">
          <h2 className="text-slate-800 font-semibold text-sm mb-4">Spending by category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => formatCurrency(v, account.currency)} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                formatter={(v: number) => [formatCurrency(v, account.currency), 'Spent']}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transactions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-800 font-semibold text-sm">Transactions</h2>
          {months.length > 0 && (
            <select
              value={activeMonth}
              onChange={e => setActiveMonth(e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">All time</option>
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
        <TransactionTable
          transactions={filteredTx}
          currency={account.currency}
          onDelete={handleDeleteTx}
        />
      </div>

      {/* Statement history */}
      {account.statements.length > 0 && (
        <div className="card p-5">
          <h2 className="text-slate-800 font-semibold text-sm mb-4">Import history</h2>
          <div className="space-y-2">
            {account.statements.map(stmt => (
              <div key={stmt.id} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                  <FileText size={14} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-700 text-sm truncate">{stmt.fileName}</p>
                  <p className="text-slate-400 text-xs">{formatDate(stmt.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    stmt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                    stmt.status === 'FAILED' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {stmt.status === 'COMPLETED' ? `✓ ${stmt.parsedCount} imported` : stmt.status.toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal open={showAddTx} onClose={() => setShowAddTx(false)} title="Add Transaction" size="md">
        <TransactionForm
          accounts={allAccounts}
          categories={categories}
          defaultAccountId={account.id}
          onSuccess={() => { setShowAddTx(false); fetchData() }}
          onCancel={() => setShowAddTx(false)}
        />
      </Modal>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Account" size="md">
        <AccountForm
          initial={account}
          onSuccess={() => { setShowEdit(false); fetchData() }}
          onCancel={() => setShowEdit(false)}
        />
      </Modal>
    </div>
  )
}

