'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getClassResult, getStudentFullResult, type StudentFullResult } from '@/lib/actions/exams'
import DMCDocument from '@/components/results/DMCDocument'

export default function PrintAllDMCsPage() {
  const params = useParams()
  const examId = Number(params.examId)
  const classId = Number(params.classId)
  const [dmcs, setDmcs] = useState<StudentFullResult[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    async function load() {
      const classResult = await getClassResult(examId, classId)
      if (!classResult || classResult.rows.length === 0) {
        setLoading(false)
        return
      }
      const total = classResult.rows.length
      const results: StudentFullResult[] = []
      for (let i = 0; i < classResult.rows.length; i++) {
        const row = classResult.rows[i]
        const dmc = await getStudentFullResult(examId, row.student.id)
        if (dmc) results.push(dmc)
        setProgress(Math.round(((i + 1) / total) * 100))
      }
      setDmcs(results)
      setLoading(false)
    }
    load()
  }, [examId, classId])

  useEffect(() => {
    if (!loading && dmcs.length > 0) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [loading, dmcs])

  if (loading) {
    return (
      <html lang="en">
        <head>
          <title>Preparing DMCs…</title>
          <style>{`body { font-family: Arial; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: white; }`}</style>
        </head>
        <body>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 8 }}>Preparing DMCs…</p>
            <p style={{ color: '#666', marginBottom: 12 }}>{progress}% complete</p>
            <div style={{ width: 200, height: 8, background: '#e5e7eb', borderRadius: 4, margin: '0 auto' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#1e3a5f', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
          </div>
        </body>
      </html>
    )
  }

  if (dmcs.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: 'red' }}>
        No DMCs found. Please enter results first.
      </div>
    )
  }

  return (
    <html lang="en">
      <head>
        <title>All DMCs</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; }
          .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin: 10px 20px; font-size: 13px; font-family: Arial; }
          .dmc-page { page-break-after: always; }
          .dmc-page:last-child { page-break-after: auto; }
          @media print {
            @page { margin: 10mm; size: A4; }
            .no-print { display: none !important; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        <div className="no-print">
          {dmcs.length} DMC{dmcs.length !== 1 ? 's' : ''} ready.{' '}
          <button onClick={() => window.print()} style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Click here to print
          </button>
        </div>
        {dmcs.map((dmc) => (
          <div key={`${dmc.exam.id}-${dmc.student.id}`} className="dmc-page">
            <DMCDocument data={dmc} />
          </div>
        ))}
      </body>
    </html>
  )
}
