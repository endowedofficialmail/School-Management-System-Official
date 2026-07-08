'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, Printer, TrendingUp, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  getOutstandingVouchers, getAdvancePaymentCredits, getStudentsWithAdvanceCredit,
} from '@/lib/actions/vouchers'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import BackButton from '@/components/shared/BackButton'
import RecordPaymentDialog, { type PaymentHistoryItem } from '@/components/shared/RecordPaymentDialog'

function fmt(n: number) {
  return `Rs. ${n.toLocaleString('en-PK')}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type OutstandingRow = Awaited<ReturnType<typeof getOutstandingVouchers>>[number]
type AdvanceRow = Awaited<ReturnType<typeof getAdvancePaymentCredits>>[number]
type StudentAdvanceRow = Awaited<ReturnType<typeof getStudentsWithAdvanceCredit>>[number]
type OutstandingVoucher = OutstandingRow['vouchers'][number]

export default function OutstandingPage() {
  const [data, setData] = useState<OutstandingRow[]>([])
  const [advances, setAdvances] = useState<AdvanceRow[]>([])
  const [studentCredits, setStudentCredits] = useState<StudentAdvanceRow[]>([])
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [classFilter, setClassFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentTarget, setPaymentTarget] = useState<{
    voucher: OutstandingVoucher
    student: OutstandingRow['student']
  } | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const filters = {
        classId: classFilter !== 'ALL' ? Number(classFilter) : undefined,
      }
      const [result, advanceResult, creditResult] = await Promise.all([
        getOutstandingVouchers(filters),
        getAdvancePaymentCredits(filters),
        getStudentsWithAdvanceCredit(filters),
      ])
      setData(result)
      setAdvances(advanceResult)
      setStudentCredits(creditResult)
    } finally {
      setLoading(false)
    }
  }, [classFilter])

  useEffect(() => {
    getClasses().then(setClasses)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalOutstanding = data.reduce((sum, d) => sum + d.totalOutstanding, 0)
  const totalAdvance = advances.reduce((sum, a) => sum + a.advanceAmount, 0)
  const totalStudentCredits = studentCredits.reduce((sum, s) => sum + s.advanceBalance, 0)
  const netOutstanding = totalOutstanding - totalStudentCredits

  function openPayment(entry: OutstandingRow, voucher: OutstandingVoucher) {
    setPaymentTarget({ voucher, student: entry.student })
    setPaymentOpen(true)
  }

  return (
    <>
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold">Outstanding Dues Report</h1>
        <p className="text-sm">
          {format(new Date(), 'dd MMMM yyyy')}
        </p>
        <hr className="my-2" />
      </div>

      <div className="space-y-6 print:space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Outstanding Dues</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Students with unpaid or partially paid fee vouchers
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>

        <div className="flex items-center gap-3 print:hidden">
          <Select value={classFilter} onValueChange={(v) => setClassFilter(v ?? 'ALL')}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name} – {c.section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loading && (
            <span className="text-sm text-muted-foreground">
              {data.length} student{data.length !== 1 ? 's' : ''} with outstanding dues
            </span>
          )}
        </div>

        <Card className="overflow-x-auto print:shadow-none print:border">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="w-8 print:hidden">#</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Voucher Details</TableHead>
                <TableHead className="text-center">Pending</TableHead>
                <TableHead className="text-right">Total Outstanding</TableHead>
                <TableHead className="text-right print:hidden">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                        <AlertCircle className="h-7 w-7 text-emerald-600" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">No outstanding dues</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        All vouchers are paid or no vouchers exist yet
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((entry, idx) => (
                  <TableRow key={entry.student.id}>
                    <TableCell className="text-muted-foreground text-sm print:hidden">
                      {idx + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.student.firstName} {entry.student.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.student.class.name} – {entry.student.class.section}
                    </TableCell>
                    <TableCell className="text-sm space-y-1">
                      {entry.vouchers.map((v) => (
                        <div key={v.id} className="flex flex-wrap items-center gap-2">
                          <Badge className={cn(
                            'text-[10px]',
                            v.status === 'PARTIAL' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                          )}>
                            {v.status === 'PARTIAL' ? 'Partial' : 'Unpaid'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {MONTHS[v.month - 1]} {v.year}
                          </span>
                          {v.status === 'PARTIAL' ? (
                            <span className="text-xs text-orange-700">
                              {fmt(v.remainingAmount)} remaining of {fmt(v.totalAmount)} total
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-red-600">{fmt(v.totalAmount)}</span>
                          )}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                        {entry.pendingCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono font-semibold text-red-600">
                        {fmt(entry.totalOutstanding)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      <div className="flex flex-col items-end gap-1">
                        {entry.vouchers.map((v) => (
                          <Button
                            key={v.id}
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            onClick={() => openPayment(entry, v)}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Record Payment
                            {entry.vouchers.length > 1 && (
                              <span className="text-muted-foreground">({MONTHS[v.month - 1]})</span>
                            )}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {!loading && studentCredits.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Students with Advance Credit</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              These credits will be automatically applied when next month&apos;s vouchers are generated.
            </p>
            <Card className="overflow-x-auto print:shadow-none print:border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50 hover:bg-blue-50">
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="text-right">Advance Balance</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentCredits.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.firstName} {s.lastName}
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{s.registrationNumber}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.class.name} – {s.class.section}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-700">{fmt(s.advanceBalance)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(s.updatedAt), 'dd MMM yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <div className="flex justify-end">
              <p className="text-sm font-semibold text-blue-700">
                Total Advance Credits: {fmt(totalStudentCredits)}
              </p>
            </div>
          </div>
        )}

        {!loading && advances.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900">Advance Payments</h2>
            </div>
            <Card className="overflow-x-auto print:shadow-none print:border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-blue-50 hover:bg-blue-50">
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Voucher</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Advance Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advances.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {a.student.firstName} {a.student.lastName}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.student.class.name} – {a.student.class.section}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-mono text-xs">{a.voucherNumber}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {MONTHS[a.month - 1]} {a.year}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm">{fmt(a.totalAmount)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(a.paidAmount)}</TableCell>
                      <TableCell className="text-right font-semibold text-blue-700">{fmt(a.advanceAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}

        {!loading && (data.length > 0 || advances.length > 0 || studentCredits.length > 0) && (
          <div className="flex justify-end">
            <div className="rounded-xl border bg-slate-50 px-6 py-4 space-y-2 min-w-[260px]">
              <div className="flex justify-between gap-6">
                <span className="text-sm text-muted-foreground">Total Outstanding</span>
                <span className="font-bold text-red-600">{fmt(totalOutstanding)}</span>
              </div>
              {totalStudentCredits > 0 && (
                <div className="flex justify-between gap-6">
                  <span className="text-sm text-muted-foreground">Total Advance Credits</span>
                  <span className="font-bold text-blue-600">{fmt(totalStudentCredits)}</span>
                </div>
              )}
              {totalAdvance > 0 && totalStudentCredits === 0 && (
                <div className="flex justify-between gap-6">
                  <span className="text-sm text-muted-foreground">Total Advance Credits</span>
                  <span className="font-bold text-blue-600">{fmt(totalAdvance)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between gap-6">
                <span className="text-sm font-medium">Net Outstanding</span>
                <span className={cn('text-xl font-bold', netOutstanding > 0 ? 'text-red-600' : 'text-emerald-700')}>
                  {fmt(netOutstanding)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <RecordPaymentDialog
        open={paymentOpen}
        onClose={() => { setPaymentOpen(false); setPaymentTarget(null) }}
        onSuccess={() => fetchData()}
        voucher={paymentTarget ? {
          id: paymentTarget.voucher.id,
          voucherNumber: paymentTarget.voucher.voucherNumber,
          totalAmount: paymentTarget.voucher.totalAmount,
          paidAmount: paymentTarget.voucher.paidAmount,
          remainingAmount: paymentTarget.voucher.remainingAmount,
          status: paymentTarget.voucher.status,
          student: {
            id: paymentTarget.student.id,
            firstName: paymentTarget.student.firstName,
            lastName: paymentTarget.student.lastName,
          },
        } : null}
        paymentHistory={paymentTarget?.voucher.paymentHistory.map((p): PaymentHistoryItem => ({
          id: p.id,
          amountPaid: Number(p.amountPaid),
          paymentDate: p.paymentDate,
          receivedBy: p.receivedBy,
          paymentMode: p.paymentMode,
          notes: p.notes,
        }))}
      />

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:block, .print\\:block * { visibility: visible; }
          main * { visibility: visible; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </>
  )
}
