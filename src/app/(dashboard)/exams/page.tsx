'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, FileEdit, Trash2, ClipboardList, BarChart2, Calendar, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  getExams, createExam, updateExam, deleteExam,
  getAcademicYears, getActiveAcademicYear,
  type ExamWithDetails,
} from '@/lib/actions/exams'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import BackButton from '@/components/shared/BackButton'
import { buttonVariants } from '@/components/ui/button'

// ─── helpers ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: '', classId: '', startDate: '', endDate: '' }

type AcademicYear = { id: number; name: string; isActive: boolean }

// ─── Component ───────────────────────────────────────────────────────────────

import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

function ExamsPageInner() {
  const searchParams = useSearchParams()

  const [exams, setExams] = useState<ExamWithDetails[]>([])
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [activeYearId, setActiveYearId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters — pre-seed from URL if provided
  const [filterClass, setFilterClass] = useState(() => searchParams?.get('classId') ?? '')
  const [filterYear, setFilterYear] = useState('')

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editExam, setEditExam] = useState<ExamWithDetails | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ExamWithDetails | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [examList, classList, yearList, activeYear] = await Promise.all([
      getExams({
        classId: filterClass ? Number(filterClass) : undefined,
        academicYearId: filterYear ? Number(filterYear) : undefined,
      }),
      getClasses(),
      getAcademicYears(),
      getActiveAcademicYear(),
    ])
    setExams(examList)
    setClasses(classList)
    setAcademicYears(yearList)
    if (activeYear) setActiveYearId(activeYear.id)
    setLoading(false)
  }, [filterClass, filterYear])

  useEffect(() => { loadData() }, [loadData])

  // ── Dialog ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditExam(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(exam: ExamWithDetails) {
    setEditExam(exam)
    setForm({
      name: exam.name,
      classId: String(exam.classId),
      startDate: format(new Date(exam.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(exam.endDate), 'yyyy-MM-dd'),
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.classId || !form.startDate || !form.endDate) {
      toast.error('Please fill all required fields')
      return
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error('End date must be after start date')
      return
    }
    if (!activeYearId) {
      toast.error('No active academic year found. Please set one first.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        classId: Number(form.classId),
        academicYearId: activeYearId,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
      }
      if (editExam) {
        await updateExam(editExam.id, payload)
        toast.success('Exam updated successfully')
      } else {
        await createExam(payload)
        toast.success('Exam created successfully')
      }
      setDialogOpen(false)
      loadData()
    } catch {
      toast.error('Failed to save exam')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  function confirmDelete(exam: ExamWithDetails) {
    setDeleteTarget(exam)
    setDeleteOpen(true)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteExam(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" deleted`)
      setDeleteOpen(false)
      loadData()
    } catch {
      toast.error('Failed to delete exam')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exams</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? '...' : `${exams.length} exam${exams.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Exam
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterClass} onValueChange={(v) => setFilterClass(v ?? '')}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name} – {c.section}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterYear} onValueChange={(v) => setFilterYear(v ?? '')}>
          <SelectTrigger className="h-9 w-[180px]">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Years</SelectItem>
            {academicYears.map((y) => (
              <SelectItem key={y.id} value={String(y.id)}>
                {y.name} {y.isActive && '(Active)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold">Exam Name</TableHead>
              <TableHead className="font-semibold">Class</TableHead>
              <TableHead className="font-semibold">Start Date</TableHead>
              <TableHead className="font-semibold">End Date</TableHead>
              <TableHead className="font-semibold">Academic Year</TableHead>
              <TableHead className="font-semibold">Datesheet</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-slate-100 rounded animate-pulse w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : exams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar className="h-10 w-10 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No exams found</p>
                    <p className="text-xs text-muted-foreground">
                      Click &quot;Create Exam&quot; to add your first exam
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              exams.map((exam) => (
                <TableRow key={exam.id} className="hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900">{exam.name}</TableCell>
                  <TableCell className="text-slate-600">
                    {exam.class.name} – {exam.class.section}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {format(new Date(exam.startDate), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {format(new Date(exam.endDate), 'dd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'text-xs',
                        exam.academicYear.isActive
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      {exam.academicYear.name}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'text-xs',
                        exam._count.datesheetEntries > 0
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-100'
                      )}
                    >
                      {exam._count.datesheetEntries > 0 ? 'Datesheet Ready' : 'No Datesheet'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ variant: 'ghost', size: 'sm' }),
                          'h-8 px-2 text-xs'
                        )}
                      >
                        Actions
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => { window.location.href = `/exams/${exam.id}/datesheet` }}
                        >
                          <CalendarDays className="h-4 w-4" />
                          Datesheet
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => { window.location.href = `/exams/${exam.id}/results` }}
                        >
                          <ClipboardList className="h-4 w-4" />
                          Enter Results
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => { window.location.href = `/exams/${exam.id}/results` }}
                        >
                          <BarChart2 className="h-4 w-4" />
                          View Report Cards
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => openEdit(exam)}
                        >
                          <FileEdit className="h-4 w-4" />
                          Edit Exam
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
                          onClick={() => confirmDelete(exam)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Exam
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editExam ? 'Edit Exam' : 'Create Exam'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="exam-name">Exam Name *</Label>
              <Input
                id="exam-name"
                placeholder="e.g. Mid Term Exam"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select
                value={form.classId}
                onValueChange={(v) => setForm((f) => ({ ...f, classId: v ?? '' }))}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Select class..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} – {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            {activeYearId && (
              <p className="text-xs text-muted-foreground">
                Will be created under the active academic year:{' '}
                <span className="font-medium">
                  {academicYears.find((y) => y.id === activeYearId)?.name ?? ''}
                </span>
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editExam ? 'Save Changes' : 'Create Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Exam</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>?
            This will also permanently delete all results for this exam.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ExamsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 rounded-xl" /></div>}>
      <ExamsPageInner />
    </Suspense>
  )
}
