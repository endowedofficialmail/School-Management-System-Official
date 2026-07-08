'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft, ArrowUpCircle, CheckCircle2, CircleX, Search, Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import Breadcrumb from '@/components/shared/Breadcrumb'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import {
  getAvailableTargetClasses,
  getPromotionPrecheck,
  getStudentsForPromotion,
  promoteStudents,
  type PromotionStudentRow,
  type PromotionTargetClass,
} from '@/lib/actions/promotions'

type StudentSelection = {
  studentId: number
  promote: boolean
  notes?: string
}

type LatestPerf = {
  percentage: number
  grade: string
  rank?: number | null
  isPassed: boolean
  exam: { name: string }
} | null

type FiltersMode = 'ALL' | 'SELECTED' | 'DESELECTED'

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
}

function fmtPct(n: number) {
  return `${n.toFixed(1)}%`
}

export default function PromotionChecklistClient(props: {
  classId: number
  classLabel: string
  fromAcademicYearName: string
  promotedById: number
}) {
  const params = useParams()
  const classId = props.classId || Number(params.classId)

  const [students, setStudents] = useState<PromotionStudentRow[]>([])
  const [targetClasses, setTargetClasses] = useState<PromotionTargetClass[]>([])
  const [toClassId, setToClassId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<FiltersMode>('ALL')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<Awaited<ReturnType<typeof promoteStudents>> | null>(null)
  const [precheck, setPrecheck] = useState<{ alreadyPromoted: string[]; studentsWithDues: { name: string; voucherCount: number; totalDue: number }[]; warning?: string } | null>(null)

  const [selection, setSelection] = useState<Record<number, StudentSelection>>({})

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      getStudentsForPromotion(classId),
      getAvailableTargetClasses(classId),
    ]).then(([st, tc]) => {
      if (cancelled) return
      setStudents(st)
      setTargetClasses(tc)
      const sel: Record<number, StudentSelection> = {}
      st.forEach((s) => { sel[s.id] = { studentId: s.id, promote: true } })
      setSelection(sel)
      setLoading(false)
    }).catch((e) => {
      toast.error(e instanceof Error ? e.message : 'Failed to load promotion data')
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [classId])

  const toClass = useMemo(() => {
    const id = Number(toClassId)
    return targetClasses.find((c) => c.id === id) ?? null
  }, [toClassId, targetClasses])

  const selectedCount = useMemo(
    () => Object.values(selection).filter((s) => s.promote).length,
    [selection],
  )
  const deselectedCount = useMemo(
    () => Object.values(selection).filter((s) => !s.promote).length,
    [selection],
  )

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      const isSelected = selection[s.id]?.promote ?? true
      if (mode === 'SELECTED' && !isSelected) return false
      if (mode === 'DESELECTED' && isSelected) return false
      if (!q) return true
      const name = `${s.firstName} ${s.lastName}`.toLowerCase()
      return name.includes(q) || s.registrationNumber.toLowerCase().includes(q)
    })
  }, [students, selection, search, mode])

  function setAll(promote: boolean) {
    setSelection((prev) => {
      const next = { ...prev }
      students.forEach((s) => {
        next[s.id] = { studentId: s.id, promote, notes: promote ? undefined : next[s.id]?.notes }
      })
      return next
    })
  }

  async function handleConfirm() {
    if (!toClassId) {
      toast.error('Select a target class first')
      return
    }
    if (selectedCount === 0) {
      toast.error('Select at least one student to promote')
      return
    }
    setSaving(true)
    try {
      const res = await promoteStudents({
        fromClassId: classId,
        toClassId: Number(toClassId),
        toAcademicYearId: toClass?.academicYearId ?? Number(toClassId),
        promotedById: props.promotedById,
        students: Object.values(selection),
      })
      setResult(res)
      toast.success(`Promotion complete: ${res.promoted} promoted, ${res.heldBack} held back`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to promote students')
    } finally {
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  async function openPreview() {
    if (!toClassId) {
      toast.error('Select a target class first')
      return
    }
    const selectedIds = Object.values(selection).filter((s) => s.promote).map((s) => s.studentId)
    if (selectedIds.length === 0) {
      toast.error('Select at least one student to promote')
      return
    }
    try {
      const p = await getPromotionPrecheck({
        fromClassId: classId,
        toClassId: Number(toClassId),
        studentIds: selectedIds,
      })
      setPrecheck(p)
      setConfirmOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to preview promotion')
    }
  }

  const promotedStudents = useMemo(
    () => students.filter((s) => selection[s.id]?.promote),
    [students, selection],
  )
  const heldBackStudents = useMemo(
    () => students.filter((s) => !selection[s.id]?.promote),
    [students, selection],
  )

  if (result) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Classes', href: '/classes' },
          { label: 'Promote', href: '/classes/promote' },
          { label: props.classLabel },
        ]} />

        <Card className="shadow-sm border-emerald-200">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <h1 className="text-xl font-bold">Promotion Complete!</h1>
            </div>
            <p className="text-slate-700">
              <b>{result.promoted}</b> students promoted{toClass ? ` to ${toClass.name} – ${toClass.section}` : ''}.{' '}
              <b>{result.heldBack}</b> students held back.
            </p>
            {result.warning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                ⚠️ {result.warning}
              </div>
            )}
            {result.classNowEmpty && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                Note: {props.classLabel} now has 0 active students.
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {toClass && (
                <Link
                  href={`/classes/${toClass.id}`}
                  className={cn(buttonVariants({ size: 'sm' }), 'gap-2')}
                >
                  <Users className="h-4 w-4" />
                  View {toClass.name} – {toClass.section}
                </Link>
              )}
              <Link
                href={`/classes/promote/history?classId=${classId}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
              >
                View Promotion History
              </Link>
              <Link
                href="/classes"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
              >
                Back to Classes
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Classes', href: '/classes' },
        { label: 'Promote', href: '/classes/promote' },
        { label: props.classLabel },
      ]} />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Promote {props.classLabel}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Uncheck students to hold them back.
          </p>
        </div>
        <Link
          href="/classes/promote"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Promotion Destination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1.5">
            <Label>Promote to Class *</Label>
            <Select value={toClassId} onValueChange={(v) => setToClassId(v ?? '')}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select target class…" />
              </SelectTrigger>
              <SelectContent>
                {targetClasses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} – {c.section} ({c.academicYear.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select which class these students will move into.
            </p>
            {toClass && (
              <p className="text-xs text-slate-600">
                Target Academic Year: <b>{toClass.academicYear.name}</b>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {!toClassId ? (
        <Card className="shadow-sm">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Select a target class to start promoting students.
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Select Students to Promote ({selectedCount} of {students.length} selected)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <Button size="sm" variant="outline" onClick={() => setAll(true)}>
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAll(false)}>
                Deselect All
              </Button>
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-8"
                  placeholder="Search students…"
                />
              </div>
              <div className="flex gap-1">
                {(['ALL', 'SELECTED', 'DESELECTED'] as FiltersMode[]).map((m) => (
                  <Button
                    key={m}
                    size="sm"
                    variant={mode === m ? 'default' : 'outline'}
                    onClick={() => setMode(m)}
                  >
                    {m === 'ALL' ? 'All' : m === 'SELECTED' ? 'Selected' : 'Deselected'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading students…</div>
              ) : filteredStudents.length === 0 ? (
                <div className="text-sm text-muted-foreground">No students match your filters.</div>
              ) : (
                filteredStudents.map((s) => {
                  const sel = selection[s.id] ?? { studentId: s.id, promote: true }
                  const heldBack = !sel.promote
                  const perf = (s as unknown as { latestPerformance: LatestPerf }).latestPerformance
                  const pct = perf?.percentage ?? null
                  const passing = pct == null ? true : pct >= 50
                  return (
                    <div
                      key={s.id}
                      className={cn(
                        'rounded-xl border p-3 flex gap-3 items-start',
                        heldBack && 'border-l-4 border-l-red-400 bg-red-50/40',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="mt-1.5"
                        checked={sel.promote}
                        onChange={(e) => {
                          const promote = e.target.checked
                          setSelection((prev) => ({
                            ...prev,
                            [s.id]: { ...prev[s.id], studentId: s.id, promote, notes: promote ? undefined : prev[s.id]?.notes },
                          }))
                        }}
                      />
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-semibold shrink-0">
                        {initials(s.firstName, s.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {s.registrationNumber}
                            </p>
                          </div>
                          {perf ? (
                            <Badge className={cn(
                              'text-xs',
                              passing ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700',
                            )}>
                              Last Exam: {fmtPct(pct!)} ({perf.grade}){perf.rank ? ` — Rank ${perf.rank}` : ''}
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-slate-100 text-slate-600">
                              No exam record
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">
                          Guardian: <span className="font-medium">{s.guardianName}</span> — {s.guardianPhone}
                        </div>
                        {!sel.promote && (
                          <div className="mt-2 space-y-1.5">
                            <Label className="text-xs">Reason (optional)</Label>
                            <Input
                              value={sel.notes ?? ''}
                              onChange={(e) => {
                                const notes = e.target.value
                                setSelection((prev) => ({
                                  ...prev,
                                  [s.id]: { ...prev[s.id], studentId: s.id, promote: false, notes },
                                }))
                              }}
                              placeholder="Failed exams, guardian request, attendance issues…"
                              className="h-8"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky summary bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="text-sm text-slate-800">
            <span className="font-semibold text-emerald-700">✓ {selectedCount}</span> will be promoted
            {toClass ? (
              <span> to <b>{toClass.name} – {toClass.section}</b></span>
            ) : null}
            <span className="text-slate-300 mx-2">|</span>
            <span className="font-semibold text-red-700">✗ {deselectedCount}</span> held back
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={openPreview}
              disabled={!toClassId}
            >
              Preview
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={openPreview}
              disabled={!toClassId || selectedCount === 0}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Confirm Promotion
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm Class Promotion</DialogTitle>
            <DialogDescription>
              ⚠️ This action cannot be easily undone. Students will be moved to the new class immediately. Please verify your selection before proceeding.
            </DialogDescription>
          </DialogHeader>

          {precheck?.warning && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              ⚠️ {precheck.warning}
            </div>
          )}

          {precheck && precheck.alreadyPromoted.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              <p className="font-semibold">Already promoted in this academic year:</p>
              <p className="mt-1">{precheck.alreadyPromoted.join(', ')}</p>
            </div>
          )}

          {precheck && precheck.studentsWithDues.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-semibold">
                ⚠️ {precheck.studentsWithDues.length} students have outstanding fees totaling Rs.{' '}
                {precheck.studentsWithDues.reduce((s, x) => s + x.totalDue, 0).toLocaleString('en-PK')}.
              </p>
              <p className="mt-1">You can still promote them but their dues will remain.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">From</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">
                <div className="font-semibold">{props.classLabel}</div>
                <div className="text-xs text-muted-foreground">{props.fromAcademicYearName}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">To</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">
                <div className="font-semibold">
                  {toClass ? `${toClass.name} – ${toClass.section}` : '—'}
                </div>
                <div className="text-xs text-muted-foreground">{toClass?.academicYear.name ?? '—'}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                Will Be Promoted ({promotedStudents.length})
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border bg-emerald-50/30 p-2">
                {promotedStudents.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{s.firstName} {s.lastName}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-700 font-semibold">
                <CircleX className="h-4 w-4" />
                Will Be Held Back ({heldBackStudents.length})
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border bg-red-50/30 p-2">
                {heldBackStudents.map((s) => (
                  <div key={s.id} className="px-2 py-1 text-sm">
                    <div className="flex items-center gap-2">
                      <CircleX className="h-4 w-4 text-red-600" />
                      <span>{s.firstName} {s.lastName}</span>
                    </div>
                    {selection[s.id]?.notes && (
                      <div className="ml-6 text-xs text-red-700">
                        Reason: {selection[s.id]?.notes}
                      </div>
                    )}
                  </div>
                ))}
                {heldBackStudents.length === 0 && (
                  <div className="px-2 py-2 text-sm text-muted-foreground">None</div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Go Back & Edit
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? 'Promoting…' : 'Confirm & Promote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

