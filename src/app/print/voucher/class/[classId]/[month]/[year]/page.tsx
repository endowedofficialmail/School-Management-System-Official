'use client'

import { Suspense } from 'react'
import PrintClassVouchersInner from './PrintClassVouchersInner'

export default function PrintClassVouchersPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'Arial' }}>Loading…</div>}>
      <PrintClassVouchersInner />
    </Suspense>
  )
}
