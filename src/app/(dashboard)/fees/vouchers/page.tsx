'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus, Users, Search, MoreHorizontal, Printer, CheckCircle,
  XCircle, Trash2, Receipt, FileText, Clock, TrendingUp, AlertCircle,
  School, AlertTriangle, RotateCcw, Loader2,
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
import RecordPaymentDialog from '@/components/shared/RecordPaymentDialog'
import { formatRs } from '@/components/vouchers/VoucherDocument'
import {
  getVouchers, getVoucherDashboardStats, generateVouchersForClass,
  generateVoucherForStudent, generateVouchersForSchool,
  resetVoucherPayment, cancelVoucher, deleteVoucher, getSchoolGenerationPreview,
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

const now = new Date()
const CURRENT_MONTH = now.getMonth() + 1
const CURRENT_YEAR = now.getFullYear()

type FeeStructure = Awaited<ReturnType<typeof getFeeStructures>>[number]
type ClassItem = Awaited<ReturnType<typeof getClasses>>[number]
type StudentItem = Awaited<ReturnType<typeof getStudents>>[number]
type SchoolGenResult = Awaited<ReturnType<typeof generateVouchersForSchool>>

function remainingFor(v: VoucherWithDetails) {
  if (v.status === 'PARTIAL') {
    return Number(v.remainingAmount) || Math.max(0, Number(v.totalAmount) - Number(v.paidAmount))
  }
  if (v.status === 'UNPAID') return Number(v.totalAmount)
  if (v.status === 'ADVANCE') return Number(v.advanceAmount)
  return Math.max(0, Number(v.totalAmount) - Number(v.paidAmount))
}

export default function FeeVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherWithDetails[]>([])
  const [stats, setStats] = useState({
    totalVouchers: 0, paidCount: 0, unpaidCount: 0, partialCount: 0, advanceCount: 0, pendingAmount: 0,
  })
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [loading, setLoading] = useState(true)

  const [filterMonth, setFilterMonth] = useState(String(CURRENT_MONTH))
  const [filterYear, setFilterYear] = useState(String(CURRENT_YEAR))
  const [filterClass, setFilterClass] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')

  const [classDialogOpen, setClassDialogOpen] = useState(false)
  const [studentDialogOpen, setStudentDialogOpen] = useState(false)
  const [schoolDialogOpen, setSchoolDialogOpen] = useState(false)
  const [paidDialogOpen, setPaidDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [target, setTarget] = useState<VoucherWithDetails | null>(null)
  const [lastGeneratedClass, setLastGeneratedClass] = useState<{ classId: number; month: number; year: number } | null>(null)

  const [classForm, setClassForm] = useState({
    classId: '', month: String(CURRENT_MONTH), year: String(CURRENT_YEAR),
    dueDate: format(new Date(CURRENT_YEAR, CURRENT_MONTH - 1, 10), 'yyyy-MM-dd'),
    feeStructureIds: [] as number[],
  })
  const [generatingClass, setGeneratingClass] = useState(false)

  const [studentForm, setStudentForm] = useState({
    studentId: '', month: String(CURRENT_MONTH), year: String(CURRENT_YEAR),
    dueDate: format(new Date(CURRENT_YEAR, CURRENT_MONTH - 1, 10), 'yyyy-MM-dd'),
    items: [{ description: '', amount: '' }],
  })
  const [studentSearch, setStudentSearch] = useState('')
  const [studentOptions, setStudentOptions] = useState<StudentItem[]>([])
  const [generatingStudent, setGeneratingStudent] = useState(false)

  const [schoolForm, setSchoolForm] = useState({
    month: String(CURRENT_MONTH),
    year: String(CURRENT_YEAR),
    dueDate: format(new Date(CURRENT_YEAR, CURRENT_MONTH - 1, 10), 'yyyy-MM-dd'),
    feeStructureIds: [] as number[],
  })
  const [schoolPreview, setSchoolPreview] = useState({ classCount: 0, studentCount: 0 })
  const [generatingSchool, setGeneratingSchool] = useState(false)
  const [schoolResult, setSchoolResult] = useState<SchoolGenResult | null>(null)

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
    setStats({
      totalVouchers: s.totalVouchers,
      paidCount: s.paidCount,
      unpaidCount: s.unpaidCount,
      partialCount: s.partialCount,
      advanceCount: s.advanceCount,
      pendingAmount: s.pendingAmount,
    })
    setLoading(false)
  }, [filterMonth, filterYear, filterClass, filterStatus])

  useEffect(() => {
    Promise.all([getClasses(), getFeeStructures()]).then(([cls, fs]) => {
      setClasses(cls)
      setFeeStructures(fs)
    })
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!studentSearch.trim()) { setStudentOptions([]); return }
    const t = setTimeout(() => {
      getStudents({ search: studentSearch, status: 'ACTIVE' }).then(setStudentOptions)
    }, 300)
    return () => clearTimeout(t)
  }, [studentSearch])

  useEffect(() => {
    if (!schoolDialogOpen) return
    setSchoolResult(null)
    getSchoolGenerationPreview().then(setSchoolPreview)
  }, [schoolDialogOpen])

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

  const schoolAllClassFees = useMemo(
    () => feeStructures.filter((f) => f.classId == null),
    [feeStructures]
  )

  const schoolClassFeesGrouped = useMemo(() => {
    const map = new Map<string, FeeStructure[]>()
    for (const f of feeStructures) {
      if (f.classId == null) continue
      const cls = classes.find((c) => c.id === f.classId)
      const label = cls ? `${cls.name} – ${cls.section}` : `Class #${f.classId}`
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(f)
    }
    return Array.from(map.entries())
  }, [feeStructures, classes])

  const schoolPreviewAllClassTotal = useMemo(() => {
    return schoolAllClassFees
      .filter((f) => schoolForm.feeStructureIds.includes(f.id))
      .reduce((s, f) => s + Number(f.amount), 0)
  }, [schoolAllClassFees, schoolForm.feeStructureIds])

  function toggleFeeStructure(id: number) {
    setClassForm((f) => ({
      ...f,
      feeStructureIds: f.feeStructureIds.includes(id)
        ? f.feeStructureIds.filter((x) => x !== id)
        : [...f.feeStructureIds, id],
    }))
  }

  function toggleSchoolFee(id: number) {
    setSchoolForm((f) => ({
      ...f,
      feeStructureIds: f.feeStructureIds.includes(id)
        ? f.feeStructureIds.filter((x) => x !== id)
        : [...f.feeStructureIds, id],
    }))
  }

  function toggleSelectAllSchoolFees(checked: boolean) {
    setSchoolForm((f) => ({
      ...f,
      feeStructureIds: checked ? feeStructures.map((fs) => fs.id) : [],
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

  async function handleGenerateSchool() {
    if (schoolForm.feeStructureIds.length === 0) { toast.error('Select at least one fee structure'); return }
    setGeneratingSchool(true)
    try {
      const result = await generateVouchersForSchool({
        month: Number(schoolForm.month),
        year: Number(schoolForm.year),
        dueDate: new Date(schoolForm.dueDate),
        feeStructureIds: schoolForm.feeStructureIds,
      })
      setSchoolResult(result)
      toast.success(`${result.totalCreated} vouchers created across the school`)
      loadData()
    } catch { toast.error('Failed to generate school vouchers') }
    finally { setGeneratingSchool(false) }
  }

  function openRecordPayment(v: VoucherWithDetails) {
    setTarget(v)
    setPaidDialogOpen(true)
  }

  async function handleResetPayment() {
    if (!target) return
    setActionLoading(true)
    try {
      await resetVoucherPayment(target.id)
      toast.success('Payment reset to unpaid')
      setResetDialogOpen(false)
      loadData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reset payment')
    } finally { setActionLoading(false) }
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

  const allSchoolSelected =
    feeStructures.length > 0 && schoolForm.feeStructureIds.length === feeStructures.length

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Fees', href: '/fees' },
        { label: 'Vouchers' },
      ]} />
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
          <Button
            onClick={() => setSchoolDialogOpen(true)}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <School className="h-4 w-4" />
            Generate for School
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Vouchers', value: stats.totalVouchers, cls: 'text-slate-800', icon: FileText },
          { label: 'Paid', value: stats.paidCount, cls: 'text-emerald-700', icon: CheckCircle },
          { label: 'Partial', value: stats.partialCount, cls: 'text-orange-700', icon: Clock },
          { label: 'Advance', value: stats.advanceCount, cls: 'text-blue-700', icon: TrendingUp },
          { label: 'Unpaid', value: stats.unpaidCount, cls: 'text-red-700', icon: AlertCircle },
        ].map((c) => (
          <Card key={c.label} className="shadow-sm">
            <CardContent className="p-4 text-center">
              <c.icon className={cn('h-4 w-4 mx-auto mb-1', c.cls)} />
              <p className={cn('text-xl font-bold', c.cls)}>{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            {(['UNPAID', 'PAID', 'PARTIAL', 'ADVANCE', 'CANCELLED'] as VoucherStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search voucher # or student…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-8" />
        </div>
      </div>

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
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Remaining</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                ))}</tr>
              ))
            ) : filteredVouchers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                  No vouchers found. Generate vouchers for a class to get started.
                </td>
              </tr>
            ) : (
              filteredVouchers.map((v) => {
                const rem = remainingFor(v)
                return (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs">{v.voucherNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {v.student.firstName} {v.student.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.student.class.name} – {v.student.class.section}</td>
                  <td className="px-4 py-3 text-slate-600">{MONTHS[v.month - 1]?.label} {v.year}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatRs(Number(v.totalAmount))}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatRs(Number(v.paidAmount))}</td>
                  <td className={cn(
                    'px-4 py-3 text-right font-medium text-sm',
                    v.status === 'UNPAID' && 'text-red-700',
                    v.status === 'PARTIAL' && 'text-orange-700',
                    v.status === 'PAID' && 'text-emerald-700',
                    v.status === 'ADVANCE' && 'text-blue-700',
                    v.status === 'CANCELLED' && 'text-slate-400',
                  )}>
                    {v.status === 'CANCELLED' || v.status === 'PAID'
                      ? (v.status === 'PAID' ? formatRs(0) : '—')
                      : v.status === 'ADVANCE'
                        ? `Advance: ${formatRs(rem)}`
                        : formatRs(rem)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={cn('text-xs', STATUS_BADGE[v.status])}>{STATUS_LABEL[v.status]}</Badge>
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
                        {(v.status === 'PAID' || v.status === 'PARTIAL' || v.status === 'ADVANCE') && (
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => window.open(`/print/voucher/receipt/${v.id}`, '_blank')}
                          >
                            <Receipt className="h-4 w-4" />
                            Print Receipt
                          </DropdownMenuItem>
                        )}
                        {(v.status === 'UNPAID' || v.status === 'PARTIAL') && (
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => openRecordPayment(v)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Record Payment
                          </DropdownMenuItem>
                        )}
                        {v.status === 'PARTIAL' && (
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer text-emerald-700"
                            onClick={() => openRecordPayment(v)}
                          >
                            <Plus className="h-4 w-4" />
                            Add Payment
                          </DropdownMenuItem>
                        )}
                        {v.status === 'PARTIAL' && (
                          <DropdownMenuItem
                            className="flex items-center gap-2 cursor-pointer text-amber-700"
                            onClick={() => { setTarget(v); setResetDialogOpen(true) }}
                          >
                            <RotateCcw className="h-4 w-4" />
                            Reset Payment
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
                )
              })
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

      {/* Generate School Dialog */}
      <Dialog open={schoolDialogOpen} onOpenChange={(open) => { setSchoolDialogOpen(open); if (!open) setSchoolResult(null) }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Vouchers — Entire School</DialogTitle>
            <DialogDescription className="text-amber-700">
              This will generate fee vouchers for ALL active students across ALL classes in the current academic year.
            </DialogDescription>
          </DialogHeader>

          {schoolResult ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b">
                      <th className="px-3 py-2 text-left">Class</th>
                      <th className="px-3 py-2 text-right">Created</th>
                      <th className="px-3 py-2 text-right">Already Existed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {schoolResult.classResults.map((r) => (
                      <tr key={r.className}>
                        <td className="px-3 py-2">{r.className}</td>
                        <td className="px-3 py-2 text-right text-emerald-700 font-medium">{r.created}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{r.skipped}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{schoolResult.totalCreated}</td>
                      <td className="px-3 py-2 text-right">{schoolResult.totalSkipped}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Button variant="outline" disabled className="w-full gap-2 opacity-60">
                <Printer className="h-4 w-4" />
                Print All School Vouchers (coming soon)
              </Button>
              <DialogFooter>
                <Button onClick={() => { setSchoolDialogOpen(false); setSchoolResult(null) }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Month *</Label>
                    <Select
                      value={schoolForm.month}
                      onValueChange={(v) => {
                        const month = v ?? String(CURRENT_MONTH)
                        setSchoolForm((f) => ({
                          ...f,
                          month,
                          dueDate: format(new Date(Number(f.year), Number(month) - 1, 10), 'yyyy-MM-dd'),
                        }))
                      }}
                    >
                      <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Year *</Label>
                    <Input
                      type="number"
                      value={schoolForm.year}
                      onChange={(e) => {
                        const year = e.target.value
                        setSchoolForm((f) => ({
                          ...f,
                          year,
                          dueDate: format(new Date(Number(year), Number(f.month) - 1, 10), 'yyyy-MM-dd'),
                        }))
                      }}
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Due Date *</Label>
                  <Input type="date" value={schoolForm.dueDate} onChange={(e) => setSchoolForm((f) => ({ ...f, dueDate: e.target.value }))} className="h-9" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Fee Structures *</Label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={allSchoolSelected} onChange={(e) => toggleSelectAllSchoolFees(e.target.checked)} className="rounded" />
                      Select All
                    </label>
                  </div>
                  <div className="rounded-lg border p-3 space-y-3 max-h-56 overflow-y-auto">
                    {schoolAllClassFees.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Applies to All Classes</p>
                        {schoolAllClassFees.map((f) => (
                          <label key={f.id} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="checkbox" checked={schoolForm.feeStructureIds.includes(f.id)} onChange={() => toggleSchoolFee(f.id)} className="rounded" />
                            <span className="flex-1">{f.name}</span>
                            <span className="text-muted-foreground">{formatRs(Number(f.amount))}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {schoolClassFeesGrouped.map(([label, fees]) => (
                      <div key={label} className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                        {fees.map((f) => (
                          <label key={f.id} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="checkbox" checked={schoolForm.feeStructureIds.includes(f.id)} onChange={() => toggleSchoolFee(f.id)} className="rounded" />
                            <span className="flex-1">{f.name}</span>
                            <span className="text-muted-foreground">{formatRs(Number(f.amount))}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                    {feeStructures.length === 0 && (
                      <p className="text-sm text-muted-foreground">No fee structures found.</p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-indigo-700">
                    Estimated amount per student (all-class fees): {formatRs(schoolPreviewAllClassTotal)}
                  </p>
                </div>

                <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                  This will generate vouchers for approximately <b>{schoolPreview.studentCount}</b> students across <b>{schoolPreview.classCount}</b> classes
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSchoolDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleGenerateSchool} disabled={generatingSchool} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  {generatingSchool && <Loader2 className="h-4 w-4 animate-spin" />}
                  {generatingSchool ? 'Generating…' : 'Generate'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RecordPaymentDialog
        open={paidDialogOpen}
        onClose={() => { setPaidDialogOpen(false); setTarget(null) }}
        onSuccess={() => loadData()}
        voucher={target ? {
          id: target.id,
          voucherNumber: target.voucherNumber,
          totalAmount: Number(target.totalAmount),
          paidAmount: Number(target.paidAmount),
          remainingAmount: Number(target.remainingAmount) || Math.max(0, Number(target.totalAmount) - Number(target.paidAmount)),
          status: target.status,
          student: {
            id: target.studentId,
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

      {/* Reset Payment Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Reset Payment
            </DialogTitle>
            <DialogDescription>
              This will reset all payment records for this voucher back to UNPAID. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Keep</Button>
            <Button variant="destructive" onClick={handleResetPayment} disabled={actionLoading}>
              {actionLoading ? 'Resetting…' : 'Reset Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
