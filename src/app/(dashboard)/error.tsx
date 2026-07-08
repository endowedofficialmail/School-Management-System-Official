'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <AlertTriangle className="h-8 w-8 text-amber-600" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Something went wrong</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred while loading this page. Please try again — if the problem
          persists, contact your system administrator.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={reset} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
        <Link href="/dashboard" className={cn(buttonVariants(), 'gap-2')}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
