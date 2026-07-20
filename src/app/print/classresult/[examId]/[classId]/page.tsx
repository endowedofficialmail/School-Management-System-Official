'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { getClassResult, type ClassResultData } from '@/lib/actions/exams'
import { getSchoolProfile } from '@/lib/actions/settings'

type SchoolData = Awaited<ReturnType<typeof getSchoolProfile>>

function fmtDate(d: Date | string) {
  return format(new Date(d), 'dd MMM yyyy')
}

function RankIcon({ rank }: { rank: number | null }) {
  if (rank === 1) return <span>1 🥇</span>
  if (rank === 2) return <span>2 🥈</span>
  if (rank === 3) return <span>3 🥉</span>
  return <span>{rank ?? '—'}</span>
}

export default function PrintClassResultPage() {
  const params = useParams()
  const examId = Number(params.examId)
  const classId = Number(params.classId)
  const [data, setData] = useState<ClassResultData | null>(null)
  const [school, setSchool] = useState<SchoolData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getClassResult(examId, classId), getSchoolProfile()]).then(([d, s]) => {
      setData(d)
      setSchool(s)
      setLoading(false)
    })
  }, [examId, classId])

  useEffect(() => {
    if (!loading && data && data.rows.length > 0) {
      const t = setTimeout(() => window.print(), 700)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
        Loading class result…
      </div>
    )
  }

  if (!data || data.rows.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: 'red' }}>
        No results found for this class.
      </div>
    )
  }

  const { exam, subjects, rows, totalStudents, passCount, failCount, absentCount, withheldCount, classAverage, highest, lowest, subjectAverages } = data

  return (
    <html lang="en">
      <head>
        <title>{`Class Result — ${exam.name}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; }
          .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin: 12px 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 5px 7px; }
          thead th { background: #1e3a5f; color: white; font-weight: bold; font-size: 10px; }
          tfoot td { background: #f1f5f9; font-weight: bold; }
          .header { text-align: center; padding-bottom: 12px; border-bottom: 3px double #1a1a1a; margin-bottom: 14px; }
          .school-name { font-size: 20px; font-weight: bold; color: #1e3a5f; }
          .school-sub { font-size: 10px; color: #555; margin-top: 2px; }
          .title-bar { background: #1e3a5f; color: white; text-align: center; padding: 8px 0; margin-bottom: 12px; border-radius: 3px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; border: 1px solid #ccc; border-radius: 3px; padding: 10px; margin-bottom: 12px; background: #fafafa; font-size: 11px; }
          .meta-row { display: flex; gap: 6px; padding: 2px 0; border-bottom: 1px dashed #e5e7eb; }
          .meta-label { font-weight: bold; color: #374151; min-width: 130px; }
          .summary { border: 1px solid #ccc; border-radius: 3px; padding: 10px; margin-top: 12px; background: #fafafa; font-size: 11px; }
          .summary-title { font-weight: bold; margin-bottom: 6px; color: #1e3a5f; }
          .sigs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px; text-align: center; font-size: 11px; }
          .sig-line { border-bottom: 1px solid #333; padding-bottom: 20px; margin-bottom: 4px; }
          .footer { border-top: 1px solid #ccc; padding-top: 6px; text-align: center; font-size: 9px; color: #777; margin-top: 12px; }
          tr.pass { }
          tr.fail td { color: #991b1b; }
          tr.absent td { color: #b45309; }
          tr.withheld td { color: #475569; }
          @media print {
            @page { margin: 8mm; size: A4 landscape; }
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

        <div style={{ padding: '16px 20px' }}>
          {/* HEADER */}
          <div className="header">
            <div className="school-name">{school?.name ?? 'School Name'}</div>
            {school?.address && <div className="school-sub">{school.address}</div>}
            {school?.phone && <div className="school-sub">Tel: {school.phone}</div>}
          </div>

          {/* TITLE BAR */}
          <div className="title-bar">
            <div style={{ fontSize: 14, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' }}>Class Result Sheet</div>
            <div style={{ fontSize: 11, marginTop: 3, opacity: 0.9 }}>{exam.name} — {exam.academicYear.name}</div>
          </div>

          {/* META */}
          <div className="meta">
            {[
              ['Exam', exam.name],
              ['Academic Year', exam.academicYear.name],
              ['Exam Period', `${fmtDate(exam.startDate)} to ${fmtDate(exam.endDate)}`],
              ['Total Students', String(totalStudents)],
            ].map(([label, value]) => (
              <div key={label} className="meta-row">
                <span className="meta-label">{label}:</span>
                <span>{value}</span>
              </div>
            ))}
          </div>

          {/* RESULT TABLE */}
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>Rank</th>
                <th style={{ width: 100 }}>Roll/Reg#</th>
                <th style={{ minWidth: 130 }}>Student Name</th>
                {subjects.map((s) => (
                  <th key={s.id} style={{ minWidth: 55 }}>
                    {s.name}
                    <br />
                    <span style={{ fontWeight: 'normal', opacity: 0.8, fontSize: 9 }}>
                      /{subjectAverages.find((a) => a.subjectId === s.id)?.totalMarks ?? '—'}
                    </span>
                  </th>
                ))}
                <th style={{ width: 60 }}>Total</th>
                <th style={{ width: 55 }}>%</th>
                <th style={{ width: 35 }}>Grade</th>
                <th style={{ width: 60 }}>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.student.id} className={
                  row.resultStatus === 'Fail' ? 'fail' :
                  row.resultStatus === 'Absent' ? 'absent' :
                  row.resultStatus === 'Withheld' ? 'withheld' : 'pass'
                }>
                  <td style={{ textAlign: 'center' }}><RankIcon rank={row.rank} /></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{row.rollNumber ?? row.student.registrationNumber}</td>
                  <td style={{ fontWeight: 500 }}>{row.student.firstName} {row.student.lastName}</td>
                  {row.subjectMarks.map((m) => (
                    <td key={m.subjectId} style={{
                      textAlign: 'center',
                      color: m.isAbsent ? '#b45309' : m.isWithheld ? '#475569' : 'inherit',
                      fontWeight: m.isAbsent || m.isWithheld ? 'bold' : 'normal',
                    }}>
                      {m.isAbsent ? 'ABS' : m.isWithheld ? 'W/H' : m.marksObtained !== null ? m.marksObtained : '—'}
                    </td>
                  ))}
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                    {row.totalObtained !== null ? `${row.totalObtained}/${row.totalPossible}` : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>{row.percentage !== null ? `${row.percentage.toFixed(1)}%` : '—'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.grade ?? '—'}</td>
                  <td style={{
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: row.resultStatus === 'Pass' ? '#166534' : row.resultStatus === 'Fail' ? '#991b1b' : row.resultStatus === 'Absent' ? '#b45309' : '#475569',
                  }}>
                    {row.resultStatus}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 'bold', color: '#1e3a5f' }}>Class Average:</td>
                {subjectAverages.map((s) => (
                  <td key={s.subjectId} style={{ textAlign: 'center' }}>{s.avgObtained}</td>
                ))}
                <td />
                <td style={{ textAlign: 'center', color: '#1e3a5f', fontWeight: 'bold' }}>{classAverage}%</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>

          {/* SUMMARY */}
          <div className="summary">
            <div className="summary-title">SUMMARY</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', fontSize: 11 }}>
              <span>Total Students: <b>{totalStudents}</b></span>
              <span style={{ color: '#166534' }}>Passed: <b>{passCount}</b></span>
              <span style={{ color: '#991b1b' }}>Failed: <b>{failCount}</b></span>
              {absentCount > 0 && <span style={{ color: '#b45309' }}>Absent: <b>{absentCount}</b></span>}
              {withheldCount > 0 && <span style={{ color: '#475569' }}>Withheld: <b>{withheldCount}</b></span>}
              <span>Highest: <b>{highest.toFixed(1)}%</b></span>
              <span>Lowest: <b>{lowest.toFixed(1)}%</b></span>
              <span>Class Average: <b>{classAverage}%</b></span>
            </div>
          </div>

          {/* SIGNATURES */}
          <div className="sigs">
            {['Class Teacher', 'Controller of Exams', 'Principal'].map((role) => (
              <div key={role}>
                <div className="sig-line" />
                <b>{role}</b>
                <div style={{ color: '#555', fontSize: 10 }}>Signature &amp; Stamp</div>
              </div>
            ))}
          </div>

          <div className="footer">
            <div>{school?.name ?? ''} — Class Result Sheet (Computer Generated)</div>
          </div>
        </div>
      </body>
    </html>
  )
}
