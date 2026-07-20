'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getStudentFullResult, type StudentFullResult } from '@/lib/actions/exams'
import DMCDocument from '@/components/results/DMCDocument'

export default function PrintDMCPage() {
  const params = useParams()
  const examId = Number(params.examId)
  const studentId = Number(params.studentId)
  const [data, setData] = useState<StudentFullResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStudentFullResult(examId, studentId).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [examId, studentId])

  useEffect(() => {
    if (!loading && data) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
        Loading DMC…
      </div>
    )
  }
  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: 'red' }}>
        DMC not found.
      </div>
    )
  }

  return (
    <html lang="en">
      <head>
        <title>{`DMC — ${data.student.firstName} ${data.student.lastName}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; }
          .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin: 12px 20px; font-size: 13px; font-family: Arial; }
          @media print {
            @page { margin: 10mm; size: A4; }
            .no-print { display: none !important; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        <div className="no-print">
          The print dialog will open automatically.{' '}
          <button onClick={() => window.print()} style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Click here to print manually
          </button>
        </div>
        <DMCDocument data={data} />
      </body>
    </html>
  )
}
