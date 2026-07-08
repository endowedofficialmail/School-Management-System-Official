'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, Trash2, Plus, Pencil, X, CalendarRange } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

import {
  getTeacherTimetable, createTimetableEntry, updateTimetableEntry,
  deleteTimetableEntry, deleteTeacherTimetable,
  type TimetableEntry,
} from '@/lib/actions/timetable'
import { getClasses, type ClassWithYear } from '@/lib/actions/students'
import { getSubjectsByClass, type SubjectWithTeacher } from '@/lib/actions/exams'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const PASTEL_BG = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-violet-100 text-violet-800 border-violet-200',
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-teal-100 text-teal-800 border-teal-200',
]

const EMPTY_FORM = {
  dayOfWeek: '',
  periodNumber: '',
  startTime: '',
  endTime: '',
  classId: '',
  subjectId: '',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TeacherTimetablePage() {
  const params = useParams()
  const teacherId = Number(params.teacherId)

  const [teacherName, setTeacherName] = useState('')
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [classes, setClasses] = useState<ClassWithYear[]>([])
  const [subjects, setSubjects] = useState<SubjectWithTeacher[]>([])
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadEntries = useCallback(async () => {
    const data = await getTeacherTimetable(teacherId)
    setEntries(data)
    if (data.length > 0 && !teacherName) setTeacherName(data[0].teacher.name)
  }, [teacherId, teacherName])

  useEffect(() => {
    if (!teacherId) return
    Promise.all([getTeacherTimetable(teacherId), getClasses()]).then(([tt, cls]) => {
      setEntries(tt)
      setClasses(cls)
      if (tt.length > 0) setTeacherName(tt[0].teacher.name)
      setLoading(false)
    })
  }, [teacherId])

  // ── When class changes, load subjects ───────────────────────────────────

  useEffect(() => {
    if (!form.classId) { setSubjects([]); return }
    getSubjectsByClass(Number(form.classId)).then(setSubjects)
  }, [form.classId])

  // ── Subject colour map (stable per subject id) ───────────────────────────

  const subjectColorMap = useMemo(() => {
    const map: Record<number, string> = {}
    const seen: number[] = []
    entries.forEach((e) => {
      if (!(e.subjectId in map)) {
        map[e.subjectId] = PASTEL_BG[seen.length % PASTEL_BG.length]
        seen.push(e.subjectId)
      }
    })
    return map
  }, [entries])

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.dayOfWeek) { toast.error('Select a day'); return }
    if (!form.startTime) { toast.error('Start time is required'); return }
    if (!form.endTime) { toast.error('End time is required'); return }
    if (!form.classId) { toast.error('Select a class'); return }
    if (!form.subjectId) { toast.error('Select a subject'); return }

    setSaving(true)
    try {
      const payload = {
        teacherId,
        subjectId: Number(form.subjectId),
        classId: Number(form.classId),
        dayOfWeek: Number(form.dayOfWeek),
        startTime: form.startTime,
        endTime: form.endTime,
        periodNumber: form.periodNumber ? Number(form.periodNumber) : undefined,
      }

      if (editId !== null) {
        await updateTimetableEntry(editId, payload)
        toast.success('Period updated')
      } else {
        await createTimetableEntry(payload)
        toast.success('Period added')
      }

      setForm(EMPTY_FORM)
      setEditId(null)
      setSubjects([])
      await loadEntries()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save period')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(entry: TimetableEntry) {
    setForm({
      dayOfWeek: String(entry.dayOfWeek),
      periodNumber: entry.periodNumber != null ? String(entry.periodNumber) : '',
      startTime: entry.startTime,
      endTime: entry.endTime,
      classId: String(entry.classId),
      subjectId: String(entry.subjectId),
    })
    setEditId(entry.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setSubjects([])
  }

  // ── Delete single ────────────────────────────────────────────────────────

  async function handleDeleteEntry() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTimetableEntry(deleteTarget.id)
      toast.success('Period deleted')
      setDeleteOpen(false)
      await loadEntries()
    } catch {
      toast.error('Failed to delete period')
    } finally {
      setDeleting(false)
    }
  }

  // ── Delete full ──────────────────────────────────────────────────────────

  async function handleClearAll() {
    setClearing(true)
    try {
      await deleteTeacherTimetable(teacherId)
      toast.success('Timetable cleared')
      setClearOpen(false)
      setEntries([])
    } catch {
      toast.error('Failed to clear timetable')
    } finally {
      setClearing(false)
    }
  }

  // ── Grid helpers ─────────────────────────────────────────────────────────

  const timeSlots = useMemo(() => {
    const times = Array.from(new Set(entries.map((e) => e.startTime))).sort()
    return times
  }, [entries])

  function cellEntry(day: number, time: string) {
    return entries.find((e) => e.dayOfWeek === day && e.startTime === time) ?? null
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href="/teachers/timetable"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5 shrink-0 mt-0.5')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                <span className="text-muted-foreground font-normal">Timetable — </span>
                {teacherName || `Teacher #${teacherId}`}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {entries.length} period{entries.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/print/timetable/${teacherId}`}
              target="_blank"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
            >
              <Printer className="h-4 w-4" />
              Print Timetable
            </Link>
            {entries.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setClearOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Full Timetable
              </Button>
            )}
          </div>
        </div>

        {/* ── Add / Edit Form ─────────────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="h-4 w-4 text-primary" />
              {editId !== null ? 'Edit Period' : 'Add Period'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Day */}
              <div className="space-y-1.5">
                <Label>Day <span className="text-destructive">*</span></Label>
                <Select value={form.dayOfWeek} onValueChange={(v) => setForm((f) => ({ ...f, dayOfWeek: v ?? '' }))}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select day…" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Period number */}
              <div className="space-y-1.5">
                <Label htmlFor="tt-period">Period No.</Label>
                <Input
                  id="tt-period"
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={form.periodNumber}
                  onChange={(e) => setForm((f) => ({ ...f, periodNumber: e.target.value }))}
                  className="h-9"
                />
              </div>

              {/* Start time */}
              <div className="space-y-1.5">
                <Label htmlFor="tt-start">Start Time <span className="text-destructive">*</span></Label>
                <Input
                  id="tt-start"
                  type="time"
                  placeholder="08:00 AM"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  className="h-9"
                />
              </div>

              {/* End time */}
              <div className="space-y-1.5">
                <Label htmlFor="tt-end">End Time <span className="text-destructive">*</span></Label>
                <Input
                  id="tt-end"
                  type="time"
                  placeholder="09:00 AM"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  className="h-9"
                />
              </div>

              {/* Class */}
              <div className="space-y-1.5">
                <Label>Class <span className="text-destructive">*</span></Label>
                <Select
                  value={form.classId}
                  onValueChange={(v) => setForm((f) => ({ ...f, classId: v ?? '', subjectId: '' }))}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select class…" />
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

              {/* Subject */}
              <div className="space-y-1.5">
                <Label>Subject <span className="text-destructive">*</span></Label>
                <Select
                  value={form.subjectId}
                  onValueChange={(v) => setForm((f) => ({ ...f, subjectId: v ?? '' }))}
                  disabled={!form.classId}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder={form.classId ? 'Select subject…' : 'Select class first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Plus className="h-4 w-4" />
                {saving ? 'Saving…' : editId !== null ? 'Update Period' : 'Add Period'}
              </Button>
              {editId !== null && (
                <Button variant="outline" onClick={cancelEdit} className="gap-2">
                  <X className="h-4 w-4" />
                  Cancel Edit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Weekly Grid ────────────────────────────────────────────────── */}
        {entries.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Weekly Grid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[700px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-3 text-left font-semibold text-slate-700 border-b w-28">
                        Time
                      </th>
                      {DAYS.map((d) => (
                        <th key={d.value} className="px-3 py-3 text-center font-semibold text-slate-700 border-b border-l">
                          {d.label.slice(0, 3)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {timeSlots.map((time) => (
                      <tr key={time} className="group/row hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-2 font-mono text-xs text-slate-500 border-r bg-muted/30 whitespace-nowrap">
                          {time}
                        </td>
                        {DAYS.map((d) => {
                          const entry = cellEntry(d.value, time)
                          return (
                            <td key={d.value} className="px-2 py-2 border-l align-top min-w-[110px]">
                              {entry ? (
                                <div
                                  className={cn(
                                    'rounded-md border p-1.5 text-xs leading-tight relative group/cell',
                                    subjectColorMap[entry.subjectId] ?? 'bg-slate-100 text-slate-700 border-slate-200',
                                  )}
                                >
                                  <p className="font-semibold truncate">{entry.subject.name}</p>
                                  <p className="opacity-70 truncate">
                                    {entry.class.name}-{entry.class.section}
                                  </p>
                                  <div className="absolute top-1 right-1 hidden group-hover/cell:flex gap-0.5">
                                    <button
                                      onClick={() => handleEdit(entry)}
                                      className="h-5 w-5 rounded bg-white/70 hover:bg-white flex items-center justify-center shadow-sm"
                                      title="Edit"
                                    >
                                      <Pencil className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                      onClick={() => { setDeleteTarget(entry); setDeleteOpen(true) }}
                                      className="h-5 w-5 rounded bg-white/70 hover:bg-white flex items-center justify-center shadow-sm"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-2.5 w-2.5 text-red-500" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-md border border-dashed border-slate-200 p-1.5 text-center text-slate-300 text-xs min-h-[46px] flex items-center justify-center">
                                  +
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── List View ───────────────────────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Periods</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center gap-2">
                <CalendarRange className="h-7 w-7 text-muted-foreground" />
                <p className="font-medium text-slate-700">No periods yet</p>
                <p className="text-sm text-muted-foreground">Use the form above to add this teacher&apos;s schedule.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border shadow-sm">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Day</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Period</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Time</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Class</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Subject</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {DAYS.find((d) => d.value === entry.dayOfWeek)?.label}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {entry.periodNumber ?? <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                          {entry.startTime} – {entry.endTime}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {entry.class.name}-{entry.class.section}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-block px-2 py-0.5 rounded text-xs font-medium border',
                              subjectColorMap[entry.subjectId] ?? 'bg-slate-100 text-slate-700',
                            )}
                          >
                            {entry.subject.name}
                          </span>
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

      {/* Delete single dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Period</DialogTitle>
            <DialogDescription>
              Remove{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.subject.name}
              </span>{' '}
              on{' '}
              <span className="font-medium text-foreground">
                {DAYS.find((d) => d.value === deleteTarget?.dayOfWeek)?.label}
              </span>
              {' '}at{' '}
              <span className="font-medium text-foreground">{deleteTarget?.startTime}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteEntry} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear full timetable dialog */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Full Timetable</DialogTitle>
            <DialogDescription>
              This will permanently delete all {entries.length} period{entries.length !== 1 ? 's' : ''} for{' '}
              <span className="font-medium text-foreground">{teacherName}</span>. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)} disabled={clearing}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearAll} disabled={clearing}>
              {clearing ? 'Deleting…' : 'Yes, Delete All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
