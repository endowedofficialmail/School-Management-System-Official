'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { getClassResultSummary, getStudentFullResult, type StudentFullResult } from '@/lib/actions/exams'
import { ordinal } from '@/lib/grade'

const GRADE_SCALE = [
  { grade: 'A+', range: '90–100%' },
  { grade: 'A', range: '80–89%' },
  { grade: 'B', range: '70–79%' },
  { grade: 'C', range: '60–69%' },
  { grade: 'D', range: '50–59%' },
  { grade: 'F', range: 'Below 50%' },
]

function SingleCard({ data }: { data: StudentFullResult }) {
  const { exam, student, school, results, totalObtained, totalPossible, percentage, overallGrade, passed, rank, totalRanked, subjectsPassed, subjectsFailed } = data
  if (!school?.name) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#b45309' }}>⚠️ School name not configured. Please update school profile before printing.</div>
  }
  const fullName = `${student.firstName} ${student.lastName}`
  const schoolInitials = (school?.name ?? 'S').split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#1a1a1a', maxWidth: 780, margin: '0 auto', padding: '16px 20px', pageBreakAfter: 'always' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '3px double #1a1a1a', paddingBottom: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {school?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold', flexShrink: 0 }}>
              {schoolInitials}
            </div>
          )}
          <div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' }}>{school?.name ?? 'School'}</div>
            {school?.address && <div style={{ fontSize: 10, color: '#555' }}>{school.address}</div>}
          </div>
        </div>
      </div>
      {/* Title */}
      <div style={{ background: '#1e3a5f', color: 'white', textAlign: 'center', padding: '8px 0', marginBottom: 10, borderRadius: 3 }}>
        <div style={{ fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', fontSize: 13 }}>Progress Report Card</div>
        <div style={{ fontSize: 11, opacity: 0.9 }}>{exam.name} — {exam.academicYear.name}</div>
      </div>
      {/* Student info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', border: '1px solid #ccc', borderRadius: 3, padding: 10, marginBottom: 10, background: '#fafafa', fontSize: 10.5 }}>
        {[
          ['Student Name', fullName], ['Date of Birth', student.dateOfBirth ? format(new Date(student.dateOfBirth), 'dd MMM yyyy') : 'N/A'],
          ['Registration #', student.registrationNumber], ['Gender', student.gender === 'MALE' ? 'Male' : 'Female'],
          ['Class', `${exam.class.name} – ${exam.class.section}`], ['Date of Issue', format(new Date(), 'dd MMM yyyy')],
          ['Guardian Name', student.guardianName], ['', ''],
        ].map(([label, value], i) => (
          <div key={i} style={{ display: 'flex', gap: 4, padding: '3px 0', borderBottom: '1px dashed #e5e7eb' }}>
            <span style={{ fontWeight: 'bold', minWidth: 100, color: '#374151' }}>{label}:</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
      {/* Results table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: 10.5 }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: 'white' }}>
            {['#', 'Subject', 'Total', 'Obtained', '%', 'Grade', 'Remarks'].map((h) => (
              <th key={h} style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid #1e3a5f' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => {
            const pct = r.totalMarks > 0 ? Math.round((r.marksObtained / r.totalMarks) * 1000) / 10 : 0
            return (
              <tr key={r.subject.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd' }}>{r.subject.name}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{r.totalMarks}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center', color: pct >= 40 ? '#166534' : '#991b1b', fontWeight: 600 }}>{r.marksObtained}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center' }}>{pct}%</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{r.grade}</td>
                <td style={{ padding: '5px 8px', border: '1px solid #ddd', color: '#777', fontStyle: 'italic', fontSize: 10 }}>{r.remarks ?? '—'}</td>
              </tr>
            )
          })}
          <tr style={{ background: '#1e3a5f', color: 'white', fontWeight: 'bold' }}>
            <td colSpan={2} style={{ padding: '6px 8px', border: '1px solid #1e3a5f', textAlign: 'right' }}>TOTAL</td>
            <td style={{ padding: '6px 8px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{totalPossible}</td>
            <td style={{ padding: '6px 8px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{totalObtained}</td>
            <td style={{ padding: '6px 8px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{Number(percentage).toFixed(1)}%</td>
            <td style={{ padding: '6px 8px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{overallGrade}</td>
            <td style={{ padding: '6px 8px', border: '1px solid #1e3a5f' }}>—</td>
          </tr>
        </tbody>
      </table>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
        <div style={{ border: '1px solid #ccc', borderRadius: 3, padding: 10, background: '#fafafa' }}>
          <div style={{ fontSize: 26, fontWeight: 'bold', color: '#1e3a5f' }}>{Number(percentage).toFixed(1)}%</div>
          <div style={{ fontWeight: 'bold', fontSize: 14, color: overallGrade === 'F' ? '#dc2626' : '#16a34a' }}>Grade: {overallGrade}</div>
          {rank && <div style={{ fontSize: 10.5, color: '#555', marginTop: 2 }}>{ordinal(rank)} out of {totalRanked}</div>}
        </div>
        <div style={{ border: '1px solid #ccc', borderRadius: 3, padding: 10, background: passed ? '#f0fdf4' : '#fef2f2', textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 'bold', color: passed ? '#16a34a' : '#dc2626' }}>{passed ? '✓ PASS' : '✗ FAIL'}</div>
          <div style={{ fontSize: 10.5, marginTop: 4 }}>Passed: {subjectsPassed} | Failed: {subjectsFailed}</div>
        </div>
      </div>
      {/* Grade scale */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 3, padding: 6, marginBottom: 10, fontSize: 9.5 }}>
        <b>Grade Scale: </b>
        {GRADE_SCALE.map((g) => <span key={g.grade} style={{ marginRight: 12 }}><b>{g.grade}</b> = {g.range}</span>)}
      </div>
      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, textAlign: 'center', fontSize: 10.5 }}>
        {['Class Teacher', 'Principal', 'Parent / Guardian'].map((role) => (
          <div key={role}>
            <div style={{ borderBottom: '1px solid #333', paddingBottom: 20, marginBottom: 4 }}></div>
            <b>{role}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PrintAllResultCardsPage() {
  const params = useParams()
  const examId = Number(params.examId)
  const [cards, setCards] = useState<StudentFullResult[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    async function load() {
      const summary = await getClassResultSummary(examId)
      if (!summary || summary.performances.length === 0) { setLoading(false); return }
      const total = summary.performances.length
      const results: StudentFullResult[] = []
      for (let i = 0; i < summary.performances.length; i++) {
        const p = summary.performances[i]
        const card = await getStudentFullResult(examId, p.studentId)
        if (card) results.push(card)
        setProgress(Math.round(((i + 1) / total) * 100))
      }
      setCards(results)
      setLoading(false)
    }
    load()
  }, [examId])

  useEffect(() => {
    if (!loading && cards.length > 0) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [loading, cards])

  return (
    <html lang="en">
      <head>
        <title>All Result Cards</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; }
          .loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial; gap: 12px; }
          .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin: 10px 20px; font-size: 13px; font-family: Arial; }
          @media print {
            @page { margin: 10mm; size: A4; }
            .no-print { display: none !important; }
            .loading-screen { display: none !important; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        {loading ? (
          <div className="loading-screen">
            <p style={{ fontSize: 16, fontWeight: 'bold', color: '#1e3a5f' }}>Preparing Result Cards…</p>
            <p style={{ color: '#666' }}>{progress}% complete</p>
            <div style={{ width: 200, height: 8, background: '#e5e7eb', borderRadius: 4 }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#1e3a5f', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
          </div>
        ) : cards.length === 0 ? (
          <div className="loading-screen">
            <p style={{ color: 'red' }}>No result cards found. Please enter results first.</p>
          </div>
        ) : (
          <>
            <div className="no-print">
              {cards.length} result card{cards.length !== 1 ? 's' : ''} ready.{' '}
              <button onClick={() => window.print()} style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                Click here to print
              </button>
            </div>
            {cards.map((card) => (
              <SingleCard key={`${card.exam.id}-${card.student.id}`} data={card} />
            ))}
          </>
        )}
      </body>
    </html>
  )
}
