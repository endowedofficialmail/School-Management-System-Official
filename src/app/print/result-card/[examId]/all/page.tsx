'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// This route is no longer used.
// Bulk DMC printing is now at /print/dmc/[examId]/class/[classId]
// This page cannot redirect without a classId, so show a message.
export default function OldBulkResultCardPage() {
  const params = useParams()
  const router = useRouter()

  // We don't know the classId here; redirect to the results hub
  useEffect(() => {
    router.replace(`/results?examId=${params.examId}`)
  }, [params.examId, router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
      Redirecting to Results Hub…
    </div>
  )
}
