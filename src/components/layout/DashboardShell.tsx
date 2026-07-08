'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { UserRole } from '@/types'

interface DashboardShellProps {
  children: React.ReactNode
  userName: string
  userRole: UserRole
  userEmail?: string
  schoolName: string
}

export default function DashboardShell({
  children,
  userName,
  userRole,
  schoolName,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        role={userRole}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        schoolName={schoolName}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          userName={userName}
          userRole={userRole}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
