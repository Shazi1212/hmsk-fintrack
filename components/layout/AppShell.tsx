'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import QuickAddFAB from './QuickAddFAB'
import { Menu } from 'lucide-react'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen">
      <Sidebar mobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen bg-slate-50">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="font-bold text-slate-800">FinTrack</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>

      {/* Quick-add FAB */}
      <QuickAddFAB />
    </div>
  )
}
