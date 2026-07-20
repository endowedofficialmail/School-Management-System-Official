'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// This route is now superseded by /print/dmc/[examId]/[studentId]
// Redirect for backward compatibility (e.g. portal links)
export default function OldResultCardRedirect() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/print/dmc/${params.examId}/${params.studentId}`)
  }, [params.examId, params.studentId, router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
      Redirecting to DMC…
    </div>
  )
}
