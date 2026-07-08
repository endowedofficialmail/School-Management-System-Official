'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Printer } from 'lucide-react'
import { VoucherStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRs } from '@/components/vouchers/VoucherDocument'
import { getPortalFeeVouchers } from '@/lib/actions/portal'
import { cn } from '@/lib/utils'

type Voucher = Awaited<ReturnType<typeof getPortalFeeVouchers>>[number]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const STATUS_CLASS: Record<VoucherStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700 hover:bg-red-100',
  PAID: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  PARTIAL: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  CANCELLED: 'bg-slate-100 text-slate-500 hover:bg-slate-100',
}

export default function FeeVoucherList({ studentId, limit }: { studentId: number; limit?: number }) {
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPortalFeeVouchers(studentId).then((data) => {
      setVouchers(limit ? data.slice(0, limit) : data)
      setLoading(false)
    })
  }, [studentId, limit])

  const outstanding = vouchers.reduce((sum, v) => sum + Math.max(0, Number(v.totalAmount) - Number(v.paidAmount)), 0)

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Fee Vouchers</CardTitle>
          {outstanding > 0 && (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
              Outstanding {formatRs(outstanding)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading vouchers...</p>
        ) : vouchers.length === 0 ? (
          <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
            No fee vouchers generated yet
          </p>
        ) : (
          vouchers.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
              <div className="min-w-0">
                <p className="font-semibold">{MONTHS[v.month - 1]} {v.year}</p>
                <p className="font-mono text-xs text-muted-foreground">{v.voucherNumber}</p>
                <p className="text-sm font-semibold">{formatRs(Number(v.totalAmount))}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge className={cn('text-xs', STATUS_CLASS[v.status])}>{v.status}</Badge>
                <Link
                  href={`/print/voucher/${v.id}`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-9 gap-1.5')}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </Link>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
