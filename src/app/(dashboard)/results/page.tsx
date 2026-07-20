'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Printer, ClipboardList, ExternalLink, BarChart2, CheckCircle2, Clock, Circle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

import BackButton from '@/components/shared/BackButton'
import { GRADE_COLORS } from '@/lib/grade'
import {
  getExams,
  getClassResult,
  getAwardListSummary,
  type ExamWithDetails,
  type ClassResultData,
  type AwardListSummaryItem,
} from '@/lib/actions/exams'

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500 inline" />
  if (rank === 2) return <Trophy className="h-4 w-4 text-slate-400 inline" />
  if (rank === 3) return <Trophy className="h-4 w-4 text-amber-700 inline" />
  return <span className="text-slate-600 text-sm">{rank ?? '—'}</span>
}

const RESULT_BADGE: Record<string, string> = {
  Pass: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  Fail: 'bg-red-100 text-red-700 hover:bg-red-100',
  Absent: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  Withheld: 'bg-slate-200 text-slate-600 hover:bg-slate-200',
  Pending: 'bg-slate-100 text-slate-400 hover:bg-slate-100',
}

function ResultsHubInner() {
  const searchParams = useSearchParams()
  const [exams, setExams] = useState<ExamWithDetails[]>([])
  const [selectedExamId, setSelectedExamId] = useState(() => searchParams?.get('examId') ?? '')
  const [selectedClassId, setSelectedClassId] = useState(() => searchParams?.get('classId') ?? '')

  const [classResult, setClassResult] = useState<ClassResultData | null>(null)
  const [awardSummary, setAwardSummary] = useState<AwardListSummaryItem[]>([])
  const [loadingExams, setLoadingExams] = useState(true)
  const [loadingResult, setLoadingResult] = useState(false)

  useEffect(() => {
    getExams().then((data) => {
      setExams(data)
      if (!selectedExamId && data.length > 0) {
        const id = String(data[0].id)
        setSelectedExamId(id)
        // auto-select first class
        const first = data[0]
        const firstClassId = first.examClasses?.length
          ? String(first.examClasses[0].class.id)
          : first.class ? String(first.class.id) : ''
        if (firstClassId) setSelectedClassId(firstClassId)
      }
      setLoadingExams(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = useCallback(async (examId: string, classId: string) => {
    if (!examId || !classId) return
    setLoadingResult(true)
    const [cr, as] = await Promise.all([
      getClassResult(Number(examId), Number(classId)),
      getAwardListSummary(Number(examId), Number(classId)),
    ])
    setClassResult(cr)
    setAwardSummary(as)
    setLoadingResult(false)
  }, [])

  useEffect(() => {
    if (selectedExamId && selectedClassId) loadData(selectedExamId, selectedClassId)
  }, [selectedExamId, selectedClassId, loadData])

  const selectedExam = exams.find((e) => String(e.id) === selectedExamId)
  const classes = selectedExam
    ? selectedExam.examClasses?.length
      ? selectedExam.examClasses.map((ec) => ec.class)
      : selectedExam.class ? [selectedExam.class] : []
    : []

  function handleExamChange(v: string | null) {
    if (!v) return
    setSelectedExamId(v)
    const exam = exams.find((e) => String(e.id) === v)
    if (exam) {
      const firstClass = exam.examClasses?.length
        ? String(exam.examClasses[0].class.id)
        : exam.class ? String(exam.class.id) : ''
      setSelectedClassId(firstClass)
    } else {
      setSelectedClassId('')
    }
    setClassResult(null)
    setAwardSummary([])
  }

  const hasResults = classResult && classResult.rows.some((r) => r.percentage !== null)
  const top5 = classResult
    ? classResult.rows.filter((r) => r.rank !== null).slice(0, 5)
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Results</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Award lists, class results, and DMCs</p>
          </div>
        </div>
        {selectedExamId && (
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/exams/${selectedExamId}/results`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
            >
              <ClipboardList className="h-4 w-4" />
              Enter / View Results
            </Link>
            {selectedClassId && (
              <>
                <Link
                  href={`/print/classresult/${selectedExamId}/${selectedClassId}`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                >
                  <Printer className="h-4 w-4" />
                  Print Class Result
                </Link>
                <Link
                  href={`/print/dmc/${selectedExamId}/class/${selectedClassId}`}
                  target="_blank"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                >
                  <FileText className="h-4 w-4" />
                  Print All DMCs
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Exam + Class selectors */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1.5 min-w-[200px]">
          <label className="text-sm font-medium">Select Exam</label>
          {loadingExams ? (
            <Skeleton className="h-9 w-48 rounded-lg" />
          ) : exams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No exams found.{' '}
              <Link href="/exams" className="text-primary hover:underline">Create one</Link>.
            </p>
          ) : (
            <Select value={selectedExamId} onValueChange={handleExamChange}>
              <SelectTrigger className="h-9 w-full min-w-[200px]">
                <SelectValue placeholder="Select exam…" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {classes.length > 1 && (
          <div className="space-y-1.5 min-w-[180px]">
            <label className="text-sm font-medium">Class</label>
            <Select value={selectedClassId} onValueChange={(v: string | null) => setSelectedClassId(v ?? '')}>
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
        )}
      </div>

      {/* Award List Status */}
      {selectedExamId && selectedClassId && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Award List Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingResult ? (
              <div className="flex gap-2 flex-wrap">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-44 rounded-full" />)}
              </div>
            ) : awardSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No subjects found for this class.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {awardSummary.map((s) => (
                  <Link
                    key={s.subjectId}
                    href={`/exams/${selectedExamId}/results?tab=awardlist&classId=${selectedClassId}&subjectId=${s.subjectId}`}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors hover:opacity-80',
                      s.status === 'complete' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      s.status === 'partial' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                      s.status === 'none' && 'bg-slate-50 text-slate-500 border-slate-200',
                    )}
                  >
                    {s.status === 'complete'
                      ? <CheckCircle2 className="h-3 w-3" />
                      : s.status === 'partial'
                        ? <Clock className="h-3 w-3" />
                        : <Circle className="h-3 w-3" />}
                    {s.subjectName} — {s.status === 'complete'
                      ? `Complete (${s.entries}/${s.totalStudents})`
                      : s.status === 'partial'
                        ? `Partial (${s.entries}/${s.totalStudents})`
                        : 'Not Started'}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Navigation */}
      {selectedExamId && selectedClassId && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href={`/exams/${selectedExamId}/results?tab=awardlist&classId=${selectedClassId}`}
            className="block rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <ClipboardList className="h-8 w-8 text-blue-600 mb-2" />
            <p className="font-semibold text-slate-900">Enter Marks</p>
            <p className="text-xs text-muted-foreground mt-0.5">Award List — marks entry point</p>
          </Link>
          <Link
            href={`/exams/${selectedExamId}/results?tab=classresult&classId=${selectedClassId}`}
            className="block rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <BarChart2 className="h-8 w-8 text-emerald-600 mb-2" />
            <p className="font-semibold text-slate-900">View Class Result</p>
            <p className="text-xs text-muted-foreground mt-0.5">Auto-generated rankings and totals</p>
          </Link>
          <Link
            href={`/exams/${selectedExamId}/results?tab=dmc&classId=${selectedClassId}`}
            className="block rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <FileText className="h-8 w-8 text-purple-600 mb-2" />
            <p className="font-semibold text-slate-900">Print DMCs</p>
            <p className="text-xs text-muted-foreground mt-0.5">Result card per student or bulk print</p>
          </Link>
        </div>
      )}

      {/* Class Performance Summary + Top 5 */}
      {selectedExamId && selectedClassId && (
        <>
          {loadingResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
              <Skeleton className="h-64 rounded-xl" />
            </div>
          ) : !hasResults ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed rounded-xl">
              <BarChart2 className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-slate-700">
                {selectedExam ? `No results entered yet for "${selectedExam.name}"` : 'Select an exam'}
              </p>
              {selectedExamId && (
                <Link
                  href={`/exams/${selectedExamId}/results`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                >
                  <ClipboardList className="h-4 w-4" />
                  Enter Results Now
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: 'Total Students', value: classResult!.totalStudents, cls: 'text-slate-700' },
                  { label: 'Passed', value: classResult!.passCount, cls: 'text-emerald-700' },
                  { label: 'Failed', value: classResult!.failCount, cls: 'text-red-700' },
                  { label: 'Absent', value: classResult!.absentCount, cls: 'text-yellow-700' },
                  { label: 'Class Average', value: `${classResult!.classAverage}%`, cls: 'text-blue-700' },
                ].map((c) => (
                  <Card key={c.label} className="shadow-sm">
                    <CardContent className="p-4 text-center">
                      <p className={cn('text-2xl font-bold', c.cls)}>{c.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Top 5 */}
              {top5.length > 0 && (
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Top 5 Students — {selectedExam?.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-lg border shadow-sm">
                      <table className="w-full min-w-[560px] text-sm">
                        <thead>
                          <tr className="bg-muted/50 border-b">
                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Rank</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-700">Student</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-700">Percentage</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-700">Grade</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-700">DMC</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {top5.map((row) => (
                            <tr key={row.student.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3">
                                <RankBadge rank={row.rank} />
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {row.student.firstName} {row.student.lastName}
                                <span className="ml-1.5 text-xs text-muted-foreground font-mono">{row.student.registrationNumber}</span>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {row.percentage !== null ? `${row.percentage.toFixed(1)}%` : '—'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {row.grade ? (
                                  <span className={cn('inline-flex items-center justify-center w-10 h-6 rounded-full text-xs font-bold', GRADE_COLORS[row.grade] ?? GRADE_COLORS['N/A'])}>
                                    {row.grade}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge className={cn('text-xs', RESULT_BADGE[row.resultStatus] ?? RESULT_BADGE.Pending)}>
                                  {row.resultStatus}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Link
                                  href={`/print/dmc/${selectedExamId}/${row.student.id}`}
                                  target="_blank"
                                  className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-7 w-7 p-0')}
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
              )}
            </>
          )}
        </>
      )}

      {!selectedExamId && !loadingExams && exams.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 border border-dashed rounded-xl">
          <BarChart2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Select an exam above to view results</p>
        </div>
      )}
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 rounded-xl" /></div>}>
      <ResultsHubInner />
    </Suspense>
  )
}
