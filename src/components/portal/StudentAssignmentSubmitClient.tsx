'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { format, differenceInHours, differenceInDays, isPast } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { submitAssignment, downloadSubmissionFile } from '@/lib/actions/assignments'

type Assignment = Awaited<ReturnType<typeof import('@/lib/actions/assignments').getAssignmentById>>

const MAX_BYTES = 5 * 1024 * 1024

export default function StudentAssignmentSubmitClient({
  assignment,
  userId,
}: {
  assignment: Assignment
  userId: number
}) {
  const [textAnswer, setTextAnswer] = useState('')
  const [file, setFile] = useState<{
    base64: string
    name: string
    type: string
    size: number
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resubmit, setResubmit] = useState(false)
  const [localSubmission, setLocalSubmission] = useState(assignment.mySubmission)

  const due = new Date(assignment.dueDate)
  const overdue = isPast(due)
  const countdown = useMemo(() => {
    if (overdue) {
      const days = Math.abs(differenceInDays(new Date(), due))
      return `OVERDUE by ${days} day${days === 1 ? '' : 's'}`
    }
    const hours = differenceInHours(due, new Date())
    if (hours < 48) return `${hours} hours remaining`
    const days = differenceInDays(due, new Date())
    return `${days} days remaining`
  }, [due, overdue])

  const canSubmit =
    !localSubmission ||
    resubmit ||
    (localSubmission &&
      localSubmission.status !== 'GRADED' &&
      localSubmission.status !== 'RETURNED' &&
      (!overdue || assignment.allowLate))

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'docx') {
      toast.error('Only PDF and DOCX files are allowed')
      e.target.value = ''
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('File must be 5MB or smaller')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setFile({
        base64: String(reader.result),
        name: f.name,
        type: ext!,
        size: f.size,
      })
    }
    reader.onerror = () => toast.error('Failed to read file')
    reader.readAsDataURL(f)
  }

  async function handleSubmit() {
    if (!textAnswer.trim() && !file) {
      toast.error('Provide a text answer or file upload')
      return
    }
    setSubmitting(true)
    try {
      const sub = await submitAssignment(
        {
          assignmentId: assignment.id,
          textAnswer: textAnswer || undefined,
          fileBase64: file?.base64,
          fileName: file?.name,
          fileType: file?.type,
          fileSize: file?.size,
        },
        userId
      )
      setLocalSubmission(sub)
      setResubmit(false)
      toast.success('Assignment submitted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownload() {
    if (!localSubmission) return
    try {
      const f = await downloadSubmissionFile(localSubmission.id, userId, 'STUDENT')
      const a = document.createElement('a')
      a.href = f.fileUrl
      a.download = f.fileName
      a.click()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed')
    }
  }

  const graded =
    localSubmission &&
    (localSubmission.status === 'GRADED' || localSubmission.status === 'RETURNED') &&
    localSubmission.marksAwarded != null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{assignment.title}</h1>
        <p className="text-sm text-muted-foreground">
          {assignment.course.subject.name} · Due {format(due, 'dd MMM yyyy, hh:mm a')}
        </p>
        <p className={`text-sm font-medium mt-1 ${overdue ? 'text-red-700' : 'text-emerald-700'}`}>
          {countdown}
        </p>
        <p className="text-sm text-muted-foreground">
          Total: {Number(assignment.totalMarks)} · Pass: {Number(assignment.passingMarks)}
        </p>
      </div>

      {assignment.description && (
        <Card><CardContent className="p-4 text-sm whitespace-pre-wrap">{assignment.description}</CardContent></Card>
      )}
      {assignment.instructions && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Instructions</CardTitle></CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{assignment.instructions}</CardContent>
        </Card>
      )}
      {assignment.fileUrl && (
        <a href={assignment.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
          View Reference Material
        </a>
      )}

      {graded && localSubmission && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 space-y-2">
            <Badge className="bg-blue-600">GRADED</Badge>
            <p className="font-semibold text-lg">
              Marks: {Number(localSubmission.marksAwarded)} / {Number(assignment.totalMarks)} (
              {Math.round((Number(localSubmission.marksAwarded) / Number(assignment.totalMarks)) * 100)}%)
            </p>
            <p>
              Result:{' '}
              {Number(localSubmission.marksAwarded) >= Number(assignment.passingMarks) ? 'PASS' : 'FAIL'}
            </p>
            {localSubmission.feedback && (
              <div>
                <p className="text-sm font-medium">Teacher Feedback</p>
                <p className="text-sm whitespace-pre-wrap">{localSubmission.feedback}</p>
              </div>
            )}
            {localSubmission.gradedAt && (
              <p className="text-xs text-muted-foreground">
                Graded on: {format(new Date(localSubmission.gradedAt), 'dd MMM yyyy')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {localSubmission && !resubmit && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 space-y-2">
            <Badge className="bg-emerald-600">SUBMITTED</Badge>
            <p className="text-sm">
              Submitted at: {format(new Date(localSubmission.submittedAt), 'dd MMM yyyy, hh:mm a')}
            </p>
            {localSubmission.textAnswer && (
              <p className="text-sm whitespace-pre-wrap">{localSubmission.textAnswer}</p>
            )}
            {localSubmission.fileName && (
              <Button size="sm" variant="outline" onClick={handleDownload}>
                {localSubmission.fileName}
              </Button>
            )}
            {!graded && (!overdue || assignment.allowLate) && (
              <Button size="sm" variant="outline" onClick={() => setResubmit(true)}>Resubmit</Button>
            )}
          </CardContent>
        </Card>
      )}

      {canSubmit && (!localSubmission || resubmit) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Your Submission</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Text Answer (optional)</p>
              <textarea
                className="flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type your answer here"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Upload File (optional)</p>
              <p className="text-xs text-muted-foreground mb-2">Accepts PDF and Word (.docx) only. Max 5MB.</p>
              <InputFile onChange={onFileChange} />
              {file && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  <Button size="sm" variant="ghost" onClick={() => setFile(null)}>Remove</Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">At least one of text answer or file upload is required.</p>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Assignment'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InputFile({ onChange }: { onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <input
      type="file"
      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      onChange={onChange}
      className="block w-full text-sm"
    />
  )
}
