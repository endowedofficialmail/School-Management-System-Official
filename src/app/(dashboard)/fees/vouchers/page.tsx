'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus, Users, Search, MoreHorizontal, Printer, CheckCircle,
  XCircle, Trash2, Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { VoucherStatus } from '@prisma/client'
import { cn } from '@/lib/utils'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import BackButton from '@/components/shared/BackButton'
import Breadcrumb from '@/components/shared/Breadcrumb'
import { formatRs } from '@/components/vouchers/VoucherDocument'
import {
  getVouchers, getVoucherDashboardStats, generateVouchersForClass,
  generateVoucherForStudent, markVoucherPaid, cancelVoucher, deleteVoucher,
  type VoucherWithDetails,
} from '@/lib/actions/vouchers'
import { getFeeStructures } from '@/lib/actions/fees'
import { getClasses, getStudents } from '@/lib/actions/students'

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
  { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
  { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
]

const STATUS_BADGE: Record<VoucherStatus, string> = {
  UNPAID: 'bg-red-100 text-red-700 hover:bg-red-100',
  PAID: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  PARTIAL: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  CANCELLED: 'bg-slate-100 text-slate-500 hover:bg-slate-100',
}

const now = new Date()
const CURRENT_MONTH = now.getMonth() + 1
const CURRENT_YEAR = now.getFullYear()

type FeeStructure = Awaited<ReturnType<typeof getFeeStructures>>[number]
type ClassItem = Awaited<ReturnType<typeof getClasses>>[number]
type StudentItem = Awaited<ReturnType<typeof getStudents>>[number]

export default function FeeVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherWithDetails[]>([])
  const [stats, setStats] = useState({ totalVouchers: 0, paidCount: 0, unpaidCount: 0, pendingAmount: 0 })
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterMonth, setFilterMonth] = useState(String(CURRENT_MONTH))
  const [filterYear, setFilterYear] = useState(String(CURRENT_YEAR))
  const [filterClass, setFilterClass] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  // Dialogs
  const [classDialogOpen, setClassDialogOpen] = useState(false)
  const [studentDialogOpen, setStudentDialogOpen] = useState(false)
  const [paidDialogOpen, setPaidDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [target, setTarget] = useState<VoucherWithDetails | null>(null)
  const [lastGeneratedClass, setLastGeneratedClass] = useState<{ classId: number; month: number; year: number } | null>(null)

  // Generate class form
  const [classForm, setClassForm] = useState({
    classId: '', month: String(CURRENT_MONTH), year: String(CURRENT_YEAR),
    dueDate: format(new Date(CURRENT_YEAR, CURRENT_MONTH - 1, 10), 'yyyy-MM-dd'),
    feeStructureIds: [] as number[],
  })
  const [generatingClass, setGeneratingClass] = useState(false)

  // Generate student form
  const [studentForm, setStudentForm] = useState({
    studentId: '', month: String(CURRENT_MONTH), year: String(CURRENT_YEAR),
    dueDate: format(new Date(CURRENT_YEAR, CURRENT_MONTH - 1, 10), 'yyyy-MM-dd'),
    items: [{ description: '', amount: '' }],
  })
  const [studentSearch, setStudentSearch] = useState('')
  const [studentOptions, setStudentOptions] = useState<StudentItem[]>([])
  const [generatingStudent, setGeneratingStudent] = useState(false)

  // Mark paid form
  const [paidForm, setPaidForm] = useState({ paidAmount: '', paidDate: format(new Date(), 'yyyy-MM-dd'), receivedBy: '', notes: '' })
  const [markingPaid, setMarkingPaid] = useState(false)

  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [v, s] = await Promise.all([
      getVouchers({
        month: Number(filterMonth),
        year: Number(filterYear),
        classId: filterClass ? Number(filterClass) : undefined,
        status: filterStatus ? (filterStatus as VoucherStatus) : undefined,
      }),
      getVoucherDashboardStats(Number(filterMonth), Number(filterYear)),
    ])
    setVouchers(v)
    setStats({ totalVouchers: s.totalVouchers, paidCount: s.paidCount, unpaidCount: s.unpaidCount, pendingAmount: s.pendingAmount })
    setLoading(false)
  }, [filterMonth, filterYear, filterClass, filterStatus])

  useEffect(() => {
    Promise.all([getClasses(), getFeeStructures()]).then(([cls, fs]) => {
      setClasses(cls)
      setFeeStructures(fs)
    })
    loadData()
  }, [loadData])

  // Student search
  useEffect(() => {
    if (!studentSearch.trim()) { setStudentOptions([]); return }
    const t = setTimeout(() => {
      getStudents({ search: studentSearch, status: 'ACTIVE' }).then(setStudentOptions)
    }, 300)
    return () => clearTimeout(t)
  }, [studentSearch])

  const filteredVouchers = useMemo(() => {
    if (!search.trim()) return vouchers
    const q = search.toLowerCase()
    return vouchers.filter((v) =>
      v.voucherNumber.toLowerCase().includes(q) ||
      `${v.student.firstName} ${v.student.lastName}`.toLowerCase().includes(q) ||
      v.student.registrationNumber.toLowerCase().includes(q)
    )
  }, [vouchers, search])

  const classPreviewTotal = useMemo(() => {
    return feeStructures
      .filter((f) => classForm.feeStructureIds.includes(f.id))
      .reduce((s, f) => s + Number(f.amount), 0)
  }, [feeStructures, classForm.feeStructureIds])

  const classFeeStructures = useMemo(() => {
    if (!classForm.classId) return feeStructures
    return feeStructures.filter((f) => !f.classId || f.classId === Number(classForm.classId))
  }, [feeStructures, classForm.classId])

  const studentItemsTotal = useMemo(() => {
    return studentForm.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
  }, [studentForm.items])

  function toggleFeeStructure(id: number) {
    setClassForm((f) => ({
      ...f,
      feeStructureIds: f.feeStructureIds.includes(id)
        ? f.feeStructureIds.filter((x) => x !== id)
        : [...f.feeStructureIds, id],
    }))
  }

  async function handleGenerateClass() {
    if (!classForm.classId) { toast.error('Select a class'); return }
    if (classForm.feeStructureIds.length === 0) { toast.error('Select at least one fee structure'); return }
    setGeneratingClass(true)
    try {
      const result = await generateVouchersForClass({
        classId: Number(classForm.classId),
        month: Number(classForm.month),
        year: Number(classForm.year),
        dueDate: new Date(classForm.dueDate),
        feeStructureIds: classForm.feeStructureIds,
      })
      toast.success(`${result.created} vouchers created, ${result.skipped} already existed`)
      setLastGeneratedClass({ classId: Number(classForm.classId), month: Number(classForm.month), year: Number(classForm.year) })
      setClassDialogOpen(false)
      loadData()
    } catch { toast.error('Failed to generate vouchers') }
    finally { setGeneratingClass(false) }
  }

  async function handleGenerateStudent() {
    if (!studentForm.studentId) { toast.error('Select a student'); return }
    const items = studentForm.items
      .filter((i) => i.description && i.amount)
      .map((i) => ({ description: i.description, amount: parseFloat(i.amount) }))
    if (items.length === 0) { toast.error('Add at least one fee item'); return }
    setGeneratingStudent(true)
    try {
      await generateVoucherForStudent({
        studentId: Number(studentForm.studentId),
        month: Number(studentForm.month),
        year: Number(studentForm.year),
        dueDate: new Date(studentForm.dueDate),
        items,
      })
      toast.success('Voucher generated')
      setStudentDialogOpen(false)
      loadData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate voucher')
    } finally { setGeneratingStudent(false) }
  }

  function openMarkPaid(v: VoucherWithDetails) {
    setTarget(v)
    const remaining = Number(v.totalAmount) - Number(v.paidAmount)
    setPaidForm({
      paidAmount: String(remaining),
      paidDate: format(new Date(), 'yyyy-MM-dd'),
      receivedBy: '',
      notes: '',
    })
    setPaidDialogOpen(true)
  }

  async function handleMarkPaid() {
    if (!target) return
    if (!paidForm.receivedBy.trim()) { toast.error('Received By is required'); return }
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
      loadData()
    } catch { toast.error('Failed to record payment') }
    finally { setMarkingPaid(false) }
  }

  async function handleCancel() {
    if (!target) return
    setActionLoading(true)
    try {
      await cancelVoucher(target.id)
      toast.success('Voucher cancelled')
      setCancelDialogOpen(false)
      loadData()
    } catch { toast.error('Failed to cancel') }
    finally { setActionLoading(false) }
  }

  async function handleDelete() {
    if (!target) return
    setActionLoading(true)
    try {
      await deleteVoucher(target.id)
      toast.success('Voucher deleted')
      setDeleteDialogOpen(false)
      loadData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    } finally { setActionLoading(false) }
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fees', href: '/fees' },
        { label: 'Vouchers' },
      ]} />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fee Vouchers</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Generate and print fee vouchers for students</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setClassDialogOpen(true)} className="gap-2">
            <Users className="h-4 w-4" />
            Generate for Class
          </Button>
          <Button variant="outline" onClick={() => setStudentDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Generate for Student
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Vouchers', value: stats.totalVouchers, cls: 'text-slate-800' },
          { label: 'Paid', value: stats.paidCount, cls: 'text-emerald-700' },
          { label: 'Unpaid', value: stats.unpaidCount, cls: 'text-red-700' },
          { label: 'Pending Amount', value: formatRs(stats.pendingAmount), cls: 'text-orange-700' },
        ].map((c) => (
          <Card key={c.label} className="shadow-sm">
            <CardContent className="p-4 text-center">
              <p className={cn('text-xl font-bold', c.cls)}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterMonth} onValueChange={(v) => setFilterMonth(v ?? String(CURRENT_MONTH))}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={(v) => setFilterYear(v ?? String(CURRENT_YEAR))}>
          <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={(v) => setFilterClass(v ?? '')}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name} – {c.section}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? '')}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            {(['UNPAID', 'PAID', 'PARTIAL', 'CANCELLED'] as VoucherStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search voucher # or student…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8" />
        </div>
      </div>

      {/* Bulk print after generation */}
      {lastGeneratedClass && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
          <span className="text-emerald-800">Vouchers generated successfully.</span>
          <Link
            href={`/print/voucher/class/${lastGeneratedClass.classId}/${lastGeneratedClass.month}/${lastGeneratedClass.year}`}
            target="_blank"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2 border-emerald-300 text-emerald-800')}
          >
            <Printer className="h-3.5 w-3.5" />
            Print All Vouchers
          </Link>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Voucher #</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Class</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">Month/Year</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Paid</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                ))}</tr>
              ))
            ) : filteredVouchers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                  No vouchers found. Generate vouchers for a class to get started.
                </td>
              </tr>
            ) : (
              filteredVouchers.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs">{v.voucherNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {v.student.firstName} {v.student.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.student.class.name} – {v.student.class.section}</td>
                  <td className="px-4 py-3 text-slate-600">{MONTHS[v.month - 1]?.label} {v.year}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatRs(Number(v.totalAmount))}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRs(Number(v.paidAmount))}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={cn('text-xs', STATUS_BADGE[v.status])}>{v.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 w-8 p-0')}>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => window.open(`/print/voucher/${v.id}`, '_blank')}
                        >
                          <Printer className="h-4 w-4" />
                          Print Voucher
                        </DropdownMenuItem>
                        {(v.status === 'PAID' || v.status === 'PARTIAL') && (
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => window.open(`/print/voucher/receipt/${v.id}`, '_blank')}
                          >
                            <Receipt className="h-4 w-4" />
                            Print Receipt
                          </DropdownMenuItem>
                        )}
                        {v.status !== 'PAID' && v.status !== 'CANCELLED' && (
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => openMarkPaid(v)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Mark as Paid
                          </DropdownMenuItem>
                        )}
                        {v.status === 'UNPAID' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="flex items-center gap-2 cursor-pointer text-orange-600"
                              onClick={() => { setTarget(v); setCancelDialogOpen(true) }}
                            >
                              <XCircle className="h-4 w-4" />
                              Cancel
                            </DropdownMenuItem>
                          </>
                        )}
                        {(v.status === 'UNPAID' || v.status === 'CANCELLED') && (
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer text-red-600"
                            onClick={() => { setTarget(v); setDeleteDialogOpen(true) }}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Generate Class Dialog */}
      <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Vouchers for Class</DialogTitle>
            <DialogDescription>Create fee vouchers for all active students in a class.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select value={classForm.classId} onValueChange={(v) => setClassForm((f) => ({ ...f, classId: v ?? '', feeStructureIds: [] }))}>
                <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select class…" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name} – {c.section}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month *</Label>
                <Select value={classForm.month} onValueChange={(v) => setClassForm((f) => ({ ...f, month: v ?? '' }))}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year *</Label>
                <Input type="number" value={classForm.year} onChange={(e) => setClassForm((f) => ({ ...f, year: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date *</Label>
              <Input type="date" value={classForm.dueDate} onChange={(e) => setClassForm((f) => ({ ...f, dueDate: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label>Fee Structures *</Label>
              <div className="rounded-lg border p-3 space-y-2 max-h-48 overflow-y-auto">
                {classFeeStructures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No fee structures found.</p>
                ) : classFeeStructures.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={classForm.feeStructureIds.includes(f.id)}
                      onChange={() => toggleFeeStructure(f.id)}
                      className="rounded"
                    />
                    <span className="flex-1">{f.name}</span>
                    <span className="text-muted-foreground">{formatRs(Number(f.amount))}</span>
                  </label>
                ))}
              </div>
              {classForm.feeStructureIds.length > 0 && (
                <p className="text-sm font-medium text-primary">
                  Total per student: {formatRs(classPreviewTotal)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClassDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateClass} disabled={generatingClass}>
              {generatingClass ? 'Generating…' : 'Generate Vouchers'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Student Dialog */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Voucher for Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Search Student *</Label>
              <Input placeholder="Type student name or reg#…" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="h-9" />
              {studentOptions.length > 0 && (
                <div className="rounded-lg border max-h-36 overflow-y-auto">
                  {studentOptions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors',
                        studentForm.studentId === String(s.id) && 'bg-primary/10 font-medium'
                      )}
                      onClick={() => { setStudentForm((f) => ({ ...f, studentId: String(s.id) })); setStudentSearch(`${s.firstName} ${s.lastName}`) }}
                    >
                      {s.firstName} {s.lastName} <span className="text-muted-foreground text-xs">({s.registrationNumber})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select value={studentForm.month} onValueChange={(v) => setStudentForm((f) => ({ ...f, month: v ?? '' }))}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" value={studentForm.year} onChange={(e) => setStudentForm((f) => ({ ...f, year: e.target.value }))} className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={studentForm.dueDate} onChange={(e) => setStudentForm((f) => ({ ...f, dueDate: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-2">
              <Label>Fee Items</Label>
              {studentForm.items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input placeholder="Description" value={item.description} onChange={(e) => {
                    const items = [...studentForm.items]
                    items[idx] = { ...items[idx], description: e.target.value }
                    setStudentForm((f) => ({ ...f, items }))
                  }} className="h-9 flex-1" />
                  <Input type="number" placeholder="Amount" value={item.amount} onChange={(e) => {
                    const items = [...studentForm.items]
                    items[idx] = { ...items[idx], amount: e.target.value }
                    setStudentForm((f) => ({ ...f, items }))
                  }} className="h-9 w-28" />
                  {studentForm.items.length > 1 && (
                    <Button variant="ghost" size="sm" className="h-9 px-2 text-red-500" onClick={() => {
                      setStudentForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
                    }}>×</Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setStudentForm((f) => ({ ...f, items: [...f.items, { description: '', amount: '' }] }))}>
                Add Item
              </Button>
              <p className="text-sm font-medium">Total: {formatRs(studentItemsTotal)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateStudent} disabled={generatingStudent}>
              {generatingStudent ? 'Generating…' : 'Generate Voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={paidDialogOpen} onOpenChange={setPaidDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            {target && (
              <DialogDescription>
                {target.student.firstName} {target.student.lastName} — {target.voucherNumber} — Total: {formatRs(Number(target.totalAmount))}
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
              <Input value={paidForm.receivedBy} onChange={(e) => setPaidForm((f) => ({ ...f, receivedBy: e.target.value }))} className="h-9" placeholder="Staff name" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={paidForm.notes} onChange={(e) => setPaidForm((f) => ({ ...f, notes: e.target.value }))} className="h-9" placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaidDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMarkPaid} disabled={markingPaid}>
              {markingPaid ? 'Saving…' : 'Mark as Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Voucher</DialogTitle>
            <DialogDescription>
              Cancel voucher <b>{target?.voucherNumber}</b>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionLoading}>
              {actionLoading ? 'Cancelling…' : 'Cancel Voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Voucher</DialogTitle>
            <DialogDescription>
              Permanently delete <b>{target?.voucherNumber}</b>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Keep</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading}>
              {actionLoading ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
