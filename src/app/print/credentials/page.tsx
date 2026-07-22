'use client'

import { useEffect, useState } from 'react'

type Slip = {
  studentName: string
  registrationNumber: string
  className: string
  studentEmail: string
  studentPassword: string
  parentEmail: string
  parentPassword: string
}

export default function PrintCredentialsPage() {
  const [slips, setSlips] = useState<Slip[]>([])
  const [schoolName, setSchoolName] = useState('School Management')

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('portal-credentials-print')
      if (raw) setSlips(JSON.parse(raw) as Slip[])
    } catch {
      setSlips([])
    }
    fetch('/api/lms/enabled')
      .catch(() => null)
    // School name from a lightweight approach
    document.title = 'Portal Credentials'
    setTimeout(() => window.print(), 400)
  }, [])

  useEffect(() => {
    // Try to get school name from document or leave default
    const meta = document.querySelector('meta[name="school-name"]')
    if (meta?.getAttribute('content')) {
      setSchoolName(meta.getAttribute('content') || schoolName)
    }
  }, [schoolName])

  if (!slips.length) {
    return (
      <div className="p-8 text-center text-sm text-slate-600">
        No credentials to print. Go back and click Print Credentials again.
      </div>
    )
  }

  return (
    <div className="print-credentials p-4">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        .grid-slips {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .slip {
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 12px;
          font-size: 11px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
      `}</style>

      <button
        type="button"
        className="no-print mb-4 rounded bg-slate-900 px-3 py-2 text-sm text-white"
        onClick={() => window.print()}
      >
        Print
      </button>

      <div className="grid-slips">
        {slips.map((s, i) => (
          <div key={i} className="slip">
            <p className="font-bold text-sm">{schoolName}</p>
            <p className="font-semibold tracking-wide uppercase text-[10px] text-slate-600">
              Portal Access Credentials
            </p>
            <hr className="my-2 border-slate-300" />
            <p><b>Student:</b> {s.studentName}</p>
            <p><b>Class:</b> {s.className || '—'}</p>
            <p><b>Reg#:</b> {s.registrationNumber}</p>
            <div className="mt-2">
              <p className="font-semibold">STUDENT LOGIN:</p>
              <p>Email: {s.studentEmail}</p>
              <p>Password: {s.studentPassword}</p>
            </div>
            <div className="mt-2">
              <p className="font-semibold">PARENT LOGIN:</p>
              <p>Email: {s.parentEmail || '—'}</p>
              <p>Password: {s.parentPassword || '—'}</p>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">
              Please change password on first login.
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
