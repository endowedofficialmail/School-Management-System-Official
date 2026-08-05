'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PrintWrapper from '@/components/shared/PrintWrapper'
import { IdCardPrintLayout, StudentIdCard } from '@/components/idcard/StudentIdCardDocument'
import { getIdCardData } from '@/lib/actions/idcard'

function IdCardInner() {
  const params = useParams()
  const studentId = Number(params.studentId)
  const [data, setData] = useState<Awaited<ReturnType<typeof getIdCardData>> | null>(null)

  useEffect(() => {
    getIdCardData(studentId).then(setData)
  }, [studentId])

  useEffect(() => {
    if (data?.student) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [data])

  if (!data) {
    return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
  }

  if (!data.student || !data.school?.name) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
        {!data.student ? 'Student not found.' : 'School name not configured.'}
      </div>
    )
  }

  return (
    <PrintWrapper>
      <IdCardPrintLayout>
        <div className="idcard-grid" style={{ padding: '10mm' }}>
          {[0, 1, 2, 3].map((i) => (
            <StudentIdCard
              key={i}
              student={data.student!}
              school={data.school!}
              session={data.session}
            />
          ))}
        </div>
      </IdCardPrintLayout>
    </PrintWrapper>
  )
}

export default function PrintStudentIdCardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
      <IdCardInner />
    </Suspense>
  )
}
