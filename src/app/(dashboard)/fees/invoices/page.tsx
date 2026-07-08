'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, Plus, CreditCard } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  getInvoices, generateInvoices, recordPayment, type InvoiceWithDetails,
  getFeeStructures, type FeeStructureWithClass,
} from '@/lib/actions/fees'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import BackButton from '@/components/shared/BackButton'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING:  { label: 'Pending',  cls: 'bg-yellow-100 text-yellow-700' },
  PAID:     { label: 'Paid',     cls: 'bg-emerald-100 text-emerald-700' },
  PARTIAL:  { label: 'Partial',  cls: 'bg-orange-100 text-orange-700' },
  ADVANCE:  { label: 'Advance',  cls: 'bg-blue-100 text-blue-700' },
  WAIVED:   { label: 'Waived',   cls: 'bg-slate-100 text-slate-500' },
}

const now = new Date()
const CURRENT_YEAR = now.getFullYear()
const CURRENT_MONTH = now.getMonth() + 1

// ─── Component ───────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([])
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [feeStructures, setFeeStructures] = useState<FeeStructureWithClass[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterMonth, setFilterMonth] = useState<string>(String(CURRENT_MONTH))
  const [filterYear, setFilterYear] = useState<string>(String(CURRENT_YEAR))
  const [filterClass, setFilterClass] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')

  // Generate dialog
  const [genOpen, setGenOpen] = useState(false)
  const [genFeeStructure, setGenFeeStructure] = useState('')
  const [genMonth, setGenMonth] = useState(String(CURRENT_MONTH))
  const [genYear, setGenYear] = useState(String(CURRENT_YEAR))
  const [genClassIds, setGenClassIds] = useState<number[]>([])
  const [generating, setGenerating] = useState(false)

  // Payment dialog
  const [payOpen, setPayOpen] = useState(false)
  const [payInvoice, setPayInvoice] = useState<InvoiceWithDetails | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [payReceivedBy, setPayReceivedBy] = useState('')
  const [payNotes, setPayNotes] = useState('')
  const [paying, setPaying] = useState(false)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInvoices({
        month: filterMonth !== 'ALL' ? Number(filterMonth) : undefined,
        year: filterYear ? Number(filterYear) : undefined,
        classId: filterClass !== 'ALL' ? Number(filterClass) : undefined,
        status: filterStatus !== 'ALL' ? filterStatus : undefined,
      })
      setInvoices(data)
    } finally {
      setLoading(false)
    }
  }, [filterMonth, filterYear, filterClass, filterStatus])

  useEffect(() => {
    Promise.all([getClasses(), getFeeStructures()]).then(([c, f]) => {
      setClasses(c)
      setFeeStructures(f)
    })
  }, [])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  // Generate Invoices
  function toggleGenClass(id: number) {
    setGenClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }
  function toggleAllGenClasses() {
    setGenClassIds((prev) =>
      prev.length === classes.length ? [] : classes.map((c) => c.id)
    )
  }

  async function handleGenerate() {
    if (!genFeeStructure) { toast.error('Select a fee structure'); return }
    if (genClassIds.length === 0) { toast.error('Select at least one class'); return }
    setGenerating(true)
    try {
      const result = await generateInvoices({
        feeStructureId: Number(genFeeStructure),
        month: Number(genMonth),
        year: Number(genYear),
        classIds: genClassIds,
      })
      toast.success(
        `${result.created} invoice${result.created !== 1 ? 's' : ''} created` +
        (result.skipped > 0 ? `, ${result.skipped} already existed` : '')
      )
      setGenOpen(false)
      fetchInvoices()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate invoices')
    } finally {
      setGenerating(false)
    }
  }

  // Record Payment
  function openPayDialog(inv: InvoiceWithDetails) {
    const remaining = inv.amountNum - inv.totalPaid
    setPayInvoice(inv)
    setPayAmount(String(remaining > 0 ? remaining : ''))
    setPayDate(format(new Date(), 'yyyy-MM-dd'))
    setPayReceivedBy('')
    setPayNotes('')
    setPayOpen(true)
  }

  async function handleRecordPayment() {
    if (!payInvoice) return
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount'); return }
    if (!payReceivedBy.trim()) { toast.error('Received by is required'); return }
    setPaying(true)
    try {
      await recordPayment({
        invoiceId: payInvoice.id,
        amountPaid: amount,
        paidAt: new Date(payDate),
        receivedBy: payReceivedBy.trim(),
        notes: payNotes.trim() || undefined,
      })
      toast.success('Payment recorded successfully')
      setPayOpen(false)
      fetchInvoices()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record payment')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? '...' : `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
          </p>
          </div>
        </div>
        <Button onClick={() => {
          setGenFeeStructure('')
          setGenMonth(String(CURRENT_MONTH))
          setGenYear(String(CURRENT_YEAR))
          setGenClassIds([])
          setGenOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" /> Generate Invoices
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterMonth} onValueChange={(v) => setFilterMonth(v ?? 'ALL')}>
          <SelectTrigger className="w-36 h-9">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Months</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={(v) => setFilterYear(v ?? String(CURRENT_YEAR))}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={String(CURRENT_YEAR)}>{CURRENT_YEAR}</SelectItem>
            <SelectItem value={String(CURRENT_YEAR - 1)}>{CURRENT_YEAR - 1}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterClass} onValueChange={(v) => setFilterClass(v ?? 'ALL')}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name} – {c.section}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'ALL')}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="ADVANCE">Advance</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="WAIVED">Waived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead>Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                      <Receipt className="h-7 w-7 text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">No invoices found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use &ldquo;Generate Invoices&rdquo; to create invoices for the selected period
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => {
                const status = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.PENDING
                const remaining = inv.amountNum - inv.totalPaid
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      {inv.student.firstName} {inv.student.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {inv.student.class.name} – {inv.student.class.section}
                    </TableCell>
                    <TableCell className="text-sm">{inv.feeStructure.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {fmt(inv.amountNum)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      <span className={inv.totalPaid > 0 ? 'text-emerald-600' : 'text-muted-foreground'}>
                        {fmt(inv.totalPaid)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(inv.dueDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.cls}`}>
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status !== 'PAID' && inv.status !== 'WAIVED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => openPayDialog(inv)}
                        >
                          <CreditCard className="h-3 w-3" />
                          {inv.status === 'PARTIAL'
                            ? `Pay ${fmt(remaining)}`
                            : 'Record Payment'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Generate Invoices Dialog */}
      <Dialog open={genOpen} onOpenChange={(o) => !generating && setGenOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Invoices</DialogTitle>
            <DialogDescription>
              Creates invoices for all active students in the selected classes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Fee Structure *</Label>
              <Select
                value={genFeeStructure}
                onValueChange={(v) => setGenFeeStructure(v ?? '')}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Select fee structure" />
                </SelectTrigger>
                <SelectContent>
                  {feeStructures.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name} — {fmt(Number(f.amount))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month *</Label>
                <Select value={genMonth} onValueChange={(v) => setGenMonth(v ?? String(CURRENT_MONTH))}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year *</Label>
                <Select value={genYear} onValueChange={(v) => setGenYear(v ?? String(CURRENT_YEAR))}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(CURRENT_YEAR)}>{CURRENT_YEAR}</SelectItem>
                    <SelectItem value={String(CURRENT_YEAR - 1)}>{CURRENT_YEAR - 1}</SelectItem>
                    <SelectItem value={String(CURRENT_YEAR + 1)}>{CURRENT_YEAR + 1}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Select Classes *</Label>
              <div className="border rounded-lg max-h-44 overflow-y-auto divide-y">
                <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={genClassIds.length === classes.length && classes.length > 0}
                    onChange={toggleAllGenClasses}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </label>
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={genClassIds.includes(c.id)}
                      onChange={() => toggleGenClass(c.id)}
                    />
                    <span className="text-sm">{c.name} – {c.section}</span>
                  </label>
                ))}
              </div>
              {genClassIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {genClassIds.length} class{genClassIds.length !== 1 ? 'es' : ''} selected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)} disabled={generating}>
              Cancel
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={(o) => !paying && setPayOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {payInvoice && (
            <div className="space-y-4 py-2">
              {/* Invoice summary */}
              <div className="rounded-lg bg-slate-50 border p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-medium">
                    {payInvoice.student.firstName} {payInvoice.student.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fee</span>
                  <span>{payInvoice.feeStructure.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-mono">{fmt(payInvoice.amountNum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="font-mono text-emerald-600">{fmt(payInvoice.totalPaid)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 mt-1.5">
                  <span className="font-medium">Remaining</span>
                  <span className="font-mono font-semibold text-orange-600">
                    {fmt(payInvoice.amountNum - payInvoice.totalPaid)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-amount">Amount Paid (Rs.) *</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min={1}
                  max={payInvoice.amountNum - payInvoice.totalPaid}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-date">Payment Date *</Label>
                <Input
                  id="pay-date"
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-received">Received By *</Label>
                <Input
                  id="pay-received"
                  placeholder="Enter staff name"
                  value={payReceivedBy}
                  onChange={(e) => setPayReceivedBy(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-notes">Notes</Label>
                <textarea
                  id="pay-notes"
                  rows={2}
                  placeholder="Optional notes"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 outline-none resize-none transition-colors"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)} disabled={paying}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={paying}>
              {paying ? 'Saving...' : 'Save Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
