'use client'

import Barcode from '@/components/shared/Barcode'

export type IdCardStudent = {
  firstName: string
  lastName: string
  registrationNumber: string
  studentCNIC?: string | null
  photoBase64?: string | null
  guardianName: string
  class: { name: string; section: string }
}

export type IdCardSchool = {
  name: string
  address?: string | null
  phone?: string | null
  logoUrl?: string | null
}

export function StudentIdCard({
  student,
  school,
  session,
}: {
  student: IdCardStudent
  school: IdCardSchool
  session: string
}) {
  const fullName = `${student.firstName} ${student.lastName}`

  return (
    <div
      style={{
        width: '85.6mm',
        height: '54mm',
        border: '1px solid #000',
        borderRadius: '4mm',
        padding: '2.5mm',
        fontSize: '7pt',
        fontFamily: 'Arial, sans-serif',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2mm', borderBottom: '1px solid #ccc', paddingBottom: '1mm', marginBottom: '1.5mm' }}>
        {school.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={school.logoUrl} alt="" style={{ height: '8mm', width: '8mm', objectFit: 'contain' }} />
        ) : (
          <div style={{ height: '8mm', width: '8mm', background: '#e2e8f0', borderRadius: '1mm' }} />
        )}
        <div style={{ fontSize: '8pt', fontWeight: 700, flex: 1, lineHeight: 1.2 }}>{school.name}</div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', gap: '2.5mm' }}>
        <div style={{ flexShrink: 0 }}>
          {student.photoBase64 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={student.photoBase64}
              alt=""
              style={{ width: '15mm', height: '18mm', objectFit: 'cover', borderRadius: '1.5mm', border: '1px solid #999' }}
            />
          ) : (
            <div style={{
              width: '15mm', height: '18mm', background: '#e2e8f0', borderRadius: '1.5mm',
              border: '1px solid #999', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16pt', color: '#94a3b8',
            }}>
              👤
            </div>
          )}
        </div>
        <div style={{ flex: 1, lineHeight: 1.35 }}>
          <div><b>Name:</b> {fullName}</div>
          <div><b>Father:</b> {student.guardianName}</div>
          <div><b>Class:</b> {student.class.name}-{student.class.section}</div>
          <div><b>Reg#:</b> {student.registrationNumber}</div>
          {student.studentCNIC && <div><b>CNIC:</b> {student.studentCNIC}</div>}
          <div><b>Session:</b> {session}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #ccc', marginTop: '1.5mm', paddingTop: '1mm' }}>
        <div style={{ transform: 'scale(0.75)', transformOrigin: 'left center', marginBottom: '0.5mm' }}>
          <Barcode value={student.registrationNumber} height={18} width={1} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '6pt', color: '#444' }}>
          <span>{school.phone || ''}</span>
          <span style={{ textAlign: 'right', maxWidth: '55%' }}>{school.address || ''}</span>
        </div>
      </div>
    </div>
  )
}

export function IdCardPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @page { size: A4; margin: 1cm; }
        @media print {
          .no-print { display: none !important; }
          .idcard-page { page-break-after: always; }
          .idcard-page:last-child { page-break-after: auto; }
        }
        .idcard-grid {
          display: grid;
          grid-template-columns: repeat(2, 85.6mm);
          grid-template-rows: repeat(2, 54mm);
          gap: 5mm;
        }
      `}</style>
      <div className="no-print" style={{ padding: 10, background: '#fffbeb', border: '1px solid #fbbf24', margin: 10, fontSize: 13 }}>
        Print dialog will open automatically.{' '}
        <button type="button" onClick={() => window.print()} style={{ color: '#2563eb', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
          Click here to print
        </button>
      </div>
      {children}
    </>
  )
}
