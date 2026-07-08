'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { getStudentFullResult, type StudentFullResult } from '@/lib/actions/exams'
import { ordinal } from '@/lib/grade'

const GRADE_SCALE = [
  { grade: 'A+', range: '90–100%' },
  { grade: 'A', range: '80–89%' },
  { grade: 'B', range: '70–79%' },
  { grade: 'C', range: '60–69%' },
  { grade: 'D', range: '50–59%' },
  { grade: 'F', range: 'Below 50%' },
]

function ResultCardBody({ data }: { data: StudentFullResult }) {
  const { exam, student, school, results, totalObtained, totalPossible, percentage, overallGrade, passed, rank, totalRanked, subjectsPassed, subjectsFailed } = data
  if (!school?.name) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#b45309' }}>⚠️ School name not configured. Please update school profile before printing.</div>
  }
  const fullName = `${student.firstName} ${student.lastName}`
  const schoolInitials = (school?.name ?? 'S').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#1a1a1a', maxWidth: 800, margin: '0 auto', padding: 20 }}>

      {/* HEADER */}
      <div style={{ textAlign: 'center', borderBottom: '3px double #1a1a1a', paddingBottom: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 6 }}>
          {school?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt="logo" style={{ width: 60, height: 60, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 'bold', flexShrink: 0 }}>
              {schoolInitials}
            </div>
          )}
          <div>
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1e3a5f', letterSpacing: 1 }}>
              {school?.name ?? 'School Name'}
            </div>
            {school?.address && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{school.address}</div>}
            {school?.phone && <div style={{ fontSize: 11, color: '#555' }}>Tel: {school.phone}</div>}
          </div>
        </div>
      </div>

      {/* TITLE BAR */}
      <div style={{ background: '#1e3a5f', color: 'white', textAlign: 'center', padding: '10px 0', marginBottom: 14, borderRadius: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' }}>Progress Report Card</div>
        <div style={{ fontSize: 12, marginTop: 3, opacity: 0.9 }}>{exam.name}</div>
        <div style={{ fontSize: 11, marginTop: 2, opacity: 0.75 }}>Academic Year: {exam.academicYear.name}</div>
      </div>

      {/* STUDENT INFO — two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', border: '1px solid #ccc', borderRadius: 4, padding: 12, marginBottom: 14, background: '#fafafa' }}>
        {[
          ['Student Name', fullName],
          ['Date of Birth', student.dateOfBirth ? format(new Date(student.dateOfBirth), 'dd MMM yyyy') : 'N/A'],
          ['Registration #', student.registrationNumber],
          ['Gender', student.gender === 'MALE' ? 'Male' : 'Female'],
          ['Class', `${exam.class.name} – ${exam.class.section}`],
          ['Admission Date', format(new Date(student.admissionDate), 'dd MMM yyyy')],
          ['Guardian Name', student.guardianName],
          ['Date of Issue', format(new Date(), 'dd MMM yyyy')],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', gap: 6, padding: '4px 0', borderBottom: '1px dashed #e5e7eb' }}>
            <span style={{ fontWeight: 'bold', minWidth: 110, color: '#374151', fontSize: 11 }}>{label}:</span>
            <span style={{ color: '#111' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* RESULTS TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: 'white' }}>
            {['Sr.', 'Subject', 'Total Marks', 'Marks Obtained', 'Percentage', 'Grade', 'Remarks'].map((h) => (
              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Sr.' || h === 'Percentage' || h === 'Grade' ? 'center' : 'left', border: '1px solid #1e3a5f', fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, idx) => {
            const pct = r.totalMarks > 0 ? Math.round((r.marksObtained / r.totalMarks) * 1000) / 10 : 0
            const passing = pct >= 40
            return (
              <tr key={r.subject.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', fontWeight: 500 }}>{r.subject.name}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center' }}>{r.totalMarks}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center', color: passing ? '#166534' : '#991b1b', fontWeight: 600 }}>{r.marksObtained}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center' }}>{pct}%</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{r.grade}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', color: '#555', fontStyle: 'italic' }}>{r.remarks ?? '—'}</td>
              </tr>
            )
          })}
          {/* Total row */}
          <tr style={{ background: '#1e3a5f', color: 'white', fontWeight: 'bold' }}>
            <td colSpan={2} style={{ padding: '8px 10px', border: '1px solid #1e3a5f', textAlign: 'right' }}>TOTAL</td>
            <td style={{ padding: '8px 10px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{totalPossible}</td>
            <td style={{ padding: '8px 10px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{totalObtained}</td>
            <td style={{ padding: '8px 10px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{Number(percentage).toFixed(1)}%</td>
            <td style={{ padding: '8px 10px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{overallGrade}</td>
            <td style={{ padding: '8px 10px', border: '1px solid #1e3a5f' }}>—</td>
          </tr>
        </tbody>
      </table>

      {/* PERFORMANCE SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
        <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 12, background: '#fafafa' }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>Overall Performance</div>
          <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1e3a5f' }}>{Number(percentage).toFixed(1)}%</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: overallGrade === 'F' ? '#dc2626' : '#16a34a', marginTop: 2 }}>Grade: {overallGrade}</div>
          {rank && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Class Position: {ordinal(rank)} out of {totalRanked} students</div>}
        </div>
        <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 12, background: passed ? '#f0fdf4' : '#fef2f2' }}>
          <div style={{ fontSize: 26, fontWeight: 'bold', color: passed ? '#16a34a' : '#dc2626', textAlign: 'center', marginBottom: 6 }}>
            {passed ? '✓ PASS' : '✗ FAIL'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11 }}>
            <span style={{ color: '#555' }}>Total Subjects:</span><span style={{ fontWeight: 'bold' }}>{results.length}</span>
            <span style={{ color: '#555' }}>Subjects Passed:</span><span style={{ fontWeight: 'bold', color: '#16a34a' }}>{subjectsPassed}</span>
            <span style={{ color: '#555' }}>Subjects Failed:</span><span style={{ fontWeight: 'bold', color: '#dc2626' }}>{subjectsFailed}</span>
          </div>
        </div>
      </div>

      {/* GRADE SCALE */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: 8, marginBottom: 14, fontSize: 10 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#374151' }}>Grade Scale:</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {GRADE_SCALE.map((g) => (
            <span key={g.grade}><b>{g.grade}</b> = {g.range}</span>
          ))}
        </div>
      </div>

      {/* REMARKS */}
      <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 12, marginBottom: 14, fontSize: 11 }}>
        <div style={{ marginBottom: 8 }}>Class Teacher Remarks: <span style={{ display: 'inline-block', minWidth: 300, borderBottom: '1px solid #999' }}>&nbsp;</span></div>
        <div>Principal Remarks: <span style={{ display: 'inline-block', minWidth: 320, borderBottom: '1px solid #999' }}>&nbsp;</span></div>
      </div>

      {/* SIGNATURES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 14, textAlign: 'center', fontSize: 11 }}>
        {['Class Teacher', 'Principal', 'Parent / Guardian'].map((role) => (
          <div key={role}>
            <div style={{ borderBottom: '1px solid #333', marginBottom: 4, paddingBottom: 24 }}></div>
            <div style={{ fontWeight: 'bold' }}>{role}</div>
            <div style={{ color: '#555' }}>Signature{role === 'Parent / Guardian' ? ' & Date' : ''}</div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #ccc', paddingTop: 8, textAlign: 'center', fontSize: 10, color: '#777' }}>
        <div>This result card is computer generated and valid without signature unless specified.</div>
        <div style={{ marginTop: 2, fontWeight: 'bold' }}>{school?.name}</div>
      </div>
    </div>
  )
}

export default function PrintResultCardPage() {
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

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>Loading result card…</div>
  if (!data) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: 'red' }}>Result card not found.</div>

  return (
    <html lang="en">
      <head>
        <title>{`Result Card — ${data.student.firstName} ${data.student.lastName}`}</title>
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
        <ResultCardBody data={data} />
      </body>
    </html>
  )
}
