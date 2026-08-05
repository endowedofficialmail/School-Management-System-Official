'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PrintWrapper from '@/components/shared/PrintWrapper'
import { IdCardPrintLayout, StudentIdCard } from '@/components/idcard/StudentIdCardDocument'
import { getClassIdCardData } from '@/lib/actions/idcard'

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function ClassIdCardsInner() {
  const params = useParams()
  const classId = Number(params.classId)
  const [data, setData] = useState<Awaited<ReturnType<typeof getClassIdCardData>> | null>(null)

  useEffect(() => {
    getClassIdCardData(classId).then(setData)
  }, [classId])

  useEffect(() => {
    if (data?.students.length) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [data])

  if (!data) {
    return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>
  }

  if (!data.school?.name) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', color: '#b45309' }}>
        School name not configured.
      </div>
    )
  }

  if (data.students.length === 0) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        No active students in this class.
      </div>
    )
  }

  const pages = chunk(data.students, 4)

  return (
    <PrintWrapper>
      <IdCardPrintLayout>
        {pages.map((pageStudents, pageIdx) => (
          <div key={pageIdx} className="idcard-page">
            <div className="idcard-grid" style={{ padding: '10mm' }}>
              {pageStudents.map((student) => (
                <StudentIdCard
                  key={student.registrationNumber}
                  student={student}
                  school={data.school!}
                  session={data.session}
                />
              ))}
            </div>
          </div>
        ))}
      </IdCardPrintLayout>
    </PrintWrapper>
  )
}

export default function PrintClassIdCardsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
      <ClassIdCardsInner />
    </Suspense>
  )
}
