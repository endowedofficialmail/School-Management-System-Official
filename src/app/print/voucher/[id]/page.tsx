'use client'

import { Suspense } from 'react'
import PrintVoucherInner from './PrintVoucherInner'

export default function PrintVoucherPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Arial' }}>Loading…</div>}>
      <PrintVoucherInner />
    </Suspense>
  )
}
