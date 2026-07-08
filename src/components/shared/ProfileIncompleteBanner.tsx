'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProfileIncompleteBannerProps {
  schoolName?: string | null
  address?: string | null
  phone?: string | null
  logoUrl?: string | null
  userRole: string
}

const DISMISS_KEY = 'profile-incomplete-banner-dismissed-at'
const DAY_MS = 24 * 60 * 60 * 1000

export default function ProfileIncompleteBanner({
  schoolName,
  address,
  phone,
  logoUrl,
  userRole,
}: ProfileIncompleteBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  const isIncomplete = useMemo(
    () => !schoolName || !address || !phone || !logoUrl,
    [schoolName, address, phone, logoUrl]
  )

  useEffect(() => {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return
    const timestamp = Number(raw)
    if (Number.isFinite(timestamp) && Date.now() - timestamp < DAY_MS) {
      setDismissed(true)
    } else {
      localStorage.removeItem(DISMISS_KEY)
    }
  }, [])

  if (!isIncomplete || userRole !== 'ADMIN' || dismissed) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Your school profile is incomplete. Some features like certificates and printed documents may not display correctly.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings/school" className={cn(buttonVariants({ size: 'sm' }), 'bg-amber-600 hover:bg-amber-700 text-white')}>
            Complete Profile
          </Link>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, String(Date.now()))
              setDismissed(true)
            }}
            className="rounded-md p-1 text-amber-700 hover:bg-amber-100"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
