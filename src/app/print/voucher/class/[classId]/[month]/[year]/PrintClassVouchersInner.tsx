'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getVouchersByClass } from '@/lib/actions/vouchers'
import {
  BankVoucherSheet,
  SimpleVoucherSheet,
  toPakistaniVoucherData,
} from '@/components/vouchers/PakistaniVoucherDocument'

export default function PrintClassVouchersInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const classId = Number(params.classId)
  const month = Number(params.month)
  const year = Number(params.year)
  const style = searchParams.get('style') === 'bank' ? 'bank' : 'simple'

  const [data, setData] = useState<Awaited<ReturnType<typeof getVouchersByClass>> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVouchersByClass(classId, month, year).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [classId, month, year])

  useEffect(() => {
    if (!loading && data && data.vouchers.length > 0) {
      const t = setTimeout(() => window.print(), 900)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
        Loading vouchers…
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
        School name not configured. Please update school profile before printing.
      </div>
    )
  }

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; font-family: Arial, Helvetica, sans-serif; }
        .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin: 10px; font-size: 13px; }
        .student-page { page-break-after: always; padding: 3mm; }
        .student-page:last-child { page-break-after: auto; }
        @media print {
          @page { size: A4 landscape; margin: 0.4cm; }
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .student-page { padding: 0; }
        }
      `}</style>

      <div className="no-print">
        {data.vouchers.length} voucher{data.vouchers.length !== 1 ? 's' : ''} ready ({style === 'bank' ? 'Bank 3-Copy' : 'Simple 2-Copy'}).{' '}
        <button
          type="button"
          onClick={() => window.print()}
          style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
        >
          Click here to print
        </button>
      </div>

      {data.vouchers.map((v) => {
        const voucher = toPakistaniVoucherData(v, data.school!)
        return (
          <div key={v.id} className="student-page">
            {style === 'bank' ? (
              <BankVoucherSheet data={voucher} />
            ) : (
              <SimpleVoucherSheet data={voucher} />
            )}
          </div>
        )
      })}
    </>
  )
}
