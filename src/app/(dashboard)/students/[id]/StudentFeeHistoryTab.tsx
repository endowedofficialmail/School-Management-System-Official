'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Printer, Receipt, CheckCircle } from 'lucide-react'
import { VoucherStatus } from '@prisma/client'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { formatRs } from '@/components/vouchers/VoucherDocument'
import { getVouchers, markVoucherPaid, type VoucherWithDetails } from '@/lib/actions/vouchers'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STATUS_BADGE: Record<VoucherStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700 hover:bg-red-100',
  PAID: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  PARTIAL: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  CANCELLED: 'bg-slate-100 text-slate-500 hover:bg-slate-100',
}

export default function StudentFeeHistoryTab({ studentId }: { studentId: number }) {
  const [vouchers, setVouchers] = useState<VoucherWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [paidDialogOpen, setPaidDialogOpen] = useState(false)
  const [target, setTarget] = useState<VoucherWithDetails | null>(null)
  const [paidForm, setPaidForm] = useState({ paidAmount: '', paidDate: format(new Date(), 'yyyy-MM-dd'), receivedBy: '', notes: '' })
  const [markingPaid, setMarkingPaid] = useState(false)

  const load = useCallback(() => {
    getVouchers({ studentId }).then((data) => { setVouchers(data); setLoading(false) })
  }, [studentId])

  useEffect(() => { load() }, [load])

  const totalBilled = vouchers.reduce((s, v) => s + Number(v.totalAmount), 0)
  const totalPaid = vouchers.reduce((s, v) => s + Number(v.paidAmount), 0)
  const outstanding = totalBilled - totalPaid

  function openMarkPaid(v: VoucherWithDetails) {
    setTarget(v)
    const remaining = Number(v.totalAmount) - Number(v.paidAmount)
    setPaidForm({ paidAmount: String(remaining), paidDate: format(new Date(), 'yyyy-MM-dd'), receivedBy: '', notes: '' })
    setPaidDialogOpen(true)
  }

  async function handleMarkPaid() {
    if (!target || !paidForm.receivedBy.trim()) { toast.error('Received By is required'); return }
    const amount = parseFloat(paidForm.paidAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    setMarkingPaid(true)
    try {
      await markVoucherPaid({
        voucherId: target.id,
        paidAmount: amount,
        paidDate: new Date(paidForm.paidDate),
        receivedBy: paidForm.receivedBy,
        notes: paidForm.notes || undefined,
      })
      toast.success('Payment recorded')
      setPaidDialogOpen(false)
      load()
    } catch { toast.error('Failed to record payment') }
    finally { setMarkingPaid(false) }
  }

  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
  }

  if (vouchers.length === 0) {
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
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Billed', value: formatRs(totalBilled), cls: 'text-slate-800' },
          { label: 'Total Paid', value: formatRs(totalPaid), cls: 'text-emerald-700' },
          { label: 'Outstanding', value: formatRs(outstanding), cls: outstanding > 0 ? 'text-red-700' : 'text-slate-600' },
        ].map((c) => (
          <Card key={c.label} className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={cn('text-lg font-bold', c.cls)}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Voucher list */}
      <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Month/Year</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Voucher #</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Paid</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {vouchers.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-700">{MONTHS[v.month - 1]} {v.year}</td>
                <td className="px-4 py-3 font-mono font-bold text-xs">{v.voucherNumber}</td>
                <td className="px-4 py-3 text-right">{formatRs(Number(v.totalAmount))}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatRs(Number(v.paidAmount))}</td>
                <td className="px-4 py-3 text-center">
                  <Badge className={cn('text-xs', STATUS_BADGE[v.status])}>{v.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/print/voucher/${v.id}`} target="_blank" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 px-2 gap-1 text-xs')}>
                      <Printer className="h-3 w-3" /> Voucher
                    </Link>
                    {(v.status === 'PAID' || v.status === 'PARTIAL') && (
                      <Link href={`/print/voucher/receipt/${v.id}`} target="_blank" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 px-2 gap-1 text-xs')}>
                        <Receipt className="h-3 w-3" /> Receipt
                      </Link>
                    )}
                    {v.status === 'UNPAID' && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs" onClick={() => openMarkPaid(v)}>
                        <CheckCircle className="h-3 w-3" /> Pay
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mark Paid Dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            {target && (
              <DialogDescription>
                {target.voucherNumber} — Total: {formatRs(Number(target.totalAmount))}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Amount Paid *</Label>
              <Input type="number" value={paidForm.paidAmount} onChange={(e) => setPaidForm((f) => ({ ...f, paidAmount: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date *</Label>
              <Input type="date" value={paidForm.paidDate} onChange={(e) => setPaidForm((f) => ({ ...f, paidDate: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>Received By *</Label>
              <Input value={paidForm.receivedBy} onChange={(e) => setPaidForm((f) => ({ ...f, receivedBy: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={paidForm.notes} onChange={(e) => setPaidForm((f) => ({ ...f, notes: e.target.value }))} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkPaid} disabled={markingPaid}>{markingPaid ? 'Saving…' : 'Mark as Paid'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
