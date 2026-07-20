'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { getAwardList, getExamById, type AwardListData } from '@/lib/actions/exams'
import { getSchoolProfile } from '@/lib/actions/settings'

type ExamData = NonNullable<Awaited<ReturnType<typeof getExamById>>>
type SchoolData = Awaited<ReturnType<typeof getSchoolProfile>>

export default function PrintAwardListPage() {
  const params = useParams()
  const examId = Number(params.examId)
  const subjectId = Number(params.subjectId)
  const classId = Number(params.classId)

  const [exam, setExam] = useState<ExamData | null>(null)
  const [awardList, setAwardList] = useState<AwardListData | null>(null)
  const [school, setSchool] = useState<SchoolData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [examData, awardListData, schoolData] = await Promise.all([
        getExamById(examId),
        getAwardList(examId, subjectId, classId),
        getSchoolProfile(),
      ])
      setExam(examData)
      setAwardList(awardListData)
      setSchool(schoolData)
      setLoading(false)
    }
    load()
  }, [examId, subjectId, classId])

  useEffect(() => {
    if (!loading && awardList && awardList.rows.length > 0) {
      const t = setTimeout(() => window.print(), 700)
      return () => clearTimeout(t)
    }
  }, [loading, awardList])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
        Loading award list…
      </div>
    )
  }

  if (!awardList || awardList.rows.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: 'red' }}>
        No data found for this award list.
      </div>
    )
  }

  const totalMarks = awardList.totalMarksHint ?? '—'
  const examClassLabel = exam
    ? exam.examClasses?.length
      ? exam.examClasses.map((ec) => `${ec.class.name} – ${ec.class.section}`).join(', ')
      : exam.class
        ? `${exam.class.name} – ${exam.class.section}`
        : `Class ${classId}`
    : `Class ${classId}`

  const enteredRows = awardList.rows.filter((r) => r.marksObtained !== null || r.isAbsent || r.isWithheld)

  return (
    <html lang="en">
      <head>
        <title>{`Award List — ${awardList.subject.name}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; }
          .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin: 12px 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #d1d5db; padding: 5px 8px; }
          thead th { background: #1e3a5f; color: white; font-weight: bold; font-size: 10px; }
          tfoot td { background: #f1f5f9; font-weight: bold; }
          .header { text-align: center; padding-bottom: 12px; border-bottom: 3px double #1a1a1a; margin-bottom: 14px; }
          .school-name { font-size: 18px; font-weight: bold; color: #1e3a5f; }
          .title-bar { background: #1e3a5f; color: white; text-align: center; padding: 8px 0; margin-bottom: 12px; border-radius: 3px; }
          .meta-row { display: flex; flex-wrap: wrap; gap: 6px 24px; border: 1px solid #ccc; border-radius: 3px; padding: 8px 12px; margin-bottom: 12px; background: #fafafa; font-size: 10.5px; }
          .stats { border: 1px solid #ccc; border-radius: 3px; padding: 8px 12px; margin-top: 12px; background: #fafafa; font-size: 11px; }
          .sigs { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; text-align: center; font-size: 11px; }
          .sig-line { border-bottom: 1px solid #333; padding-bottom: 20px; margin-bottom: 4px; }
          .footer { border-top: 1px solid #ccc; padding-top: 6px; text-align: center; font-size: 9px; color: #777; margin-top: 12px; }
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

        <div style={{ padding: '16px 20px' }}>
          {/* HEADER */}
          <div className="header">
            <div className="school-name">{school?.name ?? 'School Name'}</div>
            {school?.address && <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{school.address}</div>}
            {school?.phone && <div style={{ fontSize: 10, color: '#555' }}>Tel: {school.phone}</div>}
          </div>

          {/* TITLE */}
          <div className="title-bar">
            <div style={{ fontSize: 14, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' }}>Award List</div>
            <div style={{ fontSize: 11, marginTop: 3, opacity: 0.9 }}>{exam?.name ?? `Exam ${examId}`} — {awardList.subject.name}</div>
          </div>

          {/* META */}
          <div className="meta-row">
            <span><b>Exam:</b> {exam?.name ?? `Exam ${examId}`}</span>
            <span><b>Subject:</b> {awardList.subject.name}</span>
            <span><b>Class:</b> {examClassLabel}</span>
            <span><b>Total Marks:</b> {totalMarks}</span>
            {exam && <span><b>Academic Year:</b> {exam.academicYear.name}</span>}
            <span><b>Date:</b> {format(new Date(), 'dd MMM yyyy')}</span>
          </div>

          {/* TABLE */}
          <table>
            <thead>
              <tr>
                <th style={{ width: 35, textAlign: 'center' }}>Sr</th>
                <th>Student Name</th>
                <th style={{ width: 90 }}>Reg #</th>
                <th style={{ width: 75, textAlign: 'center' }}>Obtained</th>
                <th style={{ width: 60, textAlign: 'center' }}>Grade</th>
                <th style={{ width: 80, textAlign: 'center' }}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {awardList.rows.map((row, idx) => (
                <tr key={row.student.id} style={{
                  background: row.isAbsent ? '#fffbeb' : row.isWithheld ? '#f1f5f9' : idx % 2 === 0 ? '#fff' : '#f8f9fa',
                }}>
                  <td style={{ textAlign: 'center', color: '#888' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 500 }}>{row.student.firstName} {row.student.lastName}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 10 }}>{row.student.registrationNumber}</td>
                  <td style={{
                    textAlign: 'center', fontWeight: 600,
                    color: row.isAbsent ? '#b45309' : row.isWithheld ? '#475569' : row.marksObtained !== null
                      ? (row.totalMarks && row.marksObtained / row.totalMarks >= 0.4 ? '#166534' : '#991b1b')
                      : '#94a3b8',
                  }}>
                    {row.isAbsent ? 'ABS' : row.isWithheld ? 'W/H' : row.marksObtained !== null ? row.marksObtained : '—'}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.grade ?? '—'}</td>
                  <td style={{ textAlign: 'center', color: '#555', fontStyle: 'italic', fontSize: 10 }}>{row.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* STATS */}
          <div className="stats">
            {awardList.topper && (
              <div style={{ marginBottom: 4, fontWeight: 'bold', color: '#1e3a5f' }}>
                Subject Topper: {awardList.topper.student.firstName} {awardList.topper.student.lastName} ({awardList.topper.marksObtained}/{totalMarks} — {totalMarks && awardList.topper.totalMarks ? ((awardList.topper.marksObtained! / awardList.topper.totalMarks) * 100).toFixed(1) : '—'}%)
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 11 }}>
              <span>Entries: <b>{enteredRows.length}/{awardList.totalStudents}</b></span>
              <span>Subject Average: <b>{awardList.average}%</b></span>
              <span style={{ color: '#166534' }}>Pass: <b>{awardList.passCount}</b></span>
              <span style={{ color: '#991b1b' }}>Fail: <b>{awardList.failCount}</b></span>
            </div>
          </div>

          {/* SIGNATURES */}
          <div className="sigs">
            <div>
              <div className="sig-line" />
              <b>Subject Teacher</b>
              <div style={{ color: '#555', fontSize: 10 }}>Signature &amp; Stamp</div>
            </div>
            <div>
              <div className="sig-line" />
              <b>Controller of Exams</b>
              <div style={{ color: '#555', fontSize: 10 }}>Signature &amp; Stamp</div>
            </div>
          </div>

          <div className="footer">
            <div>{school?.name ?? ''} — Award List (Computer Generated)</div>
          </div>
        </div>
      </body>
    </html>
  )
}
