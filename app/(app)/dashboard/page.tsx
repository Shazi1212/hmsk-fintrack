'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Plus, ChevronRight, Upload, Loader2, Target } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import TransactionTable from '@/components/transactions/TransactionTable'
import Modal from '@/components/ui/Modal'
import TransactionForm from '@/components/transactions/TransactionForm'

interface Account {
  id: string
  name: string
  balance: number
  currency: string
  color: string
  bankName: string
}

interface DashboardData {
  accounts: Account[]
  monthlyIncomeByCurrency: Record<string, number>
  monthlyExpensesByCurrency: Record<string, number>
  recentTransactions: any[]
  monthlyData: Array<{ month: string; income: number; expenses: number }>
  categoryBreakdown: Array<{ name: string; total: number; color: string; icon: string; count: number }>
}

const CURRENCY_ORDER = ['EUR', 'GBP', 'USD', 'PKR']


export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(false)
  const [showAddTx, setShowAddTx] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [budgets, setBudgets] = useState<any[]>([])

  // Selected account IDs — null means "all"
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Build API URL with optional accountIds filter
  function buildUrl(ids: Set<string> | null, allIds: string[]) {
    if (!ids || ids.size === allIds.length) return '/api/dashboard'
    return `/api/dashboard?accountIds=${[...ids].join(',')}`
  }

  // Initial load
  async function fetchAll() {
    const [dashRes, catRes, budgetRes] = await Promise.all([
      fetch('/api/dashboard'),
      fetch('/api/categories'),
      fetch('/api/budgets'),
    ])
    if (dashRes.ok) {
      const d = await dashRes.json()
      setData(d)
      setSelectedIds(new Set(d.accounts.map((a: Account) => a.id)))
    }
    if (catRes.ok) setCategories(await catRes.json())
    if (budgetRes.ok) { const b = await budgetRes.json(); setBudgets(b.budgets ?? []) }
    setLoading(false)
  }

  // Re-fetch charts/categories when selection changes (debounced)
  const fetchCharts = useCallback((ids: Set<string>, allIds: string[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setChartsLoading(true)
      const url = buildUrl(ids, allIds)
      const res = await fetch(url)
      if (res.ok) {
        const d = await res.json()
        setData(prev => prev ? {
          ...prev,
          monthlyData: d.monthlyData,
          categoryBreakdown: d.categoryBreakdown,
          monthlyIncomeByCurrency: d.monthlyIncomeByCurrency,
          monthlyExpensesByCurrency: d.monthlyExpensesByCurrency,
          recentTransactions: d.recentTransactions,
        } : d)
      }
      setChartsLoading(false)
    }, 400)
  }, [])

  useEffect(() => { fetchAll() }, [])

  function toggleAccount(id: string) {
    if (!data) return
    const allIds = data.accounts.map(a => a.id)
    setSelectedIds(prev => {
      const next = new Set(prev ?? allIds)
      if (next.has(id)) {
        if (next.size === 1) return prev // keep at least one selected
        next.delete(id)
      } else {
        next.add(id)
      }
      fetchCharts(next, allIds)
      return next
    })
  }

  function toggleAll() {
    if (!data) return
    const allIds = data.accounts.map(a => a.id)
    const allSelected = selectedIds?.size === allIds.length
    const next = allSelected ? new Set([allIds[0]]) : new Set(allIds)
    setSelectedIds(next)
    fetchCharts(next, allIds)
  }

  async function handleDeleteTx(id: string) {
    if (!confirm('Delete this transaction?')) return
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    fetchAll()
  }

  if (loading || !data || !selectedIds) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-200 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    )
  }

  // Onboarding empty state
  if (data.accounts.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight font-normal text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Welcome to FinTrack</p>
        </div>
        <div className="card p-10 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Wallet size={28} className="text-brand-500" />
          </div>
          <h2 className="font-serif text-2xl font-normal text-slate-900 mb-2">Welcome to FinTrack!</h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Your personal finance manager is ready. Start by adding your bank accounts —
            then import statements, track spending, and set budgets.
          </p>
          <div className="space-y-2">
            <Link href="/accounts" className="btn-primary flex items-center justify-center gap-2 w-full">
              <Plus size={16} /> Add your first account
            </Link>
            <Link href="/upload" className="btn-secondary flex items-center justify-center gap-2 w-full">
              <Upload size={15} /> Import bank statement
            </Link>
          </div>
          <div className="mt-6 pt-6 border-t border-rule grid grid-cols-3 gap-4 text-center">
            {[
              { icon: '🏦', label: 'Multiple banks', desc: 'All in one place' },
              { icon: '📊', label: 'Auto-categorize', desc: 'Smart detection' },
              { icon: '🎯', label: 'Set budgets', desc: 'Stay on track' },
            ].map(f => (
              <div key={f.label}>
                <div className="text-2xl mb-1">{f.icon}</div>
                <p className="text-xs font-medium text-slate-700">{f.label}</p>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { accounts, recentTransactions, monthlyData, categoryBreakdown,
          monthlyIncomeByCurrency, monthlyExpensesByCurrency } = data

  // ── Client-side derived values from selection ──────────────────────────
  const selectedAccounts = accounts.filter(a => selectedIds.has(a.id))
  const allIds = accounts.map(a => a.id)
  const allSelected = selectedIds.size === allIds.length

  // Balance per currency — instant client-side calculation
  const balanceByCurrency: Record<string, number> = {}
  for (const a of selectedAccounts) {
    balanceByCurrency[a.currency] = (balanceByCurrency[a.currency] || 0) + a.balance
  }

  const activeCurrencies = CURRENCY_ORDER.filter(c => balanceByCurrency[c] !== undefined)

  // Recent transactions — filter client-side instantly
  const filteredTx = recentTransactions.filter(
    tx => selectedIds.has(tx.account?.id ?? tx.accountId)
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight font-normal text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Your financial overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/upload" className="btn-secondary flex items-center gap-2 text-sm">
            <Upload size={15} /> Import
          </Link>
          <button onClick={() => setShowAddTx(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Balance cards — per currency, from selected accounts */}
      <div className={`grid gap-4 ${
        activeCurrencies.length === 1 ? 'grid-cols-1 sm:grid-cols-2' :
        activeCurrencies.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
        activeCurrencies.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      }`}>
        {activeCurrencies.map(currency => {
          const balance = balanceByCurrency[currency] ?? 0
          const income = monthlyIncomeByCurrency[currency] ?? 0
          const expenses = monthlyExpensesByCurrency[currency] ?? 0
          const net = income - expenses
          const hasActivity = income > 0 || expenses > 0
          return (
            <div key={currency} className="card p-5 min-w-0">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 bg-brand-50 text-brand-500 rounded-md flex items-center justify-center">
                  <Wallet size={18} />
                </div>
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider border border-rule-strong px-2 py-0.5 rounded-full">
                  {currency}
                </span>
              </div>
              <p className="eyebrow">Balance</p>
              <p className="font-serif text-[2rem] text-brand-500 mt-1 leading-tight tabular-nums break-words">{formatCurrency(balance, currency)}</p>
              {hasActivity && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-rule">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-slate-500" />
                    <span className="text-slate-500 text-xs tabular-nums">{formatCurrency(income, currency)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingDown size={12} className="text-slate-500" />
                    <span className="text-slate-500 text-xs tabular-nums">{formatCurrency(expenses, currency)}</span>
                  </div>
                  <span className={`ml-auto text-xs font-semibold tabular-nums ${net >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                    {net >= 0 ? '+' : ''}{formatCurrency(net, currency)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Monthly chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="font-serif text-slate-900 font-medium text-lg">Income vs Expenses — 6 months</h2>
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><i className="w-4 h-0.5 bg-brand-500" />Income</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><i className="w-4 border-t-2 border-dashed border-[#6E7F95]" />Expenses</span>
              {chartsLoading && <Loader2 size={13} className="text-slate-400 animate-spin" />}
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">EUR accounts</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E4C8A" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#1E4C8A" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6E7F95" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#6E7F95" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#CBD2D9" />
              <XAxis dataKey="month" tick={{ fill: '#4A5562', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4A5562', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#F8F9FA', border: '1px solid #7B8592', borderRadius: '3px', boxShadow: '0 12px 30px -16px rgba(21,27,36,.4)', color: '#151B24' }}
                formatter={(v: number) => [formatCurrency(v, 'EUR'), '']}
              />
              <Area type="monotone" dataKey="income" stroke="#1E4C8A" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
              <Area type="monotone" dataKey="expenses" stroke="#6E7F95" strokeWidth={2} strokeDasharray="5 3" fill="url(#expenseGrad)" name="Expenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-slate-900 font-medium text-lg">Expenses by category</h2>
            {chartsLoading && <Loader2 size={13} className="text-slate-400 animate-spin" />}
          </div>
          {categoryBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="total" stroke="#F8F9FA" strokeWidth={2}>
                    {categoryBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {categoryBreakdown.slice(0, 5).map(cat => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{cat.icon} {cat.name}</span>
                    <span className="text-xs font-semibold text-slate-800">{formatCurrency(cat.total, 'EUR')}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">No expenses this month</div>
          )}
        </div>
      </div>

      {/* Accounts (with toggles) + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Accounts panel */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-slate-900 font-medium text-lg">Accounts</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleAll}
                className="text-xs text-brand-500 hover:text-brand-600 transition-colors font-medium"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
              <Link href="/accounts" className="text-brand-500 text-xs hover:text-brand-600 flex items-center gap-1">
                Manage <ChevronRight size={12} />
              </Link>
            </div>
          </div>

          <div className="space-y-0.5">
            {accounts.map(account => {
              const isSelected = selectedIds.has(account.id)
              return (
                <div
                  key={account.id}
                  onClick={() => toggleAccount(account.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-[3px] cursor-pointer transition-colors select-none ${
                    'hover:bg-slate-50'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all border-2 ${
                    isSelected ? 'bg-brand-500 border-brand-500' : 'border-rule-strong bg-card'
                  }`}>
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Account colour dot */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${isSelected ? '' : 'grayscale opacity-50'}`}
                    style={{ backgroundColor: account.color }}
                  >
                    {account.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-sm font-medium truncate">{account.name}</p>
                    <p className="text-slate-400 text-xs truncate">{account.bankName}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${account.balance < 0 ? 'text-red-500' : 'text-slate-900'}`}>
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                    <p className="text-slate-400 text-xs">{account.currency}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selection summary */}
          {!allSelected && (
            <div className="mt-3 pt-3 border-t border-rule text-xs text-slate-400 text-center">
              {selectedIds.size} of {accounts.length} accounts shown
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-slate-900 font-medium text-lg">Recent transactions</h2>
            <Link href="/transactions" className="text-brand-500 text-xs hover:text-brand-600 flex items-center gap-1">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <TransactionTable transactions={filteredTx} showAccount onDelete={handleDeleteTx} />
        </div>
      </div>

      {/* Budget progress bars */}
      {budgets.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-brand-500" />
              <h2 className="font-serif text-slate-900 font-medium text-lg">Monthly budgets</h2>
            </div>
            <Link href="/settings" className="text-brand-500 text-xs hover:text-brand-600 flex items-center gap-1">
              Manage <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((b: any) => {
              const pct = Math.min(b.percentUsed, 100)
              const over = b.spent > b.amount
              return (
                <div key={b.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{b.category?.icon ?? '📦'}</span>
                      <span className="text-sm font-medium text-slate-700">{b.category?.name ?? 'Unknown'}</span>
                    </div>
                    <span className={cn('text-xs font-semibold', over ? 'text-red-500' : 'text-slate-500')}>
                      {formatCurrency(b.spent, b.currency)} / {formatCurrency(b.amount, b.currency)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 border border-rule rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', over ? 'bg-red-400' : pct > 80 ? 'bg-amber-400' : 'bg-brand-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={cn('text-xs', over ? 'text-red-500 font-medium' : 'text-slate-400')}>
                    {over ? `${formatCurrency(Math.abs(b.remaining), b.currency)} over budget` : `${formatCurrency(b.remaining, b.currency)} remaining`}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Modal open={showAddTx} onClose={() => setShowAddTx(false)} title="Add Transaction" size="md">
        <TransactionForm
          accounts={accounts}
          categories={categories}
          onSuccess={() => { setShowAddTx(false); fetchAll() }}
          onCancel={() => setShowAddTx(false)}
        />
      </Modal>
    </div>
  )
}
