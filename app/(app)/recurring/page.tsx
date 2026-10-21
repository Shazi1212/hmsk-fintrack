'use client'

import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Zap, Pencil, Trash2, Pause, Play, Calendar, ChevronDown } from 'lucide-react'
import { formatCurrency, formatDate, cn, CURRENCIES } from '@/lib/utils'
import Modal from '@/components/ui/Modal'

const FREQ_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

export default function RecurringPage() {
  const [items, setItems] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [logLoading, setLogLoading] = useState<string | null>(null)

  async function load() {
    const [recRes, accRes, catRes] = await Promise.all([
      fetch('/api/recurring'),
      fetch('/api/accounts'),
      fetch('/api/categories'),
    ])
    if (recRes.ok) setItems(await recRes.json())
    if (accRes.ok) setAccounts(await accRes.json())
    if (catRes.ok) setCategories(await catRes.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function logNow(id: string) {
    setLogLoading(id)
    await fetch(`/api/recurring/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applyNow: true }),
    })
    setLogLoading(null)
    load()
  }

  async function toggleActive(item: any) {
    await fetch(`/api/recurring/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    })
    load()
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this recurring transaction?')) return
    await fetch(`/api/recurring/${id}`, { method: 'DELETE' })
    load()
  }

  const active = items.filter(i => i.active)
  const paused = items.filter(i => !i.active)

  // Upcoming in next 7 days
  const now = new Date()
  const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcoming = active.filter(i => new Date(i.nextDate) <= in7)

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-100 rounded-xl w-64" />
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[2rem] leading-tight font-normal text-slate-900">Recurring</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage subscriptions and regular payments</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add recurring
        </button>
      </div>

      {/* Upcoming alert */}
      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={15} className="text-amber-600" />
            <p className="text-amber-800 font-semibold text-sm">{upcoming.length} due in the next 7 days</p>
          </div>
          <div className="space-y-2">
            {upcoming.map(item => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{item.category?.icon ?? '📦'}</span>
                  <span className="text-amber-800 text-sm">{item.description}</span>
                  <span className="text-amber-600 text-xs">{formatDate(item.nextDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-semibold', item.type === 'INCOME' ? 'text-emerald-600' : 'text-red-500')}>
                    {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount, item.account?.currency)}
                  </span>
                  <button
                    onClick={() => logNow(item.id)}
                    disabled={logLoading === item.id}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Zap size={11} />
                    {logLoading === item.id ? 'Logging…' : 'Log now'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <RefreshCw size={24} className="text-slate-400" />
          </div>
          <h3 className="font-serif text-slate-900 font-medium text-lg mb-1">No recurring transactions yet</h3>
          <p className="text-slate-400 text-sm mb-4">Set up subscriptions, salaries, rent — anything that repeats.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
            <Plus size={14} className="inline mr-1.5" />
            Add your first recurring
          </button>
        </div>
      )}

      {/* Active list */}
      {active.length > 0 && (
        <div className="card p-5">
          <h3 className="font-serif text-lg font-medium text-slate-900 mb-4">Active ({active.length})</h3>
          <div className="space-y-3">
            {active.map(item => (
              <RecurringRow
                key={item.id}
                item={item}
                onLogNow={logNow}
                onToggle={toggleActive}
                onDelete={deleteItem}
                logLoading={logLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paused list */}
      {paused.length > 0 && (
        <div className="card p-5 opacity-70">
          <h3 className="font-serif text-lg font-medium text-slate-500 mb-4">Paused ({paused.length})</h3>
          <div className="space-y-3">
            {paused.map(item => (
              <RecurringRow
                key={item.id}
                item={item}
                onLogNow={logNow}
                onToggle={toggleActive}
                onDelete={deleteItem}
                logLoading={logLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New recurring transaction" size="md">
        <RecurringForm
          accounts={accounts}
          categories={categories}
          onSuccess={() => { setShowAdd(false); load() }}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
    </div>
  )
}

function RecurringRow({
  item, onLogNow, onToggle, onDelete, logLoading,
}: {
  item: any
  onLogNow: (id: string) => void
  onToggle: (item: any) => void
  onDelete: (id: string) => void
  logLoading: string | null
}) {
  const isDue = new Date(item.nextDate) <= new Date()
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-xl', isDue && item.active ? 'bg-amber-50' : 'hover:bg-slate-50')}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ backgroundColor: (item.category?.color ?? '#7B8592') + '20' }}>
        {item.category?.icon ?? '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-800 font-medium text-sm truncate">{item.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-400">{FREQ_LABELS[item.frequency]}</span>
          <span className="text-slate-300">·</span>
          <span className={cn('text-xs', isDue && item.active ? 'text-amber-600 font-medium' : 'text-slate-400')}>
            {isDue && item.active ? 'Due: ' : 'Next: '}{formatDate(item.nextDate)}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-400">{item.account?.name}</span>
        </div>
      </div>
      <span className={cn('text-sm font-semibold flex-shrink-0', item.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-700')}>
        {item.type === 'INCOME' ? '+' : '-'}{formatCurrency(item.amount, item.account?.currency)}
      </span>
      <div className="flex gap-1 flex-shrink-0">
        {isDue && item.active && (
          <button
            onClick={() => onLogNow(item.id)}
            disabled={logLoading === item.id}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
          >
            <Zap size={11} />
            {logLoading === item.id ? '…' : 'Log'}
          </button>
        )}
        <button
          onClick={() => onToggle(item)}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title={item.active ? 'Pause' : 'Resume'}
        >
          {item.active ? <Pause size={13} /> : <Play size={13} />}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function RecurringForm({ accounts, categories, onSuccess, onCancel }: {
  accounts: any[]
  categories: any[]
  onSuccess: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    accountId: accounts[0]?.id ?? '',
    categoryId: '',
    description: '',
    amount: '',
    type: 'EXPENSE',
    frequency: 'monthly',
    nextDate: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim() || !form.amount || !form.accountId) {
      setError('Please fill all required fields'); return
    }
    setSaving(true)
    const res = await fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        amount: parseFloat(form.amount),
        categoryId: form.categoryId || null,
      }),
    })
    setSaving(false)
    if (res.ok) onSuccess()
    else { const d = await res.json(); setError(d.error ?? 'Failed to save') }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-500 block mb-1">Description *</label>
          <input className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Netflix, Rent, Salary" />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Amount *</label>
          <input type="number" min="0.01" step="0.01" className="input" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" />
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Type</label>
          <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Account *</label>
          <select className="input" value={form.accountId} onChange={e => set('accountId', e.target.value)}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Frequency</label>
          <select className="input" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Category</label>
          <select className="input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
            <option value="">Uncategorized</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon ?? '📦'} {c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-1">Next date</label>
          <input type="date" className="input" value={form.nextDate} onChange={e => set('nextDate', e.target.value)} />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1 text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">
          {saving ? 'Creating…' : 'Create recurring'}
        </button>
      </div>
    </form>
  )
}
