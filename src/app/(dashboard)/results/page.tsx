'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Printer, ClipboardList, ExternalLink, BarChart2 } from 'lucide-react'
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
import { getExams, getClassResultSummary, type ClassSummaryData, type ExamWithDetails } from '@/lib/actions/exams'

function RankBadge({ rank }: { rank: number | null }) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />
  if (rank === 2) return <Trophy className="h-4 w-4 text-slate-400" />
  if (rank === 3) return <Trophy className="h-4 w-4 text-amber-700" />
  return <span className="text-slate-600 text-sm">{rank ?? '—'}</span>
}

function ResultsHubInner() {
  const searchParams = useSearchParams()
  const [exams, setExams] = useState<ExamWithDetails[]>([])
  const [selectedExamId, setSelectedExamId] = useState(() => searchParams?.get('examId') ?? '')
  const [summary, setSummary] = useState<ClassSummaryData | null>(null)
  const [loadingExams, setLoadingExams] = useState(true)
  const [loadingSummary, setLoadingSummary] = useState(false)

  useEffect(() => {
    getExams().then((data) => {
      setExams(data)
      if (!selectedExamId && data.length > 0) setSelectedExamId(String(data[0].id))
      setLoadingExams(false)
    })
  }, [selectedExamId])

  const loadSummary = useCallback(async (examId: string) => {
    if (!examId) return
    setLoadingSummary(true)
    const data = await getClassResultSummary(Number(examId))
    setSummary(data)
    setLoadingSummary(false)
  }, [])

  useEffect(() => { if (selectedExamId) loadSummary(selectedExamId) }, [selectedExamId, loadSummary])

  const selectedExam = exams.find((e) => String(e.id) === selectedExamId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Results</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Class rankings and performance overview</p>
          </div>
        </div>
        {selectedExamId && (
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/exams/${selectedExamId}/results`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
            >
              <ClipboardList className="h-4 w-4" />
              Enter Results
            </Link>
            <Link
              href={`/print/result-card/${selectedExamId}/all`}
              target="_blank"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
            >
              <Printer className="h-4 w-4" />
              Print All Cards
            </Link>
          </div>
        )}
      </div>

      {/* Exam selector */}
      <div className="max-w-sm space-y-1.5">
        <label className="text-sm font-medium">Select Exam</label>
        {loadingExams ? (
          <Skeleton className="h-9 w-full rounded-lg" />
        ) : exams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exams found. <Link href="/exams" className="text-primary hover:underline">Create one here</Link>.</p>
        ) : (
          <Select value={selectedExamId} onValueChange={(v) => setSelectedExamId(v ?? '')}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder="Select exam…" />
            </SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>
                  {e.name} — {e.examClasses?.length
                    ? e.examClasses.map((ec) => `${ec.class.name} ${ec.class.section}`).join(', ')
                    : e.class
                      ? `${e.class.name} ${e.class.section}`
                      : '—'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary */}
      {loadingSummary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : !summary || summary.totalStudents === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed rounded-xl">
          <BarChart2 className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium text-slate-700">
            {selectedExam ? `No results yet for "${selectedExam.name}"` : 'Select an exam above'}
          </p>
          {selectedExamId && (
            <Link href={`/exams/${selectedExamId}/results`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
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
              { label: 'Class Average', value: `${summary.classAverage}%`, cls: 'text-blue-700' },
              { label: 'Total Students', value: summary.totalStudents, cls: 'text-slate-700' },
              { label: 'Passed', value: summary.passCount, cls: 'text-emerald-700' },
              { label: 'Failed', value: summary.failCount, cls: 'text-red-700' },
              { label: 'Top Score', value: summary.performances[0] ? `${Number(summary.performances[0].percentage).toFixed(1)}%` : '—', cls: 'text-yellow-700' },
            ].map((c) => (
              <Card key={c.label} className="shadow-sm">
                <CardContent className="p-4 text-center">
                  <p className={cn('text-2xl font-bold', c.cls)}>{c.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Rankings */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Class Rankings — {summary.exam.name}
              </CardTitle>
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
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summary.performances.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <RankBadge rank={p.rank} />
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {p.student.firstName} {p.student.lastName}
                          <span className="ml-1.5 text-xs text-muted-foreground font-mono">{p.student.registrationNumber}</span>
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
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/print/result-card/${selectedExamId}/${p.studentId}`}
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
        </>
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
