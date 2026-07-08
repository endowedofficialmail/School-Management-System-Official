'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getVouchersByClass } from '@/lib/actions/vouchers'
import { VoucherDocument } from '@/components/vouchers/VoucherDocument'

export default function PrintClassVouchersPage() {
  const params = useParams()
  const classId = Number(params.classId)
  const month = Number(params.month)
  const year = Number(params.year)

  const [data, setData] = useState<Awaited<ReturnType<typeof getVouchersByClass>> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVouchersByClass(classId, month, year).then((d) => { setData(d); setLoading(false) })
  }, [classId, month, year])

  useEffect(() => {
    if (!loading && data && data.vouchers.length > 0) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', gap: 12 }}>
        <p style={{ fontWeight: 'bold' }}>Loading vouchers…</p>
      </div>
    )
  }

  if (!data || data.vouchers.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: 'red' }}>
        No vouchers found for this class and period.
      </div>
    )
  }

  if (!data.school?.name) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: '#b45309' }}>
        ⚠️ School name not configured. Please update school profile before printing.
      </div>
    )
  }

  return (
    <html lang="en">
      <head>
        <title>{`Class Vouchers — ${month}/${year}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; font-family: Arial, sans-serif; }
          .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin: 12px 20px; font-size: 13px; }
          .student-page { page-break-after: always; padding: 12px 20px; }
          .student-page:last-child { page-break-after: auto; }
          .cut-line { text-align: center; font-size: 10px; color: #94a3b8; margin: 10px 0; letter-spacing: 2px; border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; padding: 4px 0; }
          @media print {
            @page { margin: 8mm; size: A4; }
            .no-print { display: none !important; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        <div className="no-print">
          {data.vouchers.length} voucher{data.vouchers.length !== 1 ? 's' : ''} ready.{' '}
          <button onClick={() => window.print()} style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Click here to print
          </button>
        </div>

        {data.vouchers.map((v) => {
          const voucher = {
            voucherNumber: v.voucherNumber,
            month: v.month,
            year: v.year,
            issueDate: v.issueDate,
            dueDate: v.dueDate,
            status: v.status,
            totalAmount: Number(v.totalAmount),
            originalAmount: Number(v.originalAmount) || Number(v.totalAmount),
            appliedAdvance: Number(v.appliedAdvance),
            paidAmount: Number(v.paidAmount),
            advanceAmount: Number(v.advanceAmount),
            remainingAmount: Number(v.remainingAmount),
            paidDate: v.paidDate,
            receivedBy: v.receivedBy,
            student: v.student,
            items: v.items.map((i) => ({ description: i.description, amount: Number(i.amount) })),
            school: data.school,
          }
          return (
            <div key={v.id} className="student-page">
              <VoucherDocument voucher={voucher} copyLabel="STUDENT COPY" compact />
              <div className="cut-line">- - - - - CUT HERE - - - - -</div>
              <VoucherDocument voucher={voucher} copyLabel="SCHOOL COPY" compact />
            </div>
          )
        })}
      </body>
    </html>
  )
}
