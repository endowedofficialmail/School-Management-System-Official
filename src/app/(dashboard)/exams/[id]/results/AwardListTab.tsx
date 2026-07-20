'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Save, Printer, CheckCircle2, Clock, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import {
  getSubjectsByClass, getAwardList, getAwardListSummary, saveResults,
  type SubjectWithTeacher, type AwardListData, type AwardListSummaryItem,
} from '@/lib/actions/exams'
import { calculateGrade, GRADE_COLORS } from '@/lib/grade'

type ClassOption = { id: number; name: string; section: string }

type RowForm = {
  theory: string
  practical: string
  obtained: string
  total: string
  isAbsent: boolean
  isWithheld: boolean
  remarks: string
}

const EMPTY_ROW: RowForm = { theory: '', practical: '', obtained: '', total: '', isAbsent: false, isWithheld: false, remarks: '' }

function isNumericInput(v: string) {
  return v === '' || /^\d*\.?\d*$/.test(v)
}

export default function AwardListTab({
  examId,
  classes,
  classId,
  subjectId,
  onClassChange,
  onSubjectChange,
}: {
  examId: number
  classes: ClassOption[]
  classId: string
  subjectId: string
  onClassChange: (v: string) => void
  onSubjectChange: (v: string) => void
}) {
  const [subjects, setSubjects] = useState<SubjectWithTeacher[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [summary, setSummary] = useState<AwardListSummaryItem[]>([])

  const [awardList, setAwardList] = useState<AwardListData | null>(null)
  const [loadingList, setLoadingList] = useState(false)
  const [splitMode, setSplitMode] = useState(false)
  const [form, setForm] = useState<Record<number, RowForm>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)
  const [setAllTotal, setSetAllTotal] = useState('')

  // ── Load subjects + summary when class changes ──────────────────────────
  const loadForClass = useCallback(async (cid: string) => {
    if (!cid) { setSubjects([]); setSummary([]); return }
    setLoadingSubjects(true)
    const [subs, summ] = await Promise.all([
      getSubjectsByClass(Number(cid)),
      getAwardListSummary(examId, Number(cid)),
    ])
    setSubjects(subs)
    setSummary(summ)
    setLoadingSubjects(false)
  }, [examId])

  useEffect(() => { loadForClass(classId) }, [classId, loadForClass])

  // ── Load award list when subject/class changes ──────────────────────────
  const loadAwardList = useCallback(async () => {
    if (!subjectId || !classId) { setAwardList(null); return }
    setLoadingList(true)
    const data = await getAwardList(examId, Number(subjectId), Number(classId))
    setAwardList(data)
    if (data) {
      const anySplit = data.rows.some((r) => r.theoryMarks !== null || r.practicalMarks !== null)
      setSplitMode(anySplit)
      const map: Record<number, RowForm> = {}
      data.rows.forEach((r) => {
        map[r.student.id] = {
          theory: r.theoryMarks !== null ? String(r.theoryMarks) : '',
          practical: r.practicalMarks !== null ? String(r.practicalMarks) : '',
          obtained: r.marksObtained !== null ? String(r.marksObtained) : '',
          total: r.totalMarks !== null ? String(r.totalMarks) : '',
          isAbsent: r.isAbsent,
          isWithheld: r.isWithheld,
          remarks: r.remarks ?? '',
        }
      })
      setForm(map)
    }
    setErrors({})
    setLoadingList(false)
  }, [examId, subjectId, classId])

  useEffect(() => { loadAwardList() }, [loadAwardList])

  // ── Field helpers ─────────────────────────────────────────────────────────

  function setField(studentId: number, field: keyof RowForm, value: string | boolean) {
    if (typeof value === 'string' && (field === 'theory' || field === 'practical' || field === 'obtained' || field === 'total') && !isNumericInput(value)) return
    setForm((prev) => ({ ...prev, [studentId]: { ...(prev[studentId] ?? EMPTY_ROW), [field]: value } }))
    setErrors((prev) => { const n = { ...prev }; delete n[studentId]; return n })
  }

  function toggleAbsent(studentId: number, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? EMPTY_ROW), isAbsent: checked, isWithheld: checked ? false : (prev[studentId]?.isWithheld ?? false) },
    }))
  }

  function toggleWithheld(studentId: number, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? EMPTY_ROW), isWithheld: checked, isAbsent: checked ? false : (prev[studentId]?.isAbsent ?? false) },
    }))
  }

  function rowObtained(row: RowForm): number | null {
    if (row.isAbsent || row.isWithheld) return null
    if (splitMode) {
      const t = parseFloat(row.theory), p = parseFloat(row.practical)
      const hasT = row.theory !== '' && !isNaN(t)
      const hasP = row.practical !== '' && !isNaN(p)
      if (!hasT && !hasP) return null
      return (hasT ? t : 0) + (hasP ? p : 0)
    }
    const o = parseFloat(row.obtained)
    return row.obtained !== '' && !isNaN(o) ? o : null
  }

  function liveGrade(studentId: number): string {
    const row = form[studentId]
    if (!row) return '—'
    if (row.isAbsent) return 'ABS'
    if (row.isWithheld) return 'W/H'
    const obtained = rowObtained(row)
    const total = parseFloat(row.total)
    if (obtained === null || row.total === '' || isNaN(total) || total <= 0) return '—'
    return calculateGrade(obtained, total)
  }

  function applyTotalForAll() {
    const t = parseFloat(setAllTotal)
    if (setAllTotal === '' || isNaN(t) || t <= 0) { toast.error('Enter a valid total marks value'); return }
    setForm((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((sid) => { next[Number(sid)] = { ...next[Number(sid)], total: setAllTotal } })
      return next
    })
    toast.success(`Total marks set to ${setAllTotal} for all students`)
  }

  // ── Live stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const values = Object.values(form)
    const entered = values.filter((r) => r.isAbsent || r.isWithheld || r.obtained !== '' || r.theory !== '' || r.practical !== '').length
    const absent = values.filter((r) => r.isAbsent).length
    const scored = values
      .filter((r) => !r.isAbsent && !r.isWithheld)
      .map((r) => ({ obtained: rowObtained(r), total: parseFloat(r.total) }))
      .filter((r) => r.obtained !== null && !isNaN(r.total) && r.total > 0) as { obtained: number; total: number }[]
    const average = scored.length > 0
      ? Math.round((scored.reduce((sum, r) => sum + (r.obtained / r.total) * 100, 0) / scored.length) * 10) / 10
      : 0
    const pass = scored.filter((r) => (r.obtained / r.total) * 100 >= 40).length
    const fail = scored.length - pass
    return { entered, absent, average, pass, fail }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, splitMode])

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!awardList) return
    const newErrors: Record<number, string> = {}
    const results: {
      studentId: number; marksObtained: number; totalMarks: number
      theoryMarks?: number; practicalMarks?: number
      isAbsent?: boolean; isWithheld?: boolean; remarks?: string
    }[] = []

    for (const row of awardList.rows) {
      const f = form[row.student.id]
      if (!f) continue
      const total = parseFloat(f.total)

      if (f.isAbsent || f.isWithheld) {
        if (f.total === '' || isNaN(total) || total <= 0) { newErrors[row.student.id] = 'Total marks required'; continue }
        results.push({ studentId: row.student.id, marksObtained: 0, totalMarks: total, isAbsent: f.isAbsent, isWithheld: f.isWithheld, remarks: f.remarks || undefined })
        continue
      }

      const obtained = rowObtained(f)
      if (obtained === null && f.total === '') continue // untouched row, skip
      if (obtained === null) continue
      if (f.total === '' || isNaN(total) || total <= 0) { newErrors[row.student.id] = 'Total marks required'; continue }
      if (obtained > total) { newErrors[row.student.id] = 'Marks cannot exceed total'; continue }

      const theory = splitMode && f.theory !== '' ? parseFloat(f.theory) : undefined
      const practical = splitMode && f.practical !== '' ? parseFloat(f.practical) : undefined

      results.push({
        studentId: row.student.id,
        marksObtained: obtained,
        totalMarks: total,
        theoryMarks: theory,
        practicalMarks: practical,
        isAbsent: false,
        isWithheld: false,
        remarks: f.remarks || undefined,
      })
    }

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); toast.error('Fix errors before saving'); return }
    if (results.length === 0) { toast.error('No marks entered'); return }

    setSaving(true)
    try {
      await saveResults({ examId, subjectId: Number(subjectId), results })
      toast.success('Award list saved. Class Result and DMC updated automatically.')
      await Promise.all([loadAwardList(), loadForClass(classId)])
    } catch {
      toast.error('Failed to save award list')
    } finally {
      setSaving(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  const completedCount = summary.filter((s) => s.status === 'complete').length

  return (
    <div className="space-y-5 pb-24">
      {/* Subject completion overview */}
      {classId && (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              {loadingSubjects ? 'Loading…' : `${completedCount} of ${subjects.length} subjects completed for this class`}
            </p>
          </div>
          {!loadingSubjects && subjects.length > 0 && (
            <>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${subjects.length > 0 ? (completedCount / subjects.length) * 100 : 0}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.map((s) => (
                  <button
                    key={s.subjectId}
                    onClick={() => onSubjectChange(String(s.subjectId))}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors',
                      String(s.subjectId) === subjectId && 'ring-2 ring-offset-1 ring-primary',
                      s.status === 'complete' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      s.status === 'partial' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                      s.status === 'none' && 'bg-slate-50 text-slate-500 border-slate-200'
                    )}
                  >
                    {s.status === 'complete' ? <CheckCircle2 className="h-3 w-3" /> : s.status === 'partial' ? <Clock className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                    {s.subjectName} — {s.status === 'complete' ? `Complete (${s.entries}/${s.totalStudents})` : s.status === 'partial' ? `Partial (${s.entries}/${s.totalStudents})` : 'Not Started'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        {classes.length > 1 && (
          <div className="space-y-1.5 w-48">
            <Label>Class *</Label>
            <Select value={classId} onValueChange={(v) => onClassChange(v ?? '')}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select class…" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name} – {c.section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5 w-56">
          <Label>Subject *</Label>
          <Select value={subjectId} onValueChange={(v) => onSubjectChange(v ?? '')} disabled={!classId || subjects.length === 0}>
            <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Select subject…" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {awardList && (
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer pb-1.5">
            <input type="checkbox" checked={splitMode} onChange={(e) => setSplitMode(e.target.checked)} className="rounded" />
            Split into Theory / Practical
          </label>
        )}
        {subjectId && classId && awardList && (
          <Link
            href={`/print/awardlist/${examId}/${subjectId}/${classId}`}
            target="_blank"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2 ml-auto')}
          >
            <Printer className="h-3.5 w-3.5" />
            Print Award List
          </Link>
        )}
      </div>

      {!classId && <p className="text-center py-12 text-sm text-muted-foreground">Select a class to begin.</p>}
      {classId && !subjectId && !loadingSubjects && (
        <p className="text-center py-12 text-sm text-muted-foreground">Select a subject to enter marks.</p>
      )}

      {loadingList && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-2 border-b"><Skeleton className="h-4 w-40" /><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /></div>
          ))}
        </div>
      )}

      {!loadingList && awardList && awardList.rows.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">No active students in this class.</p>
      )}

      {!loadingList && awardList && awardList.rows.length > 0 && (
        <>
          {/* Set total for all */}
          <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2">
            <Label className="text-xs whitespace-nowrap">Total Marks:</Label>
            <input
              type="text" inputMode="decimal" placeholder="e.g. 100" value={setAllTotal}
              onChange={(e) => isNumericInput(e.target.value) && setSetAllTotal(e.target.value)}
              className="w-24 h-8 px-2 rounded-lg border border-input bg-white text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <Button size="sm" variant="outline" onClick={applyTotalForAll}>Apply to All</Button>
          </div>

          <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Sr#</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Student Name</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Reg#</th>
                  {splitMode ? (
                    <>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 w-24">Theory</th>
                      <th className="px-3 py-3 text-center font-semibold text-slate-700 w-24">Practical</th>
                    </>
                  ) : (
                    <th className="px-3 py-3 text-center font-semibold text-slate-700 w-28">Marks Obtained</th>
                  )}
                  <th className="px-3 py-3 text-center font-semibold text-slate-700 w-24">Total Obtained</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700 w-24">Total Marks</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700 w-16">Grade</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700 w-16">Absent</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-700 w-16">Withheld</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-700">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {awardList.rows.map((row, idx) => {
                  const f = form[row.student.id] ?? EMPTY_ROW
                  const grade = liveGrade(row.student.id)
                  const obtained = rowObtained(f)
                  const hasError = !!errors[row.student.id]
                  const disabled = f.isAbsent || f.isWithheld
                  return (
                    <tr
                      key={row.student.id}
                      className={cn(
                        'transition-colors',
                        f.isAbsent ? 'bg-yellow-50/60' : f.isWithheld ? 'bg-slate-100/70' : 'hover:bg-slate-50/50',
                        hasError && 'bg-red-100/60'
                      )}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        {row.student.firstName} {row.student.lastName}
                        {hasError && <p className="text-xs text-red-500 mt-0.5">{errors[row.student.id]}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{row.student.registrationNumber}</td>
                      {splitMode ? (
                        <>
                          <td className="px-3 py-2.5 text-center">
                            <input type="text" inputMode="decimal" disabled={disabled} value={f.theory}
                              onChange={(e) => setField(row.student.id, 'theory', e.target.value)}
                              className="w-20 text-center h-8 px-2 rounded-lg border border-input bg-transparent text-sm disabled:opacity-50 disabled:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <input type="text" inputMode="decimal" disabled={disabled} value={f.practical}
                              onChange={(e) => setField(row.student.id, 'practical', e.target.value)}
                              className="w-20 text-center h-8 px-2 rounded-lg border border-input bg-transparent text-sm disabled:opacity-50 disabled:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                          </td>
                        </>
                      ) : (
                        <td className="px-3 py-2.5 text-center">
                          <input type="text" inputMode="decimal" disabled={disabled} value={f.obtained}
                            onChange={(e) => setField(row.student.id, 'obtained', e.target.value)}
                            className={cn(
                              'w-20 text-center h-8 px-2 rounded-lg border bg-transparent text-sm disabled:opacity-50 disabled:bg-slate-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                              hasError ? 'border-red-400 ring-1 ring-red-300' : 'border-input'
                            )} />
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-center font-semibold text-slate-700">{obtained ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <input type="text" inputMode="decimal" placeholder="100" value={f.total}
                          onChange={(e) => setField(row.student.id, 'total', e.target.value)}
                          className={cn(
                            'w-20 text-center h-8 px-2 rounded-lg border bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                            hasError ? 'border-red-400 ring-1 ring-red-300' : 'border-input'
                          )} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {grade !== '—' ? (
                          <span className={cn('inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold', GRADE_COLORS[grade] ?? GRADE_COLORS['N/A'])}>{grade}</span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" checked={f.isAbsent} onChange={(e) => toggleAbsent(row.student.id, e.target.checked)} className="rounded h-4 w-4" />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <input type="checkbox" checked={f.isWithheld} onChange={(e) => toggleWithheld(row.student.id, e.target.checked)} className="rounded h-4 w-4" />
                      </td>
                      <td className="px-3 py-2.5">
                        <input type="text" placeholder="optional" value={f.remarks}
                          onChange={(e) => setField(row.student.id, 'remarks', e.target.value)}
                          className="w-full h-8 px-2 rounded-lg border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Live stats bar */}
          <div className="flex flex-wrap gap-4 rounded-lg border bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
            <span>Entered: <b className="text-slate-900">{stats.entered}</b></span>
            <span>Absent: <b className="text-slate-900">{stats.absent}</b></span>
            <span>Average: <b className="text-slate-900">{stats.average}%</b></span>
            <span>Pass: <b className="text-emerald-700">{stats.pass}</b></span>
            <span>Fail: <b className="text-red-700">{stats.fail}</b></span>
          </div>

          <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background border-t shadow-lg px-4 md:px-6 py-3 z-30">
            <div className="max-w-6xl mx-auto flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving…' : 'Save Award List'}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
