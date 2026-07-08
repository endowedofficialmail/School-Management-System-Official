'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ArrowLeft, Printer, Trash2, CalendarDays, BookOpen, Save, Pencil,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { getExamById, getSubjectsByClass, type SubjectWithTeacher } from '@/lib/actions/exams'
import {
  getDatesheetByExam, upsertDatesheetEntry, deleteDatesheetEntry,
  deleteFullDatesheet, getDatesheetForPrint,
  type DatesheetEntryWithDetails, type DatesheetPrintData,
} from '@/lib/actions/datesheet'

// ─── Row accent colours (cycle by index) ─────────────────────────────────────
const ROW_ACCENTS = [
  'border-l-blue-400',
  'border-l-violet-400',
  'border-l-emerald-400',
  'border-l-amber-400',
  'border-l-rose-400',
  'border-l-cyan-400',
  'border-l-orange-400',
  'border-l-teal-400',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string) {
  return format(new Date(d), 'dd MMM yyyy')
}
function fmtDay(d: Date | string) {
  return format(new Date(d), 'EEEE')
}

// ─── Component ───────────────────────────────────────────────────────────────

const EMPTY_FORM = { subjectId: '', date: '', startTime: '', endTime: '', room: '' }

export default function DatesheetPage() {
  const params = useParams()
  const examId = Number(params.id)

  // Exam + subjects
  const [exam, setExam] = useState<Awaited<ReturnType<typeof getExamById>> | null>(null)
  const [subjects, setSubjects] = useState<SubjectWithTeacher[]>([])
  const [entries, setEntries] = useState<DatesheetEntryWithDetails[]>([])
  const [printData, setPrintData] = useState<DatesheetPrintData | null>(null)
  const [loading, setLoading] = useState(true)

  // Form
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete single entry
  const [deleteTarget, setDeleteTarget] = useState<DatesheetEntryWithDetails | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Delete full datesheet
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (!examId) return
    setLoading(true)
    try {
      const [ex, ds, pd] = await Promise.all([
        getExamById(examId),
        getDatesheetByExam(examId),
        getDatesheetForPrint(examId),
      ])
      setExam(ex)
      setEntries(ds)
      setPrintData(pd)
      if (ex) {
        const subs = await getSubjectsByClass(ex.classId)
        setSubjects(subs)
      }
    } finally {
      setLoading(false)
    }
  }, [examId])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Subject select → pre-fill form ──────────────────────────────────────────

  function handleSubjectChange(subjectId: string) {
    const existing = entries.find((e) => String(e.subjectId) === subjectId)
    if (existing) {
      setForm({
        subjectId,
        date: format(new Date(existing.date), 'yyyy-MM-dd'),
        startTime: existing.startTime,
        endTime: existing.endTime,
        room: existing.room ?? '',
      })
    } else {
      setForm((f) => ({ ...f, subjectId, date: '', startTime: '', endTime: '', room: '' }))
    }
  }

  // ── Save entry ───────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.subjectId) { toast.error('Please select a subject'); return }
    if (!form.date) { toast.error('Date is required'); return }
    if (!form.startTime) { toast.error('Start time is required'); return }
    if (!form.endTime) { toast.error('End time is required'); return }
    if (form.startTime >= form.endTime) {
      toast.error('End time must be after start time'); return
    }
    setSaving(true)
    try {
      await upsertDatesheetEntry({
        examId,
        subjectId: Number(form.subjectId),
        date: new Date(form.date),
        startTime: form.startTime,
        endTime: form.endTime,
        room: form.room || undefined,
      })
      toast.success('Datesheet entry saved')
      setForm(EMPTY_FORM)
      const [ds, pd] = await Promise.all([
        getDatesheetByExam(examId),
        getDatesheetForPrint(examId),
      ])
      setEntries(ds)
      setPrintData(pd)
    } catch {
      toast.error('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  // ── Edit entry (pre-fill form) ────────────────────────────────────────────

  function handleEdit(entry: DatesheetEntryWithDetails) {
    setForm({
      subjectId: String(entry.subjectId),
      date: format(new Date(entry.date), 'yyyy-MM-dd'),
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Delete single ────────────────────────────────────────────────────────────

  async function handleDeleteEntry() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteDatesheetEntry(deleteTarget.id)
      toast.success('Entry deleted')
      setDeleteOpen(false)
      const [ds, pd] = await Promise.all([
        getDatesheetByExam(examId),
        getDatesheetForPrint(examId),
      ])
      setEntries(ds)
      setPrintData(pd)
    } catch {
      toast.error('Failed to delete entry')
    } finally {
      setDeleting(false)
    }
  }

  // ── Delete full datesheet ────────────────────────────────────────────────────

  async function handleClearAll() {
    setClearing(true)
    try {
      await deleteFullDatesheet(examId)
      toast.success('Datesheet cleared')
      setClearOpen(false)
      setEntries([])
      setPrintData(null)
    } catch {
      toast.error('Failed to clear datesheet')
    } finally {
      setClearing(false)
    }
  }

  // ── Subject colour map ────────────────────────────────────────────────────

  const subjectColorMap = useMemo(() => {
    const map: Record<number, string> = {}
    subjects.forEach((s, i) => {
      map[s.id] = ROW_ACCENTS[i % ROW_ACCENTS.length]
    })
    return map
  }, [subjects])

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-lg font-semibold text-slate-700">Exam not found</p>
        <Link href="/exams" className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
          <ArrowLeft className="h-4 w-4" />
          Back to Exams
        </Link>
      </div>
    )
  }

  const examTitle = `${exam.name} — ${exam.class.name} ${exam.class.section}`

  return (
    <>
      {/* ── Screen UI ─────────────────────────────────────────────────────── */}
      <div className="no-print space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/exams"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 shrink-0 mt-0.5')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-muted-foreground font-normal">Datesheet: </span>
                {examTitle}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {exam.class.name} &ndash; {exam.class.section} &bull; {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} scheduled
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print Datesheet
            </Button>
            {entries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setClearOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* ── Add / Edit Form ──────────────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Add / Edit Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center gap-2">
                <BookOpen className="h-7 w-7 text-muted-foreground" />
                <p className="font-medium text-slate-700">No subjects for this class</p>
                <p className="text-sm text-muted-foreground">
                  Add subjects first from{' '}
                  <Link href="/teachers/subjects" className="text-primary hover:underline">
                    Teachers &rsaquo; Subjects
                  </Link>
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Subject */}
                <div className="space-y-1.5 lg:col-span-1">
                  <Label>Subject <span className="text-destructive">*</span></Label>
                  <Select value={form.subjectId} onValueChange={(v) => handleSubjectChange(v ?? '')}>
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="Select subject…" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                          {entries.find((e) => e.subjectId === s.id) ? ' ✓' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="ds-date">Date <span className="text-destructive">*</span></Label>
                  <Input
                    id="ds-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="h-9"
                  />
                </div>

                {/* Start Time */}
                <div className="space-y-1.5">
                  <Label htmlFor="ds-start">Start Time <span className="text-destructive">*</span></Label>
                  <Input
                    id="ds-start"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="h-9"
                    placeholder="09:00"
                  />
                </div>

                {/* End Time */}
                <div className="space-y-1.5">
                  <Label htmlFor="ds-end">End Time <span className="text-destructive">*</span></Label>
                  <Input
                    id="ds-end"
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="h-9"
                    placeholder="11:00"
                  />
                </div>

                {/* Room */}
                <div className="space-y-1.5">
                  <Label htmlFor="ds-room">Room / Hall</Label>
                  <Input
                    id="ds-room"
                    placeholder="e.g. Hall A, Room 12"
                    value={form.room}
                    onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
                    className="h-9"
                  />
                </div>

                {/* Save button */}
                <div className="flex items-end">
                  <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save Entry'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Current Datesheet Table ──────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Current Datesheet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center gap-2">
                <CalendarDays className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-slate-700">No datesheet entries yet</p>
                <p className="text-sm text-muted-foreground">
                  Add subjects above to build the schedule.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto shadow-sm">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Day</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Subject</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Start</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">End</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Room</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((entry) => (
                      <tr
                        key={entry.id}
                        className={cn(
                          'hover:bg-muted/30 transition-colors border-l-4',
                          subjectColorMap[entry.subjectId] ?? 'border-l-slate-300',
                        )}
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">{fmtDate(entry.date)}</td>
                        <td className="px-4 py-3 text-slate-600">{fmtDay(entry.date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{entry.subject.name}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">{entry.startTime}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">{entry.endTime}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {entry.room ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="h-7 w-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-primary transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { setDeleteTarget(entry); setDeleteOpen(true) }}
                              className="h-7 w-7 rounded-md hover:bg-red-50 flex items-center justify-center text-slate-500 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Print View ────────────────────────────────────────────────────── */}
      <div className="hidden print:block">
        {printData ? (
          <div className="space-y-4">
            {/* School header */}
            <div className="text-center border-b pb-4">
              <h1 className="text-2xl font-bold">{printData.school?.name ?? 'School'}</h1>
              {printData.school?.address && (
                <p className="text-sm text-slate-600">{printData.school.address}</p>
              )}
              {printData.school?.phone && (
                <p className="text-sm text-slate-600">Tel: {printData.school.phone}</p>
              )}
            </div>

            {/* Report heading */}
            <div className="text-center space-y-1 py-2">
              <h2 className="text-xl font-bold uppercase tracking-wide">Examination Datesheet</h2>
              <p className="text-base font-semibold">{printData.exam.name}</p>
              <p className="text-sm">
                Class: {printData.exam.class.name} &ndash; {printData.exam.class.section}
                &nbsp;&bull;&nbsp;
                Academic Year: {printData.exam.academicYear.name}
              </p>
            </div>

            {/* Table */}
            <table className="w-full border-collapse text-sm mt-4">
              <thead>
                <tr className="border-b-2 border-slate-800">
                  <th className="py-2 px-3 text-left font-bold">Date</th>
                  <th className="py-2 px-3 text-left font-bold">Day</th>
                  <th className="py-2 px-3 text-left font-bold">Subject</th>
                  <th className="py-2 px-3 text-left font-bold">Time</th>
                  <th className="py-2 px-3 text-left font-bold">Room / Hall</th>
                </tr>
              </thead>
              <tbody>
                {printData.exam.datesheetEntries.map((entry, idx) => (
                  <tr key={entry.id} className={idx % 2 === 0 ? '' : 'bg-slate-50'}>
                    <td className="py-2 px-3 border-b border-slate-200">{fmtDate(entry.date)}</td>
                    <td className="py-2 px-3 border-b border-slate-200">{fmtDay(entry.date)}</td>
                    <td className="py-2 px-3 border-b border-slate-200 font-medium">{entry.subject.name}</td>
                    <td className="py-2 px-3 border-b border-slate-200">
                      {entry.startTime} &ndash; {entry.endTime}
                    </td>
                    <td className="py-2 px-3 border-b border-slate-200">{entry.room ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t text-xs text-slate-500 text-center">
              This datesheet is subject to change. For any queries contact the school administration.
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              <span>Printed on: {format(new Date(), 'dd MMM yyyy, hh:mm a')}</span>
            </div>
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">No datesheet data available.</p>
        )}
      </div>

      {/* ── Delete single entry dialog ─────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium text-foreground">{deleteTarget?.subject.name}</span> from the datesheet? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEntry} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clear all dialog ──────────────────────────────────────────────── */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear Full Datesheet</DialogTitle>
            <DialogDescription>
              This will permanently delete all {entries.length} datesheet entr{entries.length === 1 ? 'y' : 'ies'} for this exam. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)} disabled={clearing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAll} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Yes, Clear All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
