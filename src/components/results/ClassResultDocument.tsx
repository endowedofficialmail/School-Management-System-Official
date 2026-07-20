import type { ClassResultData } from '@/lib/actions/exams'

type School = { name: string; address: string | null; phone: string | null; logoUrl: string | null } | null

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default function ClassResultDocument({
  data,
  school,
  classLabel,
}: {
  data: ClassResultData
  school: School
  classLabel: string
}) {
  const { exam, subjects, rows, totalStudents, passCount, failCount, absentCount, classAverage, highest, lowest, subjectAverages } = data

  if (!school?.name) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#b45309' }}>
        ⚠️ School name not configured. Please update school profile before printing.
      </div>
    )
  }

  const schoolInitials = (school?.name ?? 'S').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 10.5, color: '#1a1a1a', width: '100%', margin: '0 auto', padding: 16 }}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', borderBottom: '3px double #1a1a1a', paddingBottom: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {school?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt="logo" style={{ width: 46, height: 46, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 'bold', flexShrink: 0 }}>
              {schoolInitials}
            </div>
          )}
          <div>
            <div style={{ fontSize: 19, fontWeight: 'bold', color: '#1e3a5f' }}>{school?.name ?? 'School Name'}</div>
            {school?.address && <div style={{ fontSize: 10, color: '#555' }}>{school.address}{school.phone ? ` | Tel: ${school.phone}` : ''}</div>}
          </div>
        </div>
      </div>

      {/* TITLE */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', color: '#1e3a5f' }}>Class Result Sheet</div>
        <div style={{ height: 1, background: '#1e3a5f', width: 140, margin: '4px auto' }} />
      </div>

      {/* META */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 11 }}>
        <span><b>Exam:</b> {exam.name}</span>
        <span><b>Academic Year:</b> {exam.academicYear.name}</span>
        <span><b>Class:</b> {classLabel}</span>
        <span><b>Total Students:</b> {totalStudents}</span>
      </div>

      {/* TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: 9.5 }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: 'white' }}>
            <th rowSpan={2} style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'center' }}>Rank</th>
            <th rowSpan={2} style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'left' }}>Student Name</th>
            <th rowSpan={2} style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'center' }}>Reg#</th>
            {subjects.map((s) => (
              <th key={s.id} style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{s.name}</th>
            ))}
            <th rowSpan={2} style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'center' }}>Total</th>
            <th rowSpan={2} style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'center' }}>%</th>
            <th rowSpan={2} style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'center' }}>Grade</th>
            <th rowSpan={2} style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'center' }}>Result</th>
          </tr>
          <tr style={{ background: '#2c5282', color: 'white' }}>
            {subjectAverages.map((s) => (
              <th key={s.subjectId} style={{ padding: '3px 6px', border: '1px solid #1e3a5f', textAlign: 'center', fontWeight: 'normal' }}>/{s.totalMarks}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.student.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
              <td style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>
                {r.rank ? `${MEDALS[r.rank] ?? ''} ${r.rank}` : '—'}
              </td>
              <td style={{ padding: '4px 6px', border: '1px solid #ddd' }}>{r.student.firstName} {r.student.lastName}</td>
              <td style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center', fontFamily: 'monospace', fontSize: 9 }}>{r.student.registrationNumber}</td>
              {r.subjectMarks.map((m) => (
                <td key={m.subjectId} style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center', color: m.isAbsent ? '#b45309' : m.isWithheld ? '#475569' : undefined, fontWeight: m.isAbsent || m.isWithheld ? 'bold' : undefined }}>
                  {m.isAbsent ? 'ABS' : m.isWithheld ? 'W/H' : m.marksObtained ?? '—'}
                </td>
              ))}
              <td style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{r.totalObtained ?? '—'}/{r.totalPossible ?? '—'}</td>
              <td style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{r.percentage !== null ? `${r.percentage.toFixed(1)}%` : '—'}</td>
              <td style={{ padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{r.grade ?? '—'}</td>
              <td style={{
                padding: '4px 6px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold',
                color: r.resultStatus === 'Pass' ? '#166534' : r.resultStatus === 'Fail' ? '#991b1b' : r.resultStatus === 'Absent' ? '#b45309' : '#475569',
              }}>
                {r.resultStatus === 'Pending' ? '—' : r.resultStatus}
              </td>
            </tr>
          ))}
          {/* Class average footer */}
          <tr style={{ background: '#1e3a5f', color: 'white', fontWeight: 'bold' }}>
            <td colSpan={3} style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'right' }}>Class Average:</td>
            {subjectAverages.map((s) => (
              <td key={s.subjectId} style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{s.avgObtained}</td>
            ))}
            <td style={{ padding: '5px 6px', border: '1px solid #1e3a5f' }}></td>
            <td style={{ padding: '5px 6px', border: '1px solid #1e3a5f', textAlign: 'center' }}>{classAverage}%</td>
            <td colSpan={2} style={{ padding: '5px 6px', border: '1px solid #1e3a5f' }}></td>
          </tr>
        </tbody>
      </table>

      {/* SUMMARY */}
      <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 10, marginBottom: 14, fontSize: 11 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#1e3a5f' }}>SUMMARY:</div>
        <div>Total Students: {totalStudents} &nbsp;|&nbsp; Passed: {passCount} &nbsp;|&nbsp; Failed: {failCount} &nbsp;|&nbsp; Absent: {absentCount}</div>
        <div style={{ marginTop: 2 }}>Highest: {highest.toFixed(1)}% &nbsp;|&nbsp; Lowest: {lowest.toFixed(1)}% &nbsp;|&nbsp; Class Average: {classAverage}%</div>
      </div>

      {/* SIGNATURES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, textAlign: 'center', fontSize: 11 }}>
        {['Class Teacher', 'Controller of Exams', 'Principal'].map((role) => (
          <div key={role}>
            <div style={{ borderBottom: '1px solid #333', marginBottom: 4, paddingBottom: 24 }}></div>
            <div style={{ fontWeight: 'bold' }}>{role}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
