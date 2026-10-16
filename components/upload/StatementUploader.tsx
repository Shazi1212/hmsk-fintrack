'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Account {
  id: string
  name: string
  bankName: string
  currency: string
  color: string
}

interface UploadResult {
  success: boolean
  imported: number
  skipped: number
  total: number
  errors?: string[]
}

interface StatementUploaderProps {
  accounts: Account[]
  onSuccess: () => void
}

export default function StatementUploader({ accounts, onSuccess }: StatementUploaderProps) {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setResult(null)
      setError('')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
  })

  async function handleUpload() {
    if (!file || !selectedAccountId) return

    setUploading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('accountId', selectedAccountId)

      const res = await fetch('/api/parse-statement', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed')
        return
      }

      setResult(data)
      if (data.imported > 0) {
        onSuccess()
      }
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  return (
    <div className="space-y-6">
      {/* Account selector */}
      <div>
        <label className="label text-base font-semibold text-slate-800">Select account</label>
        <p className="text-slate-500 text-sm mb-3">Which account is this statement for?</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {accounts.map(account => (
            <button
              key={account.id}
              type="button"
              onClick={() => setSelectedAccountId(account.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all',
                selectedAccountId === account.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: account.color }}
              >
                {account.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-slate-800 font-medium text-sm truncate">{account.name}</p>
                <p className="text-slate-400 text-xs">{account.bankName} · {account.currency}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div>
        <label className="label text-base font-semibold text-slate-800">Upload PDF statement</label>
        <p className="text-slate-500 text-sm mb-3">
          Supports statements in English, German, Portuguese and most standard bank formats.
        </p>

        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
            isDragActive
              ? 'border-brand-500 bg-brand-50'
              : file
              ? 'border-brand-400 bg-brand-50/50'
              : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
          )}
        >
          <input {...getInputProps()} />

          {file ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                <FileText className="text-brand-600" size={20} />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-800 text-sm">{file.name}</p>
                <p className="text-slate-400 text-xs">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Upload className="text-slate-400" size={22} />
              </div>
              <p className="text-slate-600 font-medium text-sm">
                {isDragActive ? 'Drop your PDF here' : 'Drag & drop your bank statement'}
              </p>
              <p className="text-slate-400 text-xs mt-1">or click to browse · PDF only · Max 20MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
        <div className="flex gap-2">
          <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
          <div>
            <p className="text-amber-800 text-sm font-medium">For best results</p>
            <ul className="text-amber-700 text-xs mt-1 space-y-0.5">
              <li>• Use text-based PDFs (not scanned images)</li>
              <li>• Each bank has a slightly different format — duplicates are auto-skipped</li>
              <li>• Transactions are auto-categorized based on merchant names</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex gap-2 bg-red-50 border border-red-100 rounded-xl p-4">
          <XCircle className="text-red-500 flex-shrink-0" size={18} />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <div className="flex gap-2">
            <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={18} />
            <div>
              <p className="text-emerald-800 font-semibold text-sm">Import complete!</p>
              <p className="text-emerald-700 text-xs mt-1">
                {result.imported} transactions imported · {result.skipped} duplicates skipped
              </p>
              {result.errors && result.errors.length > 0 && (
                <p className="text-amber-600 text-xs mt-1">{result.errors[0]}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || !selectedAccountId || uploading}
        className="w-full py-3 btn-primary flex items-center justify-center gap-2 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            Parsing statement...
          </>
        ) : (
          <>
            <Upload size={18} />
            Import Transactions
          </>
        )}
      </button>
    </div>
  )
}
