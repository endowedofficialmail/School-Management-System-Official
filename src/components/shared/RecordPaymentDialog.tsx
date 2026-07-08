'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatRs } from '@/components/vouchers/VoucherDocument'
import { getStudentAdvanceBalance, markVoucherPaid } from '@/lib/actions/vouchers'

export type PaymentHistoryItem = {
  id: number
  amountPaid: number | string
  paymentDate: Date | string
  receivedBy: string
  paymentMode: string
  notes?: string | null
}

export interface RecordPaymentDialogProps {
  voucher: {
    id: number
    voucherNumber: string
    totalAmount: number
    paidAmount: number
    remainingAmount: number
    status: string
    student: {
      id?: number
      firstName: string
      lastName: string
    }
  } | null
  paymentHistory?: PaymentHistoryItem[]
  /** Preloaded advance balance; if omitted and student.id present, fetched on open */
  advanceBalance?: number
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const PAYMENT_MODES = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank Transfer', label: 'Bank Transfer' },
  { value: 'Cheque', label: 'Cheque' },
  { value: 'Online Transfer', label: 'Online Transfer (JazzCash/Easypaisa/etc)' },
  { value: 'Advance Adjustment', label: 'Advance Adjustment' },
] as const

const STATUS_LABEL: Record<string, string> = {
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  PARTIAL: 'Partial',
  ADVANCE: 'Advance Paid',
  CANCELLED: 'Cancelled',
}

