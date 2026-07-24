'use client'

import { useState } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { getLessonTypeBadges, getYouTubeEmbedUrl } from '@/lib/lms-utils'
import { markLessonComplete } from '@/lib/actions/lms'

type Course = Awaited<ReturnType<typeof import('@/lib/actions/lms').getCourseById>>
type Progress = Awaited<ReturnType<typeof import('@/lib/actions/lms').getStudentProgress>>

export default function StudentCourseClient({
  course,
  progress,
  completedLessonIds: initialCompleted,
  userId,
}: {
  course: Course
  progress: Progress
  completedLessonIds: number[]
  studentId?: number
  userId: number
}) {
  const [selectedLessonId, setSelectedLessonId] = useState<number | null>(
    course.lessons[0]?.id ?? null
  )
  const [completed, setCompleted] = useState<Set<number>>(new Set(initialCompleted))
  const [marking, setMarking] = useState(false)

  const selectedLesson = course.lessons.find((l) => l.id === selectedLessonId)
  const embedUrl = selectedLesson?.videoUrl ? getYouTubeEmbedUrl(selectedLesson.videoUrl) : null

  async function handleMarkComplete(lessonId: number) {
    setMarking(true)
    try {
      await markLessonComplete(lessonId, userId)
      setCompleted((prev) => new Set([...Array.from(prev), lessonId]))
      toast.success('Lesson marked as complete')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{course.title}</h1>
        {course.description && (
          <p className="text-sm text-muted-foreground mt-1">{course.description}</p>
        )}
      </div>

      <div>
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>{progress.completedLessons} of {progress.totalLessons} lessons completed</span>
          <span>{progress.completionPercentage}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${progress.completionPercentage}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        {course.lessons.map((lesson, idx) => (
          <button
            key={lesson.id}
            onClick={() => setSelectedLessonId(lesson.id)}
            className={`w-full text-left rounded-xl border p-3 flex items-center justify-between transition-colors ${
              selectedLessonId === lesson.id ? 'border-primary bg-primary/5' : 'hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-muted-foreground">{idx + 1}</span>
              <div>
                <p className="font-medium text-sm">{lesson.title}</p>
                <div className="flex gap-1 mt-0.5">
                  {getLessonTypeBadges(lesson).map((b) => (
                    <Badge key={b} variant="outline" className="text-xs">{b}</Badge>
                  ))}
                </div>
              </div>
            </div>
            {completed.has(lesson.id) && (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
          </button>
        ))}
      </div>

      {selectedLesson && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="font-bold text-lg">{selectedLesson.title}</h2>

            {embedUrl && (
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allowFullScreen
                  title={selectedLesson.title}
                />
              </div>
            )}

            {selectedLesson.videoUrl && !embedUrl && (
              <a href={selectedLesson.videoUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex')}>
                <ExternalLink className="h-4 w-4 mr-2" /> Watch Video
              </a>
            )}

            {selectedLesson.pdfUrl && (
              <a href={selectedLesson.pdfUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline' }), 'inline-flex')}>
                <ExternalLink className="h-4 w-4 mr-2" /> View PDF
              </a>
            )}

            {selectedLesson.content && (
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-800">
                {selectedLesson.content}
              </div>
            )}

            <Button
              className={completed.has(selectedLesson.id) ? 'bg-slate-200 text-slate-700 hover:bg-slate-200' : ''}
              disabled={marking || completed.has(selectedLesson.id)}
              onClick={() => handleMarkComplete(selectedLesson.id)}
            >
              {completed.has(selectedLesson.id) ? (
                <><Check className="h-4 w-4 mr-2" /> Completed</>
              ) : (
                'Mark as Complete'
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
