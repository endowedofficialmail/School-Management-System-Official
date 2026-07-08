'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getVoucherById } from '@/lib/actions/vouchers'
import { VoucherDocument } from '@/components/vouchers/VoucherDocument'

export default function PrintVoucherPage() {
  const params = useParams()
  const id = Number(params.id)
  const [data, setData] = useState<Awaited<ReturnType<typeof getVoucherById>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVoucherById(id).then((d) => { setData(d); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (!loading && data) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>Loading voucher…</div>
  }
  if (!data) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: 'red' }}>Voucher not found.</div>
  }

  const voucher = {
    voucherNumber: data.voucherNumber,
    month: data.month,
    year: data.year,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    status: data.status,
    totalAmount: Number(data.totalAmount),
    student: data.student,
    items: data.items.map((i) => ({ description: i.description, amount: Number(i.amount) })),
    school: data.school,
  }

  return (
    <html lang="en">
      <head>
        <title>{`Voucher ${data.voucherNumber}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; padding: 16px; }
          .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; font-family: Arial; }
          @media print {
            @page { margin: 10mm; size: A4; }
            .no-print { display: none !important; }
            body { padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        <div className="no-print">
          Print dialog will open automatically.{' '}
          <button onClick={() => window.print()} style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
            Click here to print
          </button>
        </div>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          <VoucherDocument voucher={voucher} />
        </div>
      </body>
    </html>
  )
}