export default function RecordPaymentDialog({
  voucher,
  paymentHistory = [],
  advanceBalance: advanceBalanceProp,
  open,
  onClose,
  onSuccess,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState('')
  const [paidDate, setPaidDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [receivedBy, setReceivedBy] = useState('')
  const [paymentMode, setPaymentMode] = useState('Cash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [advanceBalance, setAdvanceBalance] = useState(0)

  useEffect(() => {
    if (!open || !voucher) return
    const balance = voucher.remainingAmount > 0
      ? voucher.remainingAmount
      : Math.max(0, voucher.totalAmount - voucher.paidAmount)
    setAmount(balance > 0 ? String(balance) : '')
    setPaidDate(format(new Date(), 'yyyy-MM-dd'))
    setReceivedBy('')
    setPaymentMode('Cash')
    setReferenceNumber('')
    setNotes('')
    setError('')
    setHistoryOpen(false)

    if (typeof advanceBalanceProp === 'number') {
      setAdvanceBalance(advanceBalanceProp)
    } else if (voucher.student.id) {
      getStudentAdvanceBalance(voucher.student.id).then(setAdvanceBalance).catch(() => setAdvanceBalance(0))
    } else {
      setAdvanceBalance(0)
    }
  }, [open, voucher, advanceBalanceProp])

  const totalFee = voucher?.totalAmount ?? 0
  const previouslyPaid = voucher?.paidAmount ?? 0
  const balanceDue = voucher
    ? (voucher.remainingAmount > 0
      ? voucher.remainingAmount
      : Math.max(0, voucher.totalAmount - voucher.paidAmount))
    : 0

  const thisPayment = parseFloat(amount)
  const hasValidAmount = !isNaN(thisPayment) && thisPayment > 0
  const newTotalPaid = previouslyPaid + (hasValidAmount ? thisPayment : 0)
  const remainingAfter = Math.max(0, totalFee - newTotalPaid)
  const advanceAfter = Math.max(0, newTotalPaid - totalFee)

  const showReference = paymentMode !== 'Cash' && paymentMode !== 'Advance Adjustment'

  const liveStatus = useMemo(() => {
    if (!hasValidAmount) return null
    if (newTotalPaid < totalFee) {
      return {
        tone: 'partial' as const,
        text: `⚠️ Partial Payment — ${formatRs(remainingAfter)} will remain outstanding`,
      }
    }
    if (newTotalPaid === totalFee) {
      return {
        tone: 'full' as const,
        text: '✓ Full Payment — Voucher will be marked as PAID',
      }
    }
    return {
      tone: 'advance' as const,
      text: `↑ Advance Payment — ${formatRs(advanceAfter)} credit (will be noted)`,
    }
  }, [hasValidAmount, newTotalPaid, totalFee, remainingAfter, advanceAfter])

  function applyAdvanceCredit() {
    if (advanceBalance <= 0 || balanceDue <= 0) return
    const applyAmount = Math.min(advanceBalance, balanceDue)
    setAmount(String(applyAmount))
    setPaymentMode('Advance Adjustment')
    setReceivedBy('Advance Credit')
    setNotes((prev) =>
      prev.includes('Applied from advance credit balance')
        ? prev
        : [prev, 'Applied from advance credit balance'].filter(Boolean).join(' — ')
    )
    setError('')
  }

  function validate(): string | null {
    if (!hasValidAmount) return 'Amount must be greater than 0'
    if (thisPayment > totalFee * 2) {
      return `Amount cannot exceed ${formatRs(totalFee * 2)} (2× total fee)`
    }
    if (paymentMode === 'Advance Adjustment' && thisPayment > advanceBalance + 0.001) {
      return `Cannot apply more than available advance credit (${formatRs(advanceBalance)})`
    }
    if (!receivedBy.trim()) return 'Received By is required'
    return null
  }

  async function handleSubmit() {
    if (!voucher) return
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const result = await markVoucherPaid({
        voucherId: voucher.id,
        amountPaid: thisPayment,
        paidDate: new Date(paidDate),
        receivedBy: receivedBy.trim(),
        paymentMode,
        referenceNumber: showReference ? (referenceNumber.trim() || undefined) : undefined,
        notes: notes.trim() || undefined,
      })
      const studentName = `${voucher.student.firstName} ${voucher.student.lastName}`
      toast.success(
        `Payment of ${formatRs(thisPayment)} recorded for ${studentName} — ${STATUS_LABEL[result.status] ?? result.status}`
      )
      if (result.message) toast.message(result.message)
      onSuccess()
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to record payment'
      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = hasValidAmount && receivedBy.trim().length > 0 && !submitting

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          {voucher && (
            <DialogDescription>
              {voucher.student.firstName} {voucher.student.lastName} — {voucher.voucherNumber}
            </DialogDescription>
          )}
        </DialogHeader>

        {voucher && (
          <div className="space-y-4 py-1">
            {advanceBalance > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
                <p className="text-sm font-semibold text-blue-800">💙 Advance Credit Available</p>
                <p className="text-sm text-blue-700">
                  This student has {formatRs(advanceBalance)} advance credit from previous overpayments.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-800 hover:bg-blue-100"
                  onClick={applyAdvanceCredit}
                >
                  Apply Advance Credit
                </Button>
              </div>
            )}

            {paymentHistory.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium bg-slate-50 hover:bg-slate-100 transition-colors"
                  onClick={() => setHistoryOpen((o) => !o)}
                >
                  <span>Previous Payments ({paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''})</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    {historyOpen ? 'Hide' : 'Show'}
                    {historyOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                </button>
                {historyOpen && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-t bg-white">
                        <th className="px-3 py-1.5 text-left font-semibold">Date</th>
                        <th className="px-3 py-1.5 text-right font-semibold">Amount</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Received By</th>
                        <th className="px-3 py-1.5 text-left font-semibold">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {paymentHistory.map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-1.5">{format(new Date(p.paymentDate), 'dd MMM yyyy')}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{formatRs(Number(p.amountPaid))}</td>
                          <td className="px-3 py-1.5">{p.receivedBy}</td>
                          <td className="px-3 py-1.5">{p.paymentMode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-slate-50 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Total Fee</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{formatRs(totalFee)}</p>
              </div>
              <div className="rounded-lg border bg-emerald-50 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-emerald-600">Already Paid</p>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">{formatRs(previouslyPaid)}</p>
              </div>
              <div className="rounded-lg border bg-red-50 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-red-600">Balance Due</p>
                <p className="text-sm font-bold text-red-700 mt-0.5">{formatRs(balanceDue)}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pay-amount">Amount Being Paid (Rs.)</Label>
              <Input
                id="pay-amount"
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError('') }}
                className="h-11 text-lg font-semibold"
              />
            </div>

            {hasValidAmount && (
              <div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-1.5">
                <p className="font-semibold text-slate-800 mb-1">💰 Payment Summary</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Total Fee:</span><span>{formatRs(totalFee)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Previously Paid:</span><span>{formatRs(previouslyPaid)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">This Payment:</span><span className="font-medium">{formatRs(thisPayment)}</span></div>
                <div className="border-t my-1.5" />
                <div className="flex justify-between font-medium"><span>Total Paid:</span><span>{formatRs(newTotalPaid)}</span></div>
                <div className="flex justify-between font-medium text-orange-700">
                  <span>Remaining:</span>
                  <span>{formatRs(remainingAfter)}</span>
                </div>
              </div>
            )}

            {liveStatus && (
              <div className={cn(
                'rounded-lg border px-3 py-2.5 text-sm font-medium',
                liveStatus.tone === 'partial' && 'border-orange-200 bg-orange-50 text-orange-800',
                liveStatus.tone === 'full' && 'border-emerald-200 bg-emerald-50 text-emerald-800',
                liveStatus.tone === 'advance' && 'border-blue-200 bg-blue-50 text-blue-800',
              )}>
                {liveStatus.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Mode *</Label>
                <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v ?? 'Cash')}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Received By *</Label>
              <Input
                value={receivedBy}
                onChange={(e) => { setReceivedBy(e.target.value); setError('') }}
                className="h-9"
                placeholder="Name of person receiving payment"
              />
            </div>

            {showReference && (
              <div className="space-y-1.5">
                <Label>Reference #</Label>
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="h-9"
                  placeholder="Transaction ID or Cheque #"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes"
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Recording…' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
