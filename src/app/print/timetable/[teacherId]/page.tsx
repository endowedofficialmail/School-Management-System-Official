'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { getTimetableForPrint, type TimetablePrintData } from '@/lib/actions/timetable'

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default function PrintTimetablePage() {
  const params = useParams()
  const teacherId = Number(params.teacherId)
  const [data, setData] = useState<TimetablePrintData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teacherId) return
    getTimetableForPrint(teacherId).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [teacherId])

  // Auto-trigger print once data is loaded
  useEffect(() => {
    if (!loading && data) {
      const timer = setTimeout(() => window.print(), 600)
      return () => clearTimeout(timer)
    }
  }, [loading, data])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        Loading timetable…
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        Timetable not found.
      </div>
    )
  }

  const { teacher, school } = data

  // Build sorted time slots and grid
  const timeSlots = Array.from(new Set(teacher.timetableEntries.map((e) => e.startTime))).sort()

  function cellEntry(day: number, time: string) {
    return teacher.timetableEntries.find((e) => e.dayOfWeek === day && e.startTime === time)
  }

  function endTime(time: string) {
    return teacher.timetableEntries.find((e) => e.startTime === time)?.endTime ?? ''
  }

  return (
    <html lang="en">
      <head>
        <title>{`Timetable — ${teacher.name}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: white; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 16px; }
          .header h1 { font-size: 18px; font-weight: bold; }
          .header p { font-size: 11px; color: #555; margin-top: 2px; }
          .title { text-align: center; margin-bottom: 12px; }
          .title h2 { font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
          .title p { font-size: 11px; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #999; padding: 5px 7px; text-align: center; vertical-align: middle; }
          th { background: #f0f0f0; font-weight: bold; font-size: 10px; text-transform: uppercase; }
          td.time-col { text-align: left; font-size: 10px; color: #555; white-space: nowrap; background: #f8f8f8; }
          td.empty { color: #ccc; }
          td.filled { font-size: 10px; line-height: 1.4; }
          td.filled strong { display: block; }
          .footer { margin-top: 28px; border-top: 1px solid #ccc; padding-top: 12px; }
          .footer-grid { display: flex; justify-content: space-between; gap: 20px; }
          .footer-item { flex: 1; border-bottom: 1px solid #333; padding-bottom: 4px; font-size: 10px; color: #444; }
          .print-date { text-align: right; font-size: 9px; color: #999; margin-top: 8px; }
          @media print {
            @page { margin: 15mm; }
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        `}</style>
      </head>
      <body>
        {/* Screen notice — hidden when printing */}
        <div className="no-print" style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
          The print dialog will open automatically. If it doesn&apos;t,{' '}
          <button onClick={() => window.print()} style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            click here to print
          </button>
          .
        </div>

        {/* School header */}
        <div className="header">
          <h1>{school?.name ?? 'School Name'}</h1>
          {school?.address && <p>{school.address}</p>}
          {school?.phone && <p>Tel: {school.phone}</p>}
        </div>

        {/* Report title */}
        <div className="title">
          <h2>Teacher Timetable</h2>
          <p><strong>Teacher:</strong> {teacher.name}</p>
          <p>Prepared on: {format(new Date(), 'dd MMMM yyyy')}</p>
        </div>

        {/* Timetable grid */}
        {timeSlots.length === 0 ? (
          <p style={{ textAlign: 'center', marginTop: 24, color: '#777' }}>No timetable entries found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 80 }}>Period / Time</th>
                {DAYS.map((d) => <th key={d.value}>{d.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((time) => (
                <tr key={time}>
                  <td className="time-col">
                    {/* Show period number if any entry in this row has one */}
                    {(() => {
                      const e = teacher.timetableEntries.find((en) => en.startTime === time && en.periodNumber)
                      return e ? <strong>P{e.periodNumber}</strong> : null
                    })()}
                    <span style={{ display: 'block' }}>{time}</span>
                    <span style={{ color: '#888' }}>– {endTime(time)}</span>
                  </td>
                  {DAYS.map((d) => {
                    const entry = cellEntry(d.value, time)
                    return entry ? (
                      <td key={d.value} className="filled">
                        <strong>{entry.subject.name}</strong>
                        {entry.class.name}-{entry.class.section}
                      </td>
                    ) : (
                      <td key={d.value} className="empty">—</td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer signature lines */}
        <div className="footer">
          <div className="footer-grid">
            <div className="footer-item">Prepared by: _______________</div>
            <div className="footer-item">Approved by: _______________</div>
            <div className="footer-item">Date: _______________</div>
          </div>
          <p className="print-date">Printed: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
        </div>
      </body>
    </html>
  )
}
