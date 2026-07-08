'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getVoucherById } from '@/lib/actions/vouchers'
import { ReceiptDocument } from '@/components/vouchers/VoucherDocument'

export default function PrintReceiptPage() {
  const params = useParams()
  const id = Number(params.id)
  const [data, setData] = useState<Awaited<ReturnType<typeof getVoucherById>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVoucherById(id).then((d) => { setData(d); setLoading(false) })
  }, [id])

  useEffect(() => {
    if (!loading && data && (data.status === 'PAID' || data.status === 'PARTIAL')) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>Loading receipt…</div>
  }

  if (!data) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: 'red' }}>Voucher not found.</div>
  }

  if (data.status !== 'PAID' && data.status !== 'PARTIAL') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: '#64748b' }}>
        This voucher has not been paid yet.
      </div>
    )
  }

  const voucher = {
    voucherNumber: data.voucherNumber,
    month: data.month,
    year: data.year,
    issueDate: data.issueDate,
    dueDate: data.dueDate,
    status: data.status,
    totalAmount: Number(data.totalAmount),
    paidAmount: Number(data.paidAmount),
    paidDate: data.paidDate,
    receivedBy: data.receivedBy,
    notes: data.notes,
    student: data.student,
    items: data.items.map((i) => ({ description: i.description, amount: Number(i.amount) })),
    school: data.school,
  }

  return (
    <html lang="en">
      <head>
        <title>{`Receipt — ${data.voucherNumber}`}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; padding: 20px; }
          .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 13px; font-family: Arial; }
          @media print {
            @page { margin: 12mm; size: A4; }
            .no-print { display: none !important; }
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
        <ReceiptDocument voucher={voucher} />
      </body>
    </html>
  )
}
