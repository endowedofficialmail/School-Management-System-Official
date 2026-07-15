'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { RollSlipDocument } from '@/components/rollslips/RollSlipDocument'
import { getRollSlipsByExam, getRollSlipById, type RollSlipPrintData } from '@/lib/actions/rollslips'

export default function PrintExamRollSlipsPage() {
  const params = useParams()
  const examId = Number(params.examId)
  const [slips, setSlips] = useState<RollSlipPrintData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const list = await getRollSlipsByExam(examId)
      const valid = list.filter((s) => s.isValid)
      const full = await Promise.all(valid.map((s) => getRollSlipById(s.id)))
      setSlips(full.filter((d): d is RollSlipPrintData => d !== null))
      setLoading(false)
    }
    load()
  }, [examId])

  useEffect(() => {
    if (!loading && slips.length > 0) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [loading, slips])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Georgia, serif' }}>
        Loading roll slips…
      </div>
    )
  }

  if (slips.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Georgia, serif', color: 'red' }}>
        No valid roll slips found for this exam.
      </div>
    )
  }

  return (
    <html lang="en">
      <head>
        <title>Roll Slips — Exam {examId}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; font-family: Georgia, serif; }
          .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin: 12px 20px; font-size: 13px; }
          .student-page { page-break-after: always; padding: 8px 16px; }
          .student-page:last-child { page-break-after: auto; }
          .cut-line { text-align: center; font-size: 10px; color: #94a3b8; margin: 8px 0; letter-spacing: 2px; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; padding: 4px 0; }
          @media print {
            @page { margin: 8mm; size: A4; }
            .no-print { display: none !important; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        <div className="no-print">
          {slips.length} roll slip{slips.length !== 1 ? 's' : ''} ready.{' '}
          <button onClick={() => window.print()} style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Click here to print
          </button>
        </div>

        {slips.map((data) => (
          <div key={data.slip.id} className="student-page">
            <RollSlipDocument data={data} copyLabel="STUDENT COPY" compact />
            <div className="cut-line">- - - - - CUT HERE - - - - -</div>
            <RollSlipDocument data={data} copyLabel="SCHOOL COPY" compact />
          </div>
        ))}
      </body>
    </html>
  )
}
