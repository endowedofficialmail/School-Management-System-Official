'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function PrintWrapper({ children }: { children: React.ReactNode }) {
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 600)
    const handleAfterPrint = () => setPrinted(true)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  return (
    <>
      <div className="no-print border-b bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {printed ? (
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <span>Print complete.</span>
            <Button size="sm" variant="outline" onClick={() => window.close()}>
              Close
            </Button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <span>Loading print preview...</span>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              Print Now
            </Button>
          </div>
        )}
      </div>
      {children}
    </>
  )
}
