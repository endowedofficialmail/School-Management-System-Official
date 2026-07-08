import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 text-center px-4 bg-background">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>
      <div>
        <h1 className="text-6xl font-extrabold text-slate-200">404</h1>
        <h2 className="mt-2 text-xl font-semibold text-slate-800">Page not found</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-xs mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants()}>
        Back to Dashboard
      </Link>
    </div>
  )
}
