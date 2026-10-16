'use client'

import { useState } from 'react'
import { CURRENCIES, ACCOUNT_COLORS } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AccountFormProps {
  onSuccess: () => void
  onCancel: () => void
  initial?: {
    id?: string
    name?: string
    bankName?: string
    currency?: string
    balance?: number
    color?: string
  }
}

export default function AccountForm({ onSuccess, onCancel, initial }: AccountFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: initial?.name || '',
    bankName: initial?.bankName || '',
    currency: initial?.currency || 'USD',
    balance: initial?.balance?.toString() || '0',
    color: initial?.color || ACCOUNT_COLORS[0],
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = initial?.id ? `/api/accounts/${initial.id}` : '/api/accounts'
      const method = initial?.id ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          balance: parseFloat(form.balance) || 0,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save account')
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
      <div>
        <label className="label">Account name</label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Main Checking"
          className="input"
          required
        />
      </div>

      <div>
        <label className="label">Bank name</label>
        <input
          type="text"
          value={form.bankName}
          onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
          placeholder="e.g. Deutsche Bank, Millennium BCP"
          className="input"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Currency</label>
          <select
            value={form.currency}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            className="input"
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Current balance</label>
          <input
            type="number"
            value={form.balance}
            onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
            step="0.01"
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label">Color</label>
        <div className="flex gap-2 flex-wrap">
          {ACCOUNT_COLORS.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setForm(f => ({ ...f, color }))}
              className={cn(
                'w-8 h-8 rounded-full transition-all',
                form.color === color && 'ring-2 ring-offset-2 ring-slate-400 scale-110'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: form.color }}>
            {form.name.slice(0, 2).toUpperCase() || 'AC'}
          </div>
          <div>
            <p className="text-slate-800 font-medium text-sm">{form.name || 'Account name'}</p>
            <p className="text-slate-400 text-xs">{form.bankName || 'Bank name'} · {form.currency}</p>
          </div>
        </div>
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
          {loading ? 'Saving...' : initial?.id ? 'Save Changes' : 'Add Account'}
        </button>
      </div>
    </form>
  )
}
