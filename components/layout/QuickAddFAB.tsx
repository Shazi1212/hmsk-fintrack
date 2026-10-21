'use client'

import { useState, useEffect } from 'react'
import { Plus, X, TrendingDown, TrendingUp, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import TransactionForm from '@/components/transactions/TransactionForm'

export default function QuickAddFAB() {
  const [open, setOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [defaultType, setDefaultType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE')
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])

  async function loadData() {
    const [accRes, catRes] = await Promise.all([
      fetch('/api/accounts'),
      fetch('/api/categories'),
    ])
    if (accRes.ok) setAccounts(await accRes.json())
    if (catRes.ok) setCategories(await catRes.json())
  }

  useEffect(() => {
    if (showModal) loadData()
  }, [showModal])

  function openWithType(type: 'EXPENSE' | 'INCOME' | 'TRANSFER') {
    setDefaultType(type)
    setOpen(false)
    setShowModal(true)
  }

  const actions = [
    { label: 'Expense', icon: TrendingDown, type: 'EXPENSE' as const, color: 'bg-red-500 hover:bg-red-600' },
    { label: 'Income', icon: TrendingUp, type: 'INCOME' as const, color: 'bg-emerald-500 hover:bg-emerald-600' },
    { label: 'Transfer', icon: ArrowLeftRight, type: 'TRANSFER' as const, color: 'bg-blue-500 hover:bg-blue-600' },
  ]

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      {/* FAB group */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Sub-actions */}
        {open && (
          <div className="flex flex-col items-end gap-2 animate-fade-in">
            {actions.map(action => {
              const Icon = action.icon
              return (
                <button
                  key={action.type}
                  onClick={() => openWithType(action.type)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-[3px] text-white text-sm font-semibold shadow-soft transition-colors active:scale-[.97]',
                    action.color
                  )}
                >
                  <Icon size={15} />
                  {action.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            'w-14 h-14 rounded-md shadow-[0_12px_30px_-12px_rgba(21,27,36,.6)] text-white flex items-center justify-center transition-all duration-200 active:scale-[.97]',
            open ? 'bg-slate-900 rotate-45' : 'bg-brand-500 hover:bg-brand-600'
          )}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Transaction modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Quick add transaction"
        size="md"
      >
        <TransactionForm
          accounts={accounts}
          categories={categories}
          defaultType={defaultType}
          onSuccess={() => setShowModal(false)}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </>
  )
}
