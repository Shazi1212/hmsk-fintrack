'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

interface Account {
  id: string
  name: string
  currency: string
  color: string
}

interface Category {
  id: string
  name: string
  color: string
  icon?: string
}

interface TransactionFormProps {
  accounts: Account[]
  categories: Category[]
  defaultAccountId?: string
  defaultType?: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  onSuccess: () => void
  onCancel: () => void
}

export default function TransactionForm({
  accounts,
  categories,
  defaultAccountId,
  defaultType = 'EXPENSE',
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    accountId: defaultAccountId || accounts[0]?.id || '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    amount: '',
    type: defaultType as 'INCOME' | 'EXPENSE' | 'TRANSFER',
    categoryId: '',
    transferToId: '',
    notes: '',
  })

  const selectedAccount = accounts.find(a => a.id === form.accountId)

  const typeColors = {
    EXPENSE: 'bg-red-50 text-red-700 border-red-200',
    INCOME: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    TRANSFER: 'bg-blue-50 text-blue-700 border-blue-200',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.accountId || !form.description || !form.amount) {
      setError('Please fill in all required fields')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          categoryId: form.categoryId || null,
          transferToId: form.type === 'TRANSFER' ? form.transferToId || null : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create transaction')
        return
      }

      onSuccess()
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type selector */}
      <div>
        <label className="label">Transaction type</label>
        <div className="grid grid-cols-3 gap-2">
          {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setForm(f => ({ ...f, type }))}
              className={`py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                form.type === type
                  ? typeColors[type]
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {type.charAt(0) + type.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Account + Date row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Account</label>
          <select
            value={form.accountId}
            onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
            className="input"
            required
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="input"
            required
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label">Description</label>
        <input
          type="text"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="e.g. Grocery shopping at REWE"
          className="input"
          required
        />
      </div>

      {/* Amount */}
      <div>
        <label className="label">
          Amount {selectedAccount && <span className="text-slate-400 font-normal">({selectedAccount.currency})</span>}
        </label>
        <input
          type="number"
          value={form.amount}
          onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          placeholder="0.00"
          step="0.01"
          min="0"
          className="input"
          required
        />
      </div>

      {/* Transfer destination */}
      {form.type === 'TRANSFER' && (
        <div>
          <label className="label">Transfer to account</label>
          <select
            value={form.transferToId}
            onChange={e => setForm(f => ({ ...f, transferToId: e.target.value }))}
            className="input"
          >
            <option value="">— Select destination —</option>
            {accounts.filter(a => a.id !== form.accountId).map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Category */}
      {form.type !== 'TRANSFER' && (
        <div>
          <label className="label">Category</label>
          <select
            value={form.categoryId}
            onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
            className="input"
          >
            <option value="">— Auto-detect —</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="label">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
        <input
          type="text"
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Any extra details..."
          className="input"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? 'Saving...' : 'Add Transaction'}
        </button>
      </div>
    </form>
  )
}
