'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Save, AlertCircle, Trophy, ExternalLink, Printer, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'

import { Button, buttonVariants } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import {
  getExamById, getSubjectsByClass, getResultsForExamAndSubject,
  saveResults, getClassResultSummary, getSubjectWiseResult,
  type SubjectWithTeacher, type ResultRow, type ClassSummaryData, type SubjectAnalysisData,
} from '@/lib/actions/exams'
import { calculateGrade, GRADE_COLORS } from '@/lib/grade'
import BackButton from '@/components/shared/BackButton'
import AccessDenied from '@/components/shared/AccessDenied'

type Exam = NonNullable<Awaited<ReturnType<typeof getExamById>>>

// ─── Medal component ──────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" aria-label="1st" />
  if (rank === 2) return <Trophy className="h-4 w-4 text-slate-400" aria-label="2nd" />
  if (rank === 3) return <Trophy className="h-4 w-4 text-amber-700" aria-label="3rd" />
  return <span className="text-slate-600 text-sm">{rank ?? '—'}</span>
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function ResultsPageInner() {
  const { data: session, status } = useSession()
  const params = useParams()
  const searchParams = useSearchParams()
  const examId = Number(params.id)

  const [exam, setExam] = useState<Exam | null>(null)
  const [subjects, setSubjects] = useState<SubjectWithTeacher[]>([])
  const [loadingExam, setLoadingExam] = useState(true)

  // ── Tab 1 state ──────────────────────────────────────────────────────────
  const [selectedSubject, setSelectedSubject] = useState(() => searchParams?.get('subject') ?? '')
  const [rows, setRows] = useState<ResultRow[]>([])
  const [marks, setMarks] = useState<Record<number, { obtained: string; total: string; remarks: string }>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [loadingRows, setLoadingRows] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSubjects, setSavedSubjects] = useState<Set<number>>(new Set())

  // ── Tab 2 state ──────────────────────────────────────────────────────────
  const [classSummary, setClassSummary] = useState<ClassSummaryData | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  // ── Tab 3 state ──────────────────────────────────────────────────────────
  const [analysisSubject, setAnalysisSubject] = useState('')
  const [analysis, setAnalysis] = useState<SubjectAnalysisData | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)

  const [activeTab, setActiveTab] = useState('enter')

  // ── Load exam + subjects ─────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const e = await getExamById(examId)
      setExam(e)
      if (e) {
        const classIds = e.examClasses?.length
          ? e.examClasses.map((ec) => ec.classId)
          : e.classId
            ? [e.classId]
            : []
        const allSubs = await Promise.all(classIds.map((cid) => getSubjectsByClass(cid)))
        const merged = new Map<number, (typeof allSubs)[0][number]>()
        allSubs.flat().forEach((s) => merged.set(s.id, s))
        const subs = Array.from(merged.values())
        setSubjects(subs)
        // Determine which subjects have saved results
        const results = await Promise.all(
          subs.map((s) => getResultsForExamAndSubject(examId, s.id))
        )
        const saved = new Set<number>()
        results.forEach((rows, i) => {
          if (rows.some((r) => r.marksObtained !== null)) saved.add(subs[i].id)
        })
        setSavedSubjects(saved)
      }
      setLoadingExam(false)
    }
    init()
  }, [examId])

  // ── Load rows when subject changes (Tab 1) ───────────────────────────────

  const loadRows = useCallback(async () => {
    if (!selectedSubject) return
    setLoadingRows(true)
    const data = await getResultsForExamAndSubject(examId, Number(selectedSubject))
    setRows(data)
    const map: Record<number, { obtained: string; total: string; remarks: string }> = {}
    data.forEach((r) => {
      map[r.student.id] = {
        obtained: r.marksObtained !== null ? String(r.marksObtained) : '',
        total: r.totalMarks !== null ? String(r.totalMarks) : '',
        remarks: r.remarks ?? '',
      }
    })
    setMarks(map)
    setErrors({})
    setLoadingRows(false)
  }, [examId, selectedSubject])

  useEffect(() => { loadRows() }, [loadRows])

  // ── Load class summary when tab 2 becomes active ─────────────────────────

  useEffect(() => {
    if (activeTab !== 'summary') return
    setLoadingSummary(true)
    getClassResultSummary(examId).then((data) => {
      setClassSummary(data)
      setLoadingSummary(false)
    })
  }, [activeTab, examId])

  // ── Load subject analysis when subject changes (Tab 3) ───────────────────

  useEffect(() => {
    if (!analysisSubject) return
    setLoadingAnalysis(true)
    getSubjectWiseResult(examId, Number(analysisSubject)).then((data) => {
      setAnalysis(data)
      setLoadingAnalysis(false)
    })
  }, [examId, analysisSubject])

  // ── Mark helpers ─────────────────────────────────────────────────────────

  function setField(studentId: number, field: 'obtained' | 'total' | 'remarks', value: string) {
    if (field !== 'remarks' && value !== '' && !/^\d*\.?\d*$/.test(value)) return
    setMarks((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? { obtained: '', total: '', remarks: '' }), [field]: value },
    }))
    if (field !== 'remarks') {
      setErrors((prev) => { const n = { ...prev }; delete n[studentId]; return n })
    }
  }

  function liveGrade(studentId: number) {
    const m = marks[studentId]
    if (!m || m.obtained === '' || m.total === '') return '—'
    const obt = parseFloat(m.obtained), tot = parseFloat(m.total)
    if (isNaN(obt) || isNaN(tot)) return '—'
    return calculateGrade(obt, tot)
  }

  function isFailing(studentId: number) {
    const m = marks[studentId]
    if (!m || m.obtained === '' || m.total === '') return false
    const obt = parseFloat(m.obtained), tot = parseFloat(m.total)
    if (isNaN(obt) || isNaN(tot) || tot === 0) return false
    return (obt / tot) < 0.4
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    const newErrors: Record<number, string> = {}
    const results: { studentId: number; marksObtained: number; totalMarks: number; remarks?: string }[] = []

    for (const row of rows) {
      const m = marks[row.student.id]
      if (!m || m.obtained === '' || m.total === '') continue
      const obt = parseFloat(m.obtained), tot = parseFloat(m.total)
      if (isNaN(obt) || isNaN(tot)) continue
      if (obt > tot) { newErrors[row.student.id] = 'Marks cannot exceed total'; continue }
      results.push({ studentId: row.student.id, marksObtained: obt, totalMarks: tot, remarks: m.remarks || undefined })
    }

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); toast.error('Fix errors first'); return }
    if (results.length === 0) { toast.error('No marks entered'); return }

    setSaving(true)
    try {
      await saveResults({ examId, subjectId: Number(selectedSubject), results })
      setSavedSubjects((prev) => new Set(prev).add(Number(selectedSubject)))
      toast.success(`Results saved. Class performance summary updated.`)
    } catch { toast.error('Failed to save results') }
    finally { setSaving(false) }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (status === 'loading') return null
  if (session?.user?.role === 'RECEPTIONIST') return <AccessDenied />

  if (loadingExam) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3"><BackButton /><Skeleton className="h-7 w-64" /></div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center py-20 gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="font-medium text-slate-700">Exam not found</p>
        <Link href="/exams" className={buttonVariants({ variant: 'outline', size: 'sm' })}>Back to Exams</Link>
      </div>
    )
  }

  const progressText = `${savedSubjects.size} of ${subjects.length} subjects completed`

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold tracking-tight">{exam.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(exam.examClasses?.length
                ? exam.examClasses.map((ec) => `${ec.class.name} – ${ec.class.section}`).join(', ')
                : exam.class
                  ? `${exam.class.name} – ${exam.class.section}`
                  : '—')} &nbsp;·&nbsp; {exam.academicYear.name}
            </p>
          </div>
        </div>
        {subjects.length > 0 && (
          <span className="text-xs text-muted-foreground self-center bg-muted px-2.5 py-1 rounded-full">
            {progressText}
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="enter">Enter Results</TabsTrigger>
          <TabsTrigger value="summary">Class Summary</TabsTrigger>
          <TabsTrigger value="analysis">Subject Analysis</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Enter Results ────────────────────────────────────────── */}
        <TabsContent value="enter" className="pt-4 space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label>Subject *</Label>
            {subjects.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                No subjects for this class.{' '}
                <Link href="/teachers/subjects" className="font-medium underline">Add subjects here</Link>.
              </div>
            ) : (
              <Select value={selectedSubject} onValueChange={(v) => setSelectedSubject(v ?? '')}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select subject…" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                      {savedSubjects.has(s.id) && <span className="ml-1.5 text-emerald-600 text-xs">✓</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!selectedSubject && (
            <p className="text-center py-12 text-sm text-muted-foreground">Select a subject to enter results</p>
          )}

          {selectedSubject && loadingRows && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 py-2 border-b"><Skeleton className="h-4 w-40" /><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /></div>
              ))}
            </div>
          )}

          {selectedSubject && !loadingRows && rows.length > 0 && (
            <div className="rounded-xl border shadow-sm overflow-x-auto bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 w-28">Total</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 w-28">Obtained</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 w-16">Grade</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, idx) => {
                    const grade = liveGrade(row.student.id)
                    const failing = isFailing(row.student.id)
                    const hasError = !!errors[row.student.id]
                    return (
                      <tr
                        key={row.student.id}
                        className={cn(
                          'transition-colors',
                          failing ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-slate-50/50',
                          hasError && 'bg-red-100/60'
                        )}
                      >
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {row.student.firstName} {row.student.lastName}
                          {failing && <span className="ml-1.5 text-xs text-red-500">(Failing)</span>}
                          {hasError && <p className="text-xs text-red-500 mt-0.5">{errors[row.student.id]}</p>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="text" inputMode="decimal" placeholder="100"
                            value={marks[row.student.id]?.total ?? ''}
                            onChange={(e) => setField(row.student.id, 'total', e.target.value)}
                            className="w-20 text-center h-8 px-2 rounded-lg border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="text" inputMode="decimal" placeholder="85"
                            value={marks[row.student.id]?.obtained ?? ''}
                            onChange={(e) => setField(row.student.id, 'obtained', e.target.value)}
                            className={cn(
                              'w-20 text-center h-8 px-2 rounded-lg border bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                              hasError ? 'border-red-400 ring-1 ring-red-300' : 'border-input'
                            )} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {grade !== '—' ? (
                            <span className={cn('inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold', GRADE_COLORS[grade] ?? GRADE_COLORS['N/A'])}>{grade}</span>
                          ) : <span className="text-slate-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <input type="text" placeholder="optional"
                            value={marks[row.student.id]?.remarks ?? ''}
                            onChange={(e) => setField(row.student.id, 'remarks', e.target.value)}
                            className="w-full h-8 px-2 rounded-lg border border-input bg-transparent text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {selectedSubject && !loadingRows && rows.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">No active students in this class.</p>
          )}

          {selectedSubject && !loadingRows && rows.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background border-t shadow-lg px-4 md:px-6 py-3 z-30">
              <div className="max-w-4xl mx-auto flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving…' : 'Save Results'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Class Summary ────────────────────────────────────────── */}
        <TabsContent value="summary" className="pt-4 space-y-6">
          {loadingSummary ? (
            <div className="space-y-4"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
          ) : !classSummary || classSummary.totalStudents === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed rounded-xl">
              <BarChart2 className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-slate-700">No results entered yet</p>
              <p className="text-sm text-muted-foreground">Enter marks in the &quot;Enter Results&quot; tab first.</p>
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Class Average', value: `${classSummary.classAverage}%`, color: 'bg-blue-50 text-blue-700' },
                  { label: 'Total Students', value: classSummary.totalStudents, color: 'bg-slate-50 text-slate-700' },
                  { label: 'Passed', value: classSummary.passCount, color: 'bg-emerald-50 text-emerald-700' },
                  { label: 'Failed', value: classSummary.failCount, color: 'bg-red-50 text-red-700' },
                  { label: 'Top Scorer', value: classSummary.performances[0] ? `${Number(classSummary.performances[0].percentage).toFixed(1)}%` : '—', color: 'bg-yellow-50 text-yellow-700' },
                ].map((c) => (
                  <Card key={c.label} className="shadow-sm">
                    <CardContent className="p-4 text-center">
                      <p className={cn('text-2xl font-bold', c.color.split(' ')[1])}>{c.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Rankings table */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Class Rankings</CardTitle>
                    <button onClick={() => window.print()} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2 no-print')}>
                      <Printer className="h-3.5 w-3.5" />
                      Print Summary
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border shadow-sm">
                    <table className="w-full min-w-[600px] text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Rank</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Reg#</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700">Total Marks</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700">Percentage</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-700">Grade</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-700 no-print">Card</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {classSummary.performances.map((p) => (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <RankBadge rank={p.rank} />
                              </div>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {p.student.firstName} {p.student.lastName}
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.student.registrationNumber}</td>
                            <td className="px-4 py-3 text-right text-slate-700">
                              {Number(p.totalMarksObtained).toFixed(0)}/{Number(p.totalPossibleMarks).toFixed(0)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{Number(p.percentage).toFixed(1)}%</td>
                            <td className="px-4 py-3 text-center">
                              <span className={cn('inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold', GRADE_COLORS[p.grade] ?? GRADE_COLORS['N/A'])}>
                                {p.grade}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={cn('text-xs', p.isPassed ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-red-100 text-red-700 hover:bg-red-100')}>
                                {p.isPassed ? 'Pass' : 'Fail'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center no-print">
                              <Link
                                href={`/print/result-card/${examId}/${p.studentId}`}
                                target="_blank"
                                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 w-7 p-0')}
                                title="Open Result Card"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Subject averages */}
              {classSummary.subjectAverages.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Subject Averages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-lg border shadow-sm">
                      <table className="w-full min-w-[400px] text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b">
                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Subject</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-700">Avg Marks</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-700">Avg %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {classSummary.subjectAverages.map((s) => (
                            <tr key={s.subjectId} className="hover:bg-muted/30">
                              <td className="px-4 py-2.5 font-medium text-slate-800">{s.name}</td>
                              <td className="px-4 py-2.5 text-right text-slate-600">{s.avgObtained}/{s.avgTotal}</td>
                              <td className="px-4 py-2.5 text-right font-semibold">{s.avgPct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Print all cards */}
              <div className="flex justify-end no-print">
                <Link
                  href={`/print/result-card/${examId}/all`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                >
                  <Printer className="h-4 w-4" />
                  Print All Result Cards
                </Link>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Tab 3: Subject Analysis ─────────────────────────────────────── */}
        <TabsContent value="analysis" className="pt-4 space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label>Select Subject</Label>
            <Select value={analysisSubject} onValueChange={(v) => setAnalysisSubject(v ?? '')}>
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select subject…" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!analysisSubject && (
            <p className="text-center py-12 text-sm text-muted-foreground">Select a subject to see analysis</p>
          )}

          {analysisSubject && loadingAnalysis && <Skeleton className="h-48 rounded-xl" />}

          {analysisSubject && !loadingAnalysis && !analysis && (
            <p className="text-center py-12 text-sm text-muted-foreground">No results entered for this subject yet.</p>
          )}

          {analysisSubject && !loadingAnalysis && analysis && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Subject Average', value: `${analysis.average}%` },
                  { label: 'Topper', value: analysis.topper ? analysis.topper.name.split(' ')[0] : '—' },
                  { label: 'Passed', value: analysis.passCount },
                  { label: 'Failed', value: analysis.failCount },
                ].map((c, i) => (
                  <Card key={i} className="shadow-sm">
                    <CardContent className="p-4 text-center">
                      <p className="text-xl font-bold text-slate-800">{c.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Bar chart */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Marks Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: Math.max(200, analysis.results.length * 36) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analysis.results.map((r) => ({ name: r.name.split(' ')[0], marks: r.marksObtained, total: r.totalMarks }))}
                        layout="vertical"
                        margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, analysis.results[0]?.totalMarks ?? 100]} tickCount={6} fontSize={11} />
                        <YAxis type="category" dataKey="name" width={80} fontSize={11} />
                        <Tooltip formatter={(value) => [`${value} marks`, 'Obtained']} />
                        <Bar dataKey="marks" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Details table */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Student Results — {analysis.subject.name}</CardTitle>
                    <button onClick={() => window.print()} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2 no-print')}>
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border shadow-sm">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700">Obtained</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700">Total</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700">%</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-700">Grade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {analysis.results.map((r) => (
                          <tr key={r.studentId} className={cn('hover:bg-muted/30', !r.passed && 'bg-red-50/40')}>
                            <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                            <td className="px-4 py-2.5 text-right">{r.marksObtained}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{r.totalMarks}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">{r.percentage}%</td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={cn('inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold', GRADE_COLORS[r.grade] ?? GRADE_COLORS['N/A'])}>{r.grade}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 rounded-xl" /></div>}>
      <ResultsPageInner />
    </Suspense>
  )
}
