import { format } from 'date-fns'
import type { StudentFullResult } from '@/lib/actions/exams'
import { ordinal } from '@/lib/grade'

const GRADE_SCALE = [
  { grade: 'A+', range: '90–100%' },
  { grade: 'A', range: '80–89%' },
  { grade: 'B', range: '70–79%' },
  { grade: 'C', range: '60–69%' },
  { grade: 'D', range: '50–59%' },
  { grade: 'F', range: 'Below 50%' },
]

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  Pass: { label: '✓ PASS', color: '#16a34a', bg: '#f0fdf4' },
  Fail: { label: '✗ FAIL', color: '#dc2626', bg: '#fef2f2' },
  Absent: { label: 'ABSENT', color: '#b45309', bg: '#fffbeb' },
  Withheld: { label: 'WITHHELD', color: '#475569', bg: '#f1f5f9' },
  Pending: { label: 'PENDING', color: '#475569', bg: '#f8fafc' },
}

export default function DMCDocument({ data }: { data: StudentFullResult }) {
  const {
    exam, student, school, classLabel, rollNumber, results,
    totalObtained, totalPossible, percentage, overallGrade, resultStatus,
    rank, totalRanked, subjectsPassed, subjectsFailed,
  } = data

  if (!school?.name) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#b45309' }}>
        ⚠️ School name not configured. Please update school profile before printing.
      </div>
    )
  }

  const fullName = `${student.firstName} ${student.lastName}`
  const schoolInitials = (school?.name ?? 'S').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const status = STATUS_STYLE[resultStatus] ?? STATUS_STYLE.Pending

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
            <div style={{ fontSize: 22, fontWeight: 'bold', color: '#1e3a5f', letterSpacing: 1 }}>{school?.name ?? 'School Name'}</div>
            {school?.address && <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{school.address}</div>}
            {(school?.phone || school?.email) && (
              <div style={{ fontSize: 11, color: '#555' }}>
                {school?.phone ? `Tel: ${school.phone}` : ''}{school?.phone && school?.email ? ' | ' : ''}{school?.email ?? ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TITLE BAR */}
      <div style={{ background: '#1e3a5f', color: 'white', textAlign: 'center', padding: '10px 0', marginBottom: 14, borderRadius: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' }}>Detailed Marks Certificate (DMC)</div>
        <div style={{ fontSize: 12, marginTop: 3, opacity: 0.9 }}>{exam.name} — {exam.academicYear.name}</div>
      </div>

      {/* STUDENT INFO */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', border: '1px solid #ccc', borderRadius: 4, padding: 12, marginBottom: 14, background: '#fafafa' }}>
        {[
          ['Student Name', fullName],
          ['Father / Guardian Name', student.guardianName],
          ['Registration No', student.registrationNumber],
          ['Class', classLabel],
          ['Date of Birth', student.dateOfBirth ? format(new Date(student.dateOfBirth), 'dd MMM yyyy') : 'N/A'],
          ['Roll Number', rollNumber ?? 'Not Issued'],
          ['Gender', student.gender === 'MALE' ? 'Male' : 'Female'],
          ['Date of Issue', format(new Date(), 'dd MMM yyyy')],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', gap: 6, padding: '4px 0', borderBottom: '1px dashed #e5e7eb' }}>
            <span style={{ fontWeight: 'bold', minWidth: 150, color: '#374151', fontSize: 11 }}>{label}:</span>
            <span style={{ color: '#111' }}>{value}</span>
          </div>
        ))}
      </div>

      {/* MARKS DETAIL */}
      <div style={{ fontWeight: 'bold', fontSize: 12, marginBottom: 6, color: '#1e3a5f' }}>MARKS DETAIL:</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: 'white' }}>
            {['Sr.', 'Subject', 'Total Marks', 'Marks Obtained', 'Percentage', 'Grade', 'Remarks'].map((h) => (
              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Subject' || h === 'Remarks' ? 'left' : 'center', border: '1px solid #1e3a5f', fontSize: 11 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, idx) => {
            const pct = r.totalMarks > 0 ? Math.round((r.marksObtained / r.totalMarks) * 1000) / 10 : 0
            const passing = pct >= 40
            return (
              <tr key={r.subject.id} style={{ background: r.isAbsent ? '#fffbeb' : r.isWithheld ? '#f1f5f9' : idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', fontWeight: 500 }}>{r.subject.name}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center' }}>{r.totalMarks}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 600, color: r.isAbsent ? '#b45309' : r.isWithheld ? '#475569' : passing ? '#166534' : '#991b1b' }}>
                  {r.isAbsent ? 'ABS' : r.isWithheld ? 'W/H' : r.marksObtained}
                </td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center' }}>{r.isAbsent || r.isWithheld ? '—' : `${pct}%`}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{r.grade}</td>
                <td style={{ padding: '6px 10px', border: '1px solid #ddd', color: '#555', fontStyle: 'italic' }}>{r.remarks ?? '—'}</td>
              </tr>
            )
          })}
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

      {/* SUMMARY */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
        <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 12, background: '#fafafa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11.5 }}>
            <span style={{ color: '#555' }}>Total Marks:</span><span style={{ fontWeight: 'bold' }}>{totalPossible}</span>
            <span style={{ color: '#555' }}>Marks Obtained:</span><span style={{ fontWeight: 'bold' }}>{totalObtained}</span>
            <span style={{ color: '#555' }}>Percentage:</span><span style={{ fontWeight: 'bold' }}>{Number(percentage).toFixed(1)}%</span>
          </div>
        </div>
        <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 12, background: '#fafafa' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11.5 }}>
            <span style={{ color: '#555' }}>Position in Class:</span>
            <span style={{ fontWeight: 'bold' }}>{rank ? `${ordinal(rank)} / ${totalRanked}` : '—'}</span>
            <span style={{ color: '#555' }}>Result:</span>
            <span style={{ fontWeight: 'bold', color: status.color }}>{status.label}</span>
            <span style={{ color: '#555' }}>Grade:</span>
            <span style={{ fontWeight: 'bold' }}>{overallGrade}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <div style={{ border: `2px solid ${status.color}`, background: status.bg, color: status.color, fontWeight: 'bold', fontSize: 20, padding: '8px 32px', borderRadius: 6 }}>
          {status.label}
        </div>
      </div>

      {/* GRADE SCALE */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 4, padding: 8, marginBottom: 14, fontSize: 10 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#374151' }}>Grade Scale:</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {GRADE_SCALE.map((g) => (
            <span key={g.grade}><b>{g.grade}</b> = {g.range}</span>
          ))}
          <span><b>ABS</b> = Absent</span>
          <span><b>W/H</b> = Withheld</span>
        </div>
        <div style={{ marginTop: 4, color: '#555' }}>Subjects Passed: {subjectsPassed} &nbsp;|&nbsp; Subjects Failed: {subjectsFailed}</div>
      </div>

      {/* REMARKS */}
      <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 12, marginBottom: 14, fontSize: 11 }}>
        <div>Remarks: <span style={{ display: 'inline-block', minWidth: 400, borderBottom: '1px solid #999' }}>&nbsp;</span></div>
      </div>

      {/* SIGNATURES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14, textAlign: 'center', fontSize: 11 }}>
        {['Class Teacher', 'Principal'].map((role) => (
          <div key={role}>
            <div style={{ borderBottom: '1px solid #333', marginBottom: 4, paddingBottom: 24 }}></div>
            <div style={{ fontWeight: 'bold' }}>{role}</div>
            <div style={{ color: '#555' }}>Signature &amp; Stamp</div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #ccc', paddingTop: 8, textAlign: 'center', fontSize: 10, color: '#777' }}>
        <div>Issue Date: {format(new Date(), 'dd MMM yyyy')} — This DMC is computer generated.</div>
        <div style={{ marginTop: 2, fontWeight: 'bold' }}>{school?.name}</div>
      </div>
    </div>
  )
}
