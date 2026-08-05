'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import BackButton from '@/components/shared/BackButton'
import {
  addQuestion, deleteQuestion, publishQuiz, reorderQuestion, updateQuestion,
} from '@/lib/actions/quizzes'
import type { QuestionType } from '@prisma/client'

type Quiz = Awaited<ReturnType<typeof import('@/lib/actions/quizzes').getQuizById>>

export default function QuestionManagerClient({
  quiz: initial,
  userId,
  role,
}: {
  quiz: Quiz
  userId: number
  role: 'ADMIN' | 'TEACHER'
}) {
  const router = useRouter()
  const [quiz, setQuiz] = useState(initial)
  const [type, setType] = useState<QuestionType>('MCQ')
  const [questionText, setQuestionText] = useState('')
  const [marks, setMarks] = useState('1')
  const [explanation, setExplanation] = useState('')
  const [options, setOptions] = useState([
    { optionText: '', isCorrect: true },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
    { optionText: '', isCorrect: false },
  ])
  const [trueIsCorrect, setTrueIsCorrect] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const totalMarks = useMemo(
    () => quiz.questions.reduce((s, q) => s + Number(q.marks), 0),
    [quiz.questions]
  )

  async function refresh() {
    const { getQuizById } = await import('@/lib/actions/quizzes')
    const updated = await getQuizById(quiz.id, userId, role)
    setQuiz(updated)
    router.refresh()
  }

  function resetForm() {
    setEditingId(null)
    setQuestionText('')
    setMarks('1')
    setExplanation('')
    setType('MCQ')
    setTrueIsCorrect(true)
    setOptions([
      { optionText: '', isCorrect: true },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
    ])
  }

  async function handleAdd() {
    if (!questionText.trim()) { toast.error('Question text is required'); return }
    setSaving(true)
    try {
      if (editingId) {
        await updateQuestion(
          editingId,
          {
            questionText,
            marks: Number(marks),
            explanation: explanation || null,
            options: type === 'MCQ' ? options.filter((o) => o.optionText.trim()) : undefined,
            trueIsCorrect: type === 'TRUE_FALSE' ? trueIsCorrect : undefined,
          },
          userId,
          role
        )
        toast.success('Question updated')
      } else {
        await addQuestion(
          {
            quizId: quiz.id,
            questionText,
            questionType: type,
            marks: Number(marks),
            explanation: explanation || undefined,
            options: type === 'MCQ' ? options.filter((o) => o.optionText.trim()) : undefined,
            trueIsCorrect: type === 'TRUE_FALSE' ? trueIsCorrect : undefined,
          },
          userId,
          role
        )
        toast.success('Question added')
      }
      resetForm()
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(q: Quiz['questions'][number]) {
    setEditingId(q.id)
    setType(q.questionType)
    setQuestionText(q.questionText)
    setMarks(String(Number(q.marks)))
    setExplanation(q.explanation ?? '')
    if (q.questionType === 'MCQ') {
      setOptions(
        q.options.length
          ? q.options.map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect }))
          : [{ optionText: '', isCorrect: true }, { optionText: '', isCorrect: false }]
      )
    }
    if (q.questionType === 'TRUE_FALSE') {
      setTrueIsCorrect(q.options.find((o) => o.optionText === 'True')?.isCorrect ?? true)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">Manage Questions — {quiz.title}</h1>
          <div className="flex gap-2 mt-1 text-sm text-muted-foreground">
            <span>Total questions: {quiz.questions.length}</span>
            <span>·</span>
            <span>Total marks: {totalMarks}</span>
            <Badge variant={quiz.isPublished ? 'default' : 'secondary'}>
              {quiz.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <p className="font-semibold">{editingId ? 'Edit Question' : 'Add Question'}</p>
          <div className="flex flex-wrap gap-2">
            {([
              ['MCQ', 'MCQ'],
              ['TRUE_FALSE', 'True/False'],
              ['SHORT', 'Short Answer'],
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={type === value ? 'default' : 'outline'}
                onClick={() => setType(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Question Text *</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Marks</Label>
              <Input type="number" min={0.5} step={0.5} value={marks} onChange={(e) => setMarks(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Explanation (shown after submission)</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>

          {type === 'MCQ' && (
            <div className="space-y-2">
              <Label>Options (mark exactly one correct)</Label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={opt.isCorrect}
                    onChange={() =>
                      setOptions(options.map((o, i) => ({ ...o, isCorrect: i === idx })))
                    }
                  />
                  <Input
                    value={opt.optionText}
                    placeholder={`Option ${idx + 1}`}
                    onChange={(e) =>
                      setOptions(options.map((o, i) => (i === idx ? { ...o, optionText: e.target.value } : o)))
                    }
                  />
                </div>
              ))}
              {options.length < 6 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setOptions([...options, { optionText: '', isCorrect: false }])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
                </Button>
              )}
            </div>
          )}

          {type === 'TRUE_FALSE' && (
            <div className="space-y-2">
              <Label>Correct answer</Label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={trueIsCorrect} onChange={() => setTrueIsCorrect(true)} /> True
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" checked={!trueIsCorrect} onChange={() => setTrueIsCorrect(false)} /> False
              </label>
            </div>
          )}

          {type === 'SHORT' && (
            <p className="text-sm text-muted-foreground">This question will be manually graded by the teacher.</p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving}>
              {editingId ? 'Update Question' : 'Add Question'}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>Cancel Edit</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {quiz.questions.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between gap-2">
                <p className="font-medium">Q{idx + 1}. {q.questionText}</p>
                <span className="text-sm text-muted-foreground whitespace-nowrap">{Number(q.marks)} marks</span>
              </div>
              <Badge variant="outline">{q.questionType}</Badge>
              {q.options.length > 0 && (
                <ul className="text-sm space-y-1">
                  {q.options.map((o) => (
                    <li key={o.id} className={o.isCorrect ? 'text-emerald-700 font-medium' : ''}>
                      {o.isCorrect ? '●' : '○'} {o.optionText} {o.isCorrect ? '(correct)' : ''}
                    </li>
                  ))}
                </ul>
              )}
              {q.explanation && (
                <p className="text-xs text-muted-foreground">Explanation: {q.explanation}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => startEdit(q)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={async () => { await reorderQuestion(q.id, 'up', userId, role); await refresh() }}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={async () => { await reorderQuestion(q.id, 'down', userId, role); await refresh() }}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm('Delete this question?')) return
                    try {
                      await deleteQuestion(q.id, userId, role)
                      toast.success('Deleted')
                      await refresh()
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Failed')
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-sm font-medium">Total: {quiz.questions.length} questions | {totalMarks} marks</p>
        {!quiz.isPublished && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={quiz.questions.length === 0}
            onClick={async () => {
              try {
                const updated = await publishQuiz(quiz.id, userId, role)
                setQuiz((prev) => ({ ...prev, isPublished: updated.isPublished }))
                toast.success('Quiz published')
                await refresh()
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to publish quiz')
              }
            }}
          >
            Publish Quiz
          </Button>
        )}
      </div>
    </div>
  )
}
