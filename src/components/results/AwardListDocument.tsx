import type { AwardListData } from '@/lib/actions/exams'

type School = { name: string; address: string | null; phone: string | null; logoUrl: string | null } | null
type Exam = { name: string; academicYear: { name: string } }

export default function AwardListDocument({
  data,
  school,
  exam,
  classLabel,
}: {
  data: AwardListData
  school: School
  exam: Exam
  classLabel: string
}) {
  const { subject, rows, totalMarksHint, topper, average, passCount, failCount } = data

  if (!school?.name) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#b45309' }}>
        ⚠️ School name not configured. Please update school profile before printing.
      </div>
    )
  }

  const schoolInitials = (school?.name ?? 'S').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: 11, color: '#1a1a1a', maxWidth: 720, margin: '0 auto', padding: 20 }}>
      {/* HEADER */}
      <div style={{ textAlign: 'center', borderBottom: '3px double #1a1a1a', paddingBottom: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {school?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt="logo" style={{ width: 50, height: 50, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 'bold', flexShrink: 0 }}>
              {schoolInitials}
            </div>
          )}
          <div>
            <div style={{ fontSize: 19, fontWeight: 'bold', color: '#1e3a5f' }}>{school?.name ?? 'School Name'}</div>
            {school?.address && <div style={{ fontSize: 10, color: '#555' }}>{school.address}</div>}
          </div>
        </div>
      </div>

      {/* TITLE */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase', color: '#1e3a5f' }}>Award List</div>
        <div style={{ height: 1, background: '#1e3a5f', width: 120, margin: '4px auto' }} />
      </div>

      {/* META */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 12, fontSize: 11, border: '1px solid #ccc', borderRadius: 4, padding: 10, background: '#fafafa' }}>
        <span><b>Exam:</b> {exam.name}</span>
        <span><b>Subject:</b> {subject.name}</span>
        <span><b>Class:</b> {classLabel}</span>
        <span><b>Total Marks:</b> {totalMarksHint ?? '—'}</span>
        <span><b>Academic Year:</b> {exam.academicYear.name}</span>
      </div>

      {/* TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 11 }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: 'white' }}>
            {['Sr.', 'Student Name', 'Reg #', 'Obtained', 'Grade'].map((h) => (
              <th key={h} style={{ padding: '7px 10px', border: '1px solid #1e3a5f', textAlign: h === 'Student Name' ? 'left' : 'center' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={r.student.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
              <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #ddd' }}>{r.student.firstName} {r.student.lastName}</td>
              <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center', fontFamily: 'monospace', fontSize: 10 }}>{r.student.registrationNumber}</td>
              <td style={{
                padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 600,
                color: r.isAbsent ? '#b45309' : r.isWithheld ? '#475569' : undefined,
              }}>
                {r.isAbsent ? 'ABS' : r.isWithheld ? 'W/H' : r.marksObtained ?? '—'}
              </td>
              <td style={{ padding: '6px 10px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }}>{r.grade ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* SUMMARY */}
      <div style={{ border: '1px solid #ccc', borderRadius: 4, padding: 10, marginBottom: 16, fontSize: 11 }}>
        <div>
          <b>Subject Topper:</b>{' '}
          {topper ? `${topper.student.firstName} ${topper.student.lastName} (${topper.marksObtained}/${topper.totalMarks} — ${Math.round((topper.marksObtained! / topper.totalMarks!) * 1000) / 10}%)` : '—'}
        </div>
        <div style={{ marginTop: 4 }}>
          <b>Subject Average:</b> {average}% &nbsp;|&nbsp; <b>Pass:</b> {passCount} &nbsp;|&nbsp; <b>Fail:</b> {failCount}
        </div>
      </div>

      {/* SIGNATURES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'center', fontSize: 11 }}>
        {['Subject Teacher', 'Controller of Exams'].map((role) => (
          <div key={role}>
            <div style={{ borderBottom: '1px solid #333', marginBottom: 4, paddingBottom: 24 }}></div>
            <div style={{ fontWeight: 'bold' }}>{role}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
