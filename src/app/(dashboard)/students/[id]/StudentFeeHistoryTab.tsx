'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Printer, Receipt, CheckCircle, Wrench } from 'lucide-react'
import { VoucherStatus } from '@prisma/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

import RecordPaymentDialog from '@/components/shared/RecordPaymentDialog'
import { formatRs } from '@/components/vouchers/VoucherDocument'
import {
  getVouchers, manuallyAdjustAdvanceBalance, type VoucherWithDetails,
} from '@/lib/actions/vouchers'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STATUS_BADGE: Record<VoucherStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700 hover:bg-red-100',
  PAID: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  PARTIAL: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  ADVANCE: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  CANCELLED: 'bg-slate-100 text-slate-500 hover:bg-slate-100',
}

const STATUS_LABEL: Record<VoucherStatus, string> = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  PARTIAL: 'Partial',
  ADVANCE: 'Advance Paid',
  CANCELLED: 'Cancelled',
}

export default function StudentFeeHistoryTab({
  studentId,
  advanceBalance: initialAdvance = 0,
  isAdmin = false,
  adminId = 0,
  adminName = 'Admin',
}: {
  studentId: number
  advanceBalance?: number
  isAdmin?: boolean
  adminId?: number
  adminName?: string
}) {
  const [vouchers, setVouchers] = useState<VoucherWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [paidDialogOpen, setPaidDialogOpen] = useState(false)
  const [target, setTarget] = useState<VoucherWithDetails | null>(null)
  const [advanceBalance, setAdvanceBalance] = useState(initialAdvance)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const load = useCallback(() => {
    getVouchers({ studentId }).then((data) => { setVouchers(data); setLoading(false) })
  }, [studentId])

  useEffect(() => { load() }, [load])
  useEffect(() => { setAdvanceBalance(initialAdvance) }, [initialAdvance])

  const totalBilled = vouchers.reduce((s, v) => s + Number(v.totalAmount), 0)
  const totalPaid = vouchers.reduce((s, v) => s + Number(v.paidAmount), 0)
  const outstanding = vouchers
    .filter((v) => v.status === 'UNPAID' || v.status === 'PARTIAL')
    .reduce((s, v) => {
      if (v.status === 'PARTIAL') {
        return s + (Number(v.remainingAmount) || Math.max(0, Number(v.totalAmount) - Number(v.paidAmount)))
      }
      return s + Number(v.totalAmount)
    }, 0)
  const advanceCredit = vouchers
    .filter((v) => v.status === 'ADVANCE')
    .reduce((s, v) => s + Number(v.advanceAmount), 0)

  function openRecordPayment(v: VoucherWithDetails) {
    setTarget(v)
    setPaidDialogOpen(true)
  }

  function remainingDisplay(v: VoucherWithDetails) {
    if (v.status === 'PARTIAL') {
      return Number(v.remainingAmount) || Math.max(0, Number(v.totalAmount) - Number(v.paidAmount))
    }
    if (v.status === 'UNPAID') return Number(v.totalAmount)
    if (v.status === 'ADVANCE') return 0
    return Math.max(0, Number(v.totalAmount) - Number(v.paidAmount))
  }

  async function handleAdjust() {
    const amount = parseFloat(adjustAmount)
    if (isNaN(amount) || amount === 0) { toast.error('Enter a non-zero adjustment amount'); return }
    if (!adjustReason.trim()) { toast.error('Reason is required'); return }
    setAdjusting(true)
    try {
      const result = await manuallyAdjustAdvanceBalance(
        studentId,
        amount,
        adjustReason.trim(),
        adminId,
        adminName
      )
      setAdvanceBalance(result.newBalance)
      toast.success(`Advance balance updated to ${formatRs(result.newBalance)}`)
      setAdjustOpen(false)
      setAdjustAmount('')
      setAdjustReason('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to adjust balance')
    } finally {
      setAdjusting(false)
    }
  }

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
  }

  if (vouchers.length === 0 && advanceBalance <= 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Receipt className="h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-700">No fee vouchers generated yet</p>
          <p className="text-sm text-muted-foreground">Vouchers will appear here once generated from Fee Vouchers.</p>
          <Link href="/fees/vouchers" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Go to Fee Vouchers
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {advanceBalance > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-blue-800">💙 Advance Balance: {formatRs(advanceBalance)}</p>
            <p className="text-sm text-blue-700">
              This credit will be automatically applied when next month&apos;s voucher is generated.
            </p>
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline" className="gap-1.5 border-blue-300 text-blue-800" onClick={() => setAdjustOpen(true)}>
              <Wrench className="h-3.5 w-3.5" />
              Adjust Advance Balance
            </Button>
          )}
        </div>
      )}

      {isAdmin && advanceBalance <= 0 && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdjustOpen(true)}>
            <Wrench className="h-3.5 w-3.5" />
            Adjust Advance Balance
          </Button>
        </div>
      )}

      <div className={cn('grid gap-3', (advanceCredit > 0 || advanceBalance > 0) ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3')}>
        {[
          { label: 'Total Billed', value: formatRs(totalBilled), cls: 'text-slate-800' },
          { label: 'Total Paid', value: formatRs(totalPaid), cls: 'text-emerald-700' },
          { label: 'Outstanding Balance', value: formatRs(outstanding), cls: outstanding > 0 ? 'text-red-700 font-bold' : 'text-slate-600' },
          ...(advanceBalance > 0 || advanceCredit > 0
            ? [{ label: 'Advance Credit', value: formatRs(Math.max(advanceBalance, advanceCredit)), cls: 'text-blue-700 font-bold' }]
            : []),
        ].map((c) => (
          <Card key={c.label} className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={cn('text-lg font-bold', c.cls)}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {vouchers.length > 0 && (
        <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Month</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Voucher #</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Paid</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Remaining</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vouchers.map((v) => {
                const remaining = remainingDisplay(v)
                return (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-700">{MONTHS[v.month - 1]} {v.year}</td>
                    <td className="px-4 py-3 font-mono font-bold text-xs">{v.voucherNumber}</td>
                    <td className="px-4 py-3 text-right">{formatRs(Number(v.totalAmount))}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatRs(Number(v.paidAmount))}</td>
                    <td className={cn(
                      'px-4 py-3 text-right font-medium',
                      v.status === 'PARTIAL' && 'text-orange-700',
                      v.status === 'ADVANCE' && 'text-blue-700',
                      v.status === 'UNPAID' && 'text-red-700',
                    )}>
                      {v.status === 'ADVANCE'
                        ? `+${formatRs(Number(v.advanceAmount))}`
                        : formatRs(remaining)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={cn('text-xs', STATUS_BADGE[v.status])}>{STATUS_LABEL[v.status]}</Badge>
                      {Number(v.appliedAdvance) > 0 && (
                        <p className="text-[10px] text-blue-600 mt-0.5">Adv. applied {formatRs(Number(v.appliedAdvance))}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/print/voucher/${v.id}`} target="_blank" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 px-2 gap-1 text-xs')}>
                          <Printer className="h-3 w-3" /> Voucher
                        </Link>
                        {(v.status === 'PAID' || v.status === 'PARTIAL' || v.status === 'ADVANCE') && (
                          <Link href={`/print/voucher/receipt/${v.id}`} target="_blank" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 px-2 gap-1 text-xs')}>
                            <Receipt className="h-3 w-3" /> Receipt
                          </Link>
                        )}
                        {(v.status === 'UNPAID' || v.status === 'PARTIAL') && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => openRecordPayment(v)}>
                            <CheckCircle className="h-3 w-3" /> Pay
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <RecordPaymentDialog
        open={paidDialogOpen}
        onClose={() => { setPaidDialogOpen(false); setTarget(null) }}
        onSuccess={() => load()}
        advanceBalance={advanceBalance}
        voucher={target ? {
          id: target.id,
          voucherNumber: target.voucherNumber,
          totalAmount: Number(target.totalAmount),
          paidAmount: Number(target.paidAmount),
          remainingAmount: Number(target.remainingAmount) || Math.max(0, Number(target.totalAmount) - Number(target.paidAmount)),
          status: target.status,
          student: {
            id: studentId,
            firstName: target.student.firstName,
            lastName: target.student.lastName,
          },
        } : null}
        paymentHistory={target?.paymentHistory?.map((p) => ({
          id: p.id,
          amountPaid: Number(p.amountPaid),
          paymentDate: p.paymentDate,
          receivedBy: p.receivedBy,
          paymentMode: p.paymentMode,
          notes: p.notes,
        }))}
      />

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Advance Balance</DialogTitle>
            <DialogDescription>
              Current Balance: <b>{formatRs(advanceBalance)}</b>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Adjustment Amount</Label>
              <Input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Positive to add, negative to deduct"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason *</Label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Audit trail reason"
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={adjusting}>
              {adjusting ? 'Applying…' : 'Apply Adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
