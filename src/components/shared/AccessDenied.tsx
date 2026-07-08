import Link from 'next/link'
import { Lock } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <Lock className="h-8 w-8 text-red-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          You don&apos;t have permission to access this page.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
        Back to Dashboard
      </Link>
    </div>
  )
}
