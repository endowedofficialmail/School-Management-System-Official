'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { getExamById } from '@/lib/actions/exams'
import BackButton from '@/components/shared/BackButton'
import AccessDenied from '@/components/shared/AccessDenied'

import AwardListTab from './AwardListTab'
import ClassResultTab from './ClassResultTab'
import DMCTab from './DMCTab'

type Exam = NonNullable<Awaited<ReturnType<typeof getExamById>>>

function ResultsPageInner() {
  const { data: session, status } = useSession()
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const examId = Number(params.id)

  const [exam, setExam] = useState<Exam | null>(null)
  const [loadingExam, setLoadingExam] = useState(true)

  const [activeTab, setActiveTab] = useState(() => searchParams?.get('tab') ?? 'awardlist')
  const [classId, setClassId] = useState(() => searchParams?.get('classId') ?? '')
  const [subjectId, setSubjectId] = useState(() => searchParams?.get('subjectId') ?? '')
  const [studentId, setStudentId] = useState(() => searchParams?.get('studentId') ?? '')

  useEffect(() => {
    getExamById(examId).then((e) => {
      setExam(e)
      setLoadingExam(false)
      if (e && !classId) {
        const classes = e.examClasses?.length ? e.examClasses.map((ec) => ec.class) : e.class ? [e.class] : []
        if (classes.length > 0) setClassId(String(classes[0].id))
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId])

  // Sync state to URL (shallow, no scroll/reload)
  useEffect(() => {
    const qs = new URLSearchParams()
    qs.set('tab', activeTab)
    if (classId) qs.set('classId', classId)
    if (activeTab === 'awardlist' && subjectId) qs.set('subjectId', subjectId)
    if (activeTab === 'dmc' && studentId) qs.set('studentId', studentId)
    router.replace(`${pathname}?${qs.toString()}`, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, classId, subjectId, studentId])

  const setClassAndReset = useCallback((v: string) => {
    setClassId(v)
    setSubjectId('')
    setStudentId('')
  }, [])

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

  const classes = exam.examClasses?.length
    ? exam.examClasses.map((ec) => ec.class)
    : exam.class
      ? [exam.class]
      : []

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start gap-3">
        <BackButton />
        <div>
          <h1 className="text-xl font-bold tracking-tight">{exam.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {classes.length > 0 ? classes.map((c) => `${c.name} – ${c.section}`).join(', ') : '—'} &nbsp;·&nbsp; {exam.academicYear.name}
          </p>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          This exam has no classes assigned.
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v ?? 'awardlist')}>
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="awardlist">Award List</TabsTrigger>
            <TabsTrigger value="classresult">Class Result</TabsTrigger>
            <TabsTrigger value="dmc">Result Card / DMC</TabsTrigger>
          </TabsList>

          <TabsContent value="awardlist" className="pt-4">
            <AwardListTab
              examId={examId}
              classes={classes}
              classId={classId}
              subjectId={subjectId}
              onClassChange={setClassAndReset}
              onSubjectChange={setSubjectId}
            />
          </TabsContent>

          <TabsContent value="classresult" className="pt-4">
            <ClassResultTab
              examId={examId}
              classes={classes}
              classId={classId}
              onClassChange={setClassAndReset}
            />
          </TabsContent>

          <TabsContent value="dmc" className="pt-4">
            <DMCTab
              examId={examId}
              classes={classes}
              classId={classId}
              studentId={studentId}
              onClassChange={setClassAndReset}
              onStudentChange={setStudentId}
            />
          </TabsContent>
        </Tabs>
      )}
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
