'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      aria-label="Go back"
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  )
}
