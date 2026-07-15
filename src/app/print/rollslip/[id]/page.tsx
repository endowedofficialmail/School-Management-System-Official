'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PrintWrapper from '@/components/shared/PrintWrapper'
import { RollSlipDocument } from '@/components/rollslips/RollSlipDocument'
import { getRollSlipById, type RollSlipPrintData } from '@/lib/actions/rollslips'

export default function PrintRollSlipPage() {
  const params = useParams()
  const id = Number(params.id)
  const [data, setData] = useState<RollSlipPrintData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRollSlipById(id).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Georgia, serif' }}>
        Loading roll slip…
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Georgia, serif', color: 'red' }}>
        Roll slip not found.
      </div>
    )
  }

  if (!data.school?.name) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Georgia, serif', color: '#b45309' }}>
        School name not configured. Please update school profile before printing.
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
      <PrintWrapper>
        <div style={{ padding: '16px 20px', background: '#f8fafc', minHeight: '100vh' }}>
          <RollSlipDocument data={data} />
        </div>
      </PrintWrapper>
    </>
  )
}
