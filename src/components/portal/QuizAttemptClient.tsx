'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  startQuizAttempt,
  getQuizForAttempt,
  saveAnswer,
  submitQuiz,
  autoSubmitExpiredAttempt,
} from '@/lib/actions/quizzes'

type QuizData = Awaited<ReturnType<typeof getQuizForAttempt>>

type QuizResultItem = {
  questionId: number
  questionText: string
  questionType: string
  marks: number
  marksAwarded: number | null
  isCorrect: boolean | null
  explanation: string | null
  selectedOptionId: number | null
  textAnswer: string | null
  correctOption: { id: number; optionText: string; isCorrect: boolean } | null
  options: { id: number; optionText: string; isCorrect: boolean }[]
}

type SubmitResult =
  | { submitted: boolean; showResults: false }
  | {
      submitted: boolean
      showResults: true
      attempt: {
        id: number
        marksAwarded: number
        totalMarks: number
        percentage: number
        isPassed: boolean
        timeSpent: number | null
      }
      results: QuizResultItem[]
    }

export default function QuizAttemptClient({
  quizId,
  userId,
}: {
  quizId: number
  userId: number
}) {
  const [loading, setLoading] = useState(true)
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [attemptId, setAttemptId] = useState<number | null>(null)
  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<number, { selectedOptionId?: number; textAnswer?: string }>>({})
  const [remaining, setRemaining] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const autoSubmitted = useRef(false)
  const shortSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function init() {
      try {
        const { getQuizResults } = await import('@/lib/actions/quizzes')

        // Step 1: check if already completed with visible results
        const existing = await getQuizResults(quizId, userId, 'STUDENT')
        if (existing.attempt?.isCompleted) {
          setResult({
            submitted: true,
            showResults: true,
            attempt: existing.attempt,
            results: existing.attempt.answers.map((a) => ({
              questionId: a.questionId,
              questionText: a.question.questionText,
              questionType: a.question.questionType,
              marks: a.question.marks,
              marksAwarded: a.marksAwarded,
              isCorrect: a.isCorrect,
              explanation: a.question.explanation,
              selectedOptionId: a.selectedOptionId,
              textAnswer: a.textAnswer,
              correctOption: a.question.options.find((o) => o.isCorrect) ?? null,
              options: a.question.options.map((o) => ({
                id: o.id,
                optionText: o.optionText,
                isCorrect: o.isCorrect,
              })),
            })),
          })
          setLoading(false)
          return
        }

        // Step 2: load quiz data (returns { error } instead of throwing)
        const quizData = await getQuizForAttempt(quizId, userId)

        // Handle structured error from server action
        if ('error' in quizData) {
          setError(quizData.error ?? 'Unable to load quiz.')
          setLoading(false)
          return
        }

        // Step 3: already submitted but results not shown yet
        if (quizData.isCompleted) {
          // Try once more in case results just became available
          const refreshed = await getQuizResults(quizId, userId, 'STUDENT')
          if (refreshed.attempt?.isCompleted) {
            setResult({
              submitted: true,
              showResults: true,
              attempt: refreshed.attempt,
              results: refreshed.attempt.answers.map((a) => ({
                questionId: a.questionId,
                questionText: a.question.questionText,
                questionType: a.question.questionType,
                marks: a.question.marks,
                marksAwarded: a.marksAwarded,
                isCorrect: a.isCorrect,
                explanation: a.question.explanation,
                selectedOptionId: a.selectedOptionId,
                textAnswer: a.textAnswer,
                correctOption: a.question.options.find((o) => o.isCorrect) ?? null,
                options: a.question.options.map((o) => ({
                  id: o.id,
                  optionText: o.optionText,
                  isCorrect: o.isCorrect,
                })),
              })),
            })
          } else {
            setResult({ submitted: true, showResults: false })
          }
          setLoading(false)
          return
        }

        if (quizData.questions.length === 0) {
          setError('This quiz has no questions yet. Please check back later.')
          setLoading(false)
          return
        }

        // Step 4: start or resume the attempt
        const attempt = await startQuizAttempt(quizId, userId)
        setQuiz(quizData)
        setAttemptId(attempt.id)
        setStartedAt(new Date(attempt.startedAt))
        const durationMs = quizData.duration * 60 * 1000
        const elapsed = Date.now() - new Date(attempt.startedAt).getTime()
        setRemaining(Math.max(0, Math.floor((durationMs - elapsed) / 1000)))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to start quiz')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [quizId, userId])

  const handleSubmit = useCallback(async (timedOut = false) => {
    if (!attemptId || submitting) return
    setSubmitting(true)
    try {
      const res = timedOut
        ? await autoSubmitExpiredAttempt(attemptId, userId)
        : await submitQuiz(attemptId, userId)
      setResult(res as SubmitResult)
      toast.success(timedOut ? "Time's up! Quiz submitted." : 'Quiz submitted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed')
    } finally {
      setSubmitting(false)
    }
  }, [attemptId, submitting, userId])

  useEffect(() => {
    if (!startedAt || !quiz || result) return
    const tick = setInterval(() => {
      const durationMs = quiz.duration * 60 * 1000
      const left = Math.max(0, Math.floor((durationMs - (Date.now() - startedAt.getTime())) / 1000))
      setRemaining(left)
      if (left <= 0 && !autoSubmitted.current) {
        autoSubmitted.current = true
        void handleSubmit(true)
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [startedAt, quiz, result, handleSubmit])

  const questions = useMemo(() => quiz?.questions ?? [], [quiz?.questions])
  const question = questions[current]

  async function persistAnswer(questionId: number, payload: { selectedOptionId?: number; textAnswer?: string }) {
    if (!attemptId) return
    try {
      await saveAnswer({ attemptId, questionId, ...payload }, userId)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Auto-save failed')
    }
  }

  function selectOption(optionId: number) {
    if (!question) return
    const next = { selectedOptionId: optionId }
    setAnswers((prev) => ({ ...prev, [question.id]: next }))
    void persistAnswer(question.id, next)
  }

  function onTextChange(text: string) {
    if (!question) return
    const next = { textAnswer: text }
    setAnswers((prev) => ({ ...prev, [question.id]: next }))
    if (shortSaveTimer.current) clearTimeout(shortSaveTimer.current)
    shortSaveTimer.current = setTimeout(() => {
      void persistAnswer(question.id, next)
    }, 3000)
  }

  const answeredCount = useMemo(
    () =>
      questions.filter((q) => {
        const a = answers[q.id]
        return Boolean(a?.selectedOptionId || a?.textAnswer?.trim())
      }).length,
    [questions, answers]
  )

  const timerLabel = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`

  if (loading) {
    return <Card><CardContent className="py-12 text-center">Loading quiz…</CardContent></Card>
  }

  if (error) {
    return <Card><CardContent className="py-12 text-center text-red-700">{error}</CardContent></Card>
  }

  if (result) {
    if (!('showResults' in result) || !result.showResults) {
      return (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <p className="font-bold text-lg">Quiz submitted</p>
            <p className="text-sm text-muted-foreground">
              Results will be available after the teacher reviews.
            </p>
          </CardContent>
        </Card>
      )
    }

    const attempt = 'attempt' in result ? result.attempt : null
    const results = 'results' in result ? result.results : []

    return (
      <div className="space-y-4">
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 space-y-2">
            <p className="font-bold text-lg">Quiz Complete</p>
            {attempt && (
              <>
                <p className="text-xl font-semibold">
                  Score: {Number(attempt.marksAwarded)}/{Number(attempt.totalMarks)} ({Number(attempt.percentage)}%)
                </p>
                <Badge className={attempt.isPassed ? 'bg-emerald-600' : 'bg-red-600'}>
                  {attempt.isPassed ? 'PASS' : 'FAIL'}
                </Badge>
                <p className="text-sm">
                  Time taken: {Math.floor((attempt.timeSpent ?? 0) / 60)} min {(attempt.timeSpent ?? 0) % 60} sec
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <div className="space-y-3">
          <p className="font-semibold">Question Review</p>
          {results?.map((r, idx) => (
            <Card key={r.questionId}>
              <CardContent className="p-4 text-sm space-y-1">
                <p className="font-medium">Q{idx + 1}: {r.questionText}</p>
                {r.questionType === 'SHORT' ? (
                  <p className="text-muted-foreground">Short answer — pending/manual grading</p>
                ) : (
                  <p className={r.isCorrect ? 'text-emerald-700' : 'text-red-700'}>
                    {r.isCorrect ? 'Correct' : `Wrong — Correct answer was "${r.correctOption?.optionText ?? '—'}"`}
                    {' '}({r.marksAwarded ?? 0}/{r.marks} marks)
                  </p>
                )}
                {r.explanation && <p className="text-xs text-muted-foreground">Explanation: {r.explanation}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!quiz || !question) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Unable to load quiz questions. Please go back and try again.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold">{quiz.title}</h1>
        <p className={`font-mono text-lg font-bold ${remaining < 300 ? 'text-red-600' : ''}`}>
          {timerLabel} remaining
        </p>
      </div>

      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>
      <p className="text-sm text-muted-foreground">Question {current + 1} of {questions.length}</p>

      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="font-medium">
            Q{current + 1}. {question.questionText}{' '}
            <span className="text-muted-foreground">({Number(question.marks)} marks)</span>
          </p>

          {question.questionType === 'SHORT' ? (
            <textarea
              className="flex min-h-[120px] w-full rounded-md border px-3 py-2 text-sm"
              value={answers[question.id]?.textAnswer ?? ''}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Type your answer"
            />
          ) : (
            <div className="space-y-2">
              {question.options.map((o) => {
                const selected = answers[question.id]?.selectedOptionId === o.id
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => selectOption(o.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                      selected ? 'border-primary bg-primary/5 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    {selected ? '●' : '○'} {o.optionText}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between gap-2">
        <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={current >= questions.length - 1}
          onClick={() => setCurrent((c) => c + 1)}
        >
          Save & Next
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {questions.map((q, idx) => {
          const answered = Boolean(answers[q.id]?.selectedOptionId || answers[q.id]?.textAnswer?.trim())
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setCurrent(idx)}
              className={`h-8 w-8 rounded-full text-xs border ${
                idx === current
                  ? 'bg-primary text-primary-foreground'
                  : answered
                    ? 'bg-emerald-100 border-emerald-300'
                    : 'bg-white'
              }`}
            >
              {idx + 1}
            </button>
          )
        })}
      </div>

      <Button
        className="w-full"
        disabled={submitting}
        onClick={() => {
          if (
            confirm(
              `You have answered ${answeredCount} of ${questions.length} questions. Are you sure you want to submit? You cannot change answers after submission.`
            )
          ) {
            void handleSubmit(false)
          }
        }}
      >
        {submitting ? 'Submitting…' : 'Submit Quiz'}
      </Button>
    </div>
  )
}
