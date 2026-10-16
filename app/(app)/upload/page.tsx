'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, AlertCircle } from 'lucide-react'
import StatementUploader from '@/components/upload/StatementUploader'

export default function UploadPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.json())
      .then(data => { setAccounts(data); setLoading(false) })
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded-lg w-48" />
        <div className="h-96 bg-slate-200 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import Bank Statement</h1>
        <p className="text-slate-500 text-sm mt-0.5">Upload a PDF statement to automatically import transactions</p>
      </div>

      {accounts.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-amber-500" size={24} />
          </div>
          <h2 className="text-slate-800 font-semibold mb-2">No accounts yet</h2>
          <p className="text-slate-500 text-sm mb-4">You need to add a bank account before importing statements.</p>
          <button
            onClick={() => router.push('/accounts')}
            className="btn-primary mx-auto flex items-center gap-2"
          >
            Go to Accounts
          </button>
        </div>
      ) : (
        <div className="card p-6">
          <StatementUploader
            accounts={accounts}
            onSuccess={() => router.push('/transactions')}
          />
        </div>
      )}

      {/* How it works */}
      <div className="card p-6">
        <h3 className="text-slate-800 font-semibold text-sm mb-4">How it works</h3>
        <div className="space-y-4">
          {[
            { step: '1', title: 'Export from your bank', desc: 'Download a PDF statement from your bank\'s online portal. Most banks support this.' },
            { step: '2', title: 'Select account & upload', desc: 'Choose which account the statement belongs to, then drag & drop or browse for the file.' },
            { step: '3', title: 'Auto-import & categorize', desc: 'FinTrack parses the transactions, auto-categorizes them, and skips any duplicates.' },
          ].map(item => (
            <div key={item.step} className="flex gap-4">
              <div className="w-8 h-8 bg-brand-50 border border-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-brand-600 text-sm font-bold">{item.step}</span>
              </div>
              <div>
                <p className="text-slate-800 font-medium text-sm">{item.title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-slate-500 text-xs">
            <strong className="text-slate-700">Supported languages:</strong> English, Portuguese, German — and any bank statement with standard date/amount patterns.
          </p>
        </div>
      </div>
    </div>
  )
}
