'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PortalHeader({
  schoolName,
  userName,
}: {
  schoolName: string
  userName: string
}) {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">{schoolName}</p>
          <p className="text-xs text-muted-foreground">Portal</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden max-w-[140px] truncate text-sm font-medium text-slate-700 sm:block">
            {userName}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="min-h-10 gap-1.5"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
