'use client'

import { format } from 'date-fns'
import type { RollSlipPrintData } from '@/lib/actions/rollslips'

const DEFAULT_INSTRUCTIONS = [
  'This slip must be presented at the examination hall',
  'Roll number must be written on answer sheet',
  'Mobile phones are not allowed in the exam hall',
]

function fmtDate(d: Date | string) {
  return format(new Date(d), 'dd MMM yyyy')
}

function fmtDay(d: Date | string) {
  return format(new Date(d), 'EEEE')
}

function fmtTimeRange(start: string, end: string) {
  return `${start}–${end}`
}

type RollSlipDocumentProps = {
  data: RollSlipPrintData
  copyLabel?: string
  compact?: boolean
}

export function RollSlipDocument({ data, copyLabel, compact }: RollSlipDocumentProps) {
  const { slip, school } = data
  const { student, exam, issuedBy } = slip
  const fullName = `${student.firstName} ${student.lastName}`
  const schoolName = school?.name ?? 'School Name'
  const schoolInitials = schoolName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const schedule = exam.datesheetEntries
  const subjectCount = new Set(schedule.map((e) => e.subjectId)).size
  const customInstructions = slip.instructions
    ? slip.instructions.split('\n').map((l) => l.trim()).filter(Boolean)
    : []

  const pad = compact ? 14 : 20
  const titleSize = compact ? 13 : 15

  return (
    <div
      style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: compact ? 11 : 12,
        color: '#1a1a1a',
        maxWidth: 800,
        margin: '0 auto',
        padding: pad,
        border: '2px solid #334155',
        borderRadius: 4,
        position: 'relative',
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {/* Watermark */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 48,
          fontWeight: 'bold',
          color: 'rgba(148,163,184,0.12)',
          transform: 'rotate(-35deg)',
          pointerEvents: 'none',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {schoolName}
      </div>

      {!slip.isValid && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: compact ? 52 : 72,
              fontWeight: 'bold',
              color: 'rgba(220,38,38,0.35)',
              transform: 'rotate(-25deg)',
              border: '6px solid rgba(220,38,38,0.45)',
              padding: '8px 32px',
              letterSpacing: 8,
            }}
          >
            INVALIDATED
          </div>
        </div>
      )}

      {copyLabel && (
        <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 'bold', color: '#64748b', marginBottom: 8, letterSpacing: 2 }}>
          {copyLabel}
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1e293b', paddingBottom: 12, marginBottom: 14, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 4 }}>
          {school?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt="logo" style={{ width: compact ? 48 : 60, height: compact ? 48 : 60, objectFit: 'contain' }} />
          ) : (
            <div style={{
              width: compact ? 44 : 56, height: compact ? 44 : 56, borderRadius: '50%',
              background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: compact ? 16 : 20, fontWeight: 'bold',
            }}>
              {schoolInitials}
            </div>
          )}
          <div>
            <div style={{ fontSize: compact ? 18 : 22, fontWeight: 'bold', color: '#0f172a' }}>{schoolName}</div>
            {(school?.address || school?.phone) && (
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                {[school?.address, school?.phone ? `Tel: ${school.phone}` : null].filter(Boolean).join(' | ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: titleSize, fontWeight: 'bold', letterSpacing: 2, textTransform: 'uppercase' }}>
          Roll Number Slip / Admit Card
        </div>
        <div style={{ fontSize: 11, marginTop: 6, color: '#334155' }}>
          {exam.name} — {exam.academicYear.name}
        </div>
        <div style={{ fontSize: 10, marginTop: 2, color: '#64748b' }}>
          Exam Period: {fmtDate(exam.startDate)} to {fmtDate(exam.endDate)}
        </div>
      </div>

      {/* Student info table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: compact ? 10 : 11 }}>
        <tbody>
          {[
            ['Roll Number', slip.rollNumber, true],
            ['Student Name', fullName, false],
            ['Registration No', student.registrationNumber, false],
            ['Class', `${student.class.name} - Section ${student.class.section}`, false],
            ["Father's Name", student.guardianName, false],
            ['Venue', slip.venue || 'As per school notice', false],
          ].map(([label, value, highlight]) => (
            <tr key={String(label)} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '6px 10px', fontWeight: 'bold', width: '35%', background: '#f8fafc', color: '#475569' }}>
                {label}
              </td>
              <td style={{
                padding: '6px 10px',
                fontWeight: highlight ? 'bold' : 'normal',
                fontSize: highlight ? (compact ? 16 : 20) : undefined,
                fontFamily: highlight ? 'monospace' : 'inherit',
                color: highlight ? '#0f172a' : '#111',
                border: highlight ? '2px solid #1e3a5f' : undefined,
                letterSpacing: highlight ? 1 : undefined,
              }}>
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Schedule */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 'bold', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
          Examination Schedule
          {schedule.length > 0 && (
            <span style={{ fontWeight: 'normal', textTransform: 'none', color: '#64748b', marginLeft: 8, fontSize: 10 }}>
              ({schedule.length} paper{schedule.length !== 1 ? 's' : ''} across {subjectCount} subject{subjectCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: compact ? 9 : 10 }}>
          <thead>
            <tr style={{ background: '#1e3a5f', color: 'white' }}>
              {['Date', 'Day', 'Subject', 'Time'].map((h) => (
                <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 'bold' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '10px 8px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                  Schedule will be communicated separately
                </td>
              </tr>
            ) : (
              schedule.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '5px 8px' }}>{fmtDate(entry.date)}</td>
                  <td style={{ padding: '5px 8px' }}>{fmtDay(entry.date)}</td>
                  <td style={{ padding: '5px 8px', fontWeight: 500 }}>{entry.subject.name}</td>
                  <td style={{ padding: '5px 8px' }}>{fmtTimeRange(entry.startTime, entry.endTime)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Instructions */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 'bold', fontSize: 11, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
          Instructions
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: compact ? 9 : 10, lineHeight: 1.6 }}>
          {[...DEFAULT_INSTRUCTIONS, ...customInstructions].map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '2px solid #1e293b', paddingTop: 10, fontSize: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <span>Issued By: <strong>{issuedBy.name}</strong></span>
          <span>Issue Date: <strong>{fmtDate(slip.issuedAt)}</strong></span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #94a3b8', marginTop: 32, paddingTop: 4 }}>Controller of Exams</div>
            <div style={{ fontSize: 9, color: '#64748b' }}>Signature &amp; Stamp</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ borderTop: '1px solid #94a3b8', marginTop: 32, paddingTop: 4 }}>Principal</div>
            <div style={{ fontSize: 9, color: '#64748b' }}>Signature &amp; Stamp</div>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 9, color: '#94a3b8' }}>
          {schoolName} — This slip is computer generated
        </div>
      </div>
    </div>
  )
}
