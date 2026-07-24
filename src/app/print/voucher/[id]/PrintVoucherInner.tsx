'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { getVoucherById } from '@/lib/actions/vouchers'
import {
  BankVoucherSheet,
  SimpleVoucherSheet,
  toPakistaniVoucherData,
} from '@/components/vouchers/PakistaniVoucherDocument'

export default function PrintVoucherInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = Number(params.id)
  const style = searchParams.get('style') === 'bank' ? 'bank' : 'simple'

  const [data, setData] = useState<Awaited<ReturnType<typeof getVoucherById>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getVoucherById(id).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (!loading && data) {
      const t = setTimeout(() => window.print(), 700)
      return () => clearTimeout(t)
    }
  }, [loading, data])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial' }}>
        Loading voucher…
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial', color: 'red' }}>
        Voucher not found.
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

  const voucher = toPakistaniVoucherData(data, data.school)

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; font-family: Arial, Helvetica, sans-serif; }
        .no-print { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 10px 14px; margin: 10px; font-size: 13px; }
        .sheet { padding: 4mm; }
        @media print {
          @page { size: A4 landscape; margin: 0.4cm; }
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .sheet { padding: 0; }
        }
      `}</style>

      <div className="no-print">
        Print dialog will open automatically ({style === 'bank' ? 'Bank 3-Copy' : 'Simple 2-Copy'}).{' '}
        <button
          type="button"
          onClick={() => window.print()}
          style={{ color: '#2563eb', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
        >
          Click here to print
        </button>
      </div>

      <div className="sheet">
        {style === 'bank' ? (
          <BankVoucherSheet data={voucher} />
        ) : (
          <SimpleVoucherSheet data={voucher} />
        )}
      </div>
    </>
  )
}
