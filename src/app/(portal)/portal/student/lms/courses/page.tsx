import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getStudentPortalData } from '@/lib/actions/portal'
import { getLMSSettings, getCourses, getStudentProgress } from '@/lib/actions/lms'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function StudentCoursesPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'STUDENT') redirect('/login')

  const lmsSettings = await getLMSSettings()
  if (!lmsSettings.isEnabled) redirect('/portal/student')

  let student
  try {
    student = await getStudentPortalData(Number(session.user.id))
  } catch {
    return <AccessDenied />
  }

  const courses = await getCourses({ userId: Number(session.user.id), role: 'STUDENT' })
  const coursesWithProgress = await Promise.all(
    courses.map(async (c) => ({
      ...c,
      progress: await getStudentProgress(c.id, student.id),
    }))
  )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Courses</h1>
      {coursesWithProgress.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No courses available</CardContent></Card>
      ) : (
        coursesWithProgress.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 space-y-2">
              <p className="font-bold">{c.title}</p>
              <p className="text-sm text-muted-foreground">{c.subject.name} · {c.teacher.name}</p>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${c.progress.completionPercentage}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">
                {c.progress.completedLessons} of {c.progress.totalLessons} lessons completed
              </p>
              <Link href={`/portal/student/lms/courses/${c.id}`} className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}>
                Continue Learning
              </Link>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

function AccessDenied() {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="font-bold">Access Denied</p>
      </CardContent>
    </Card>
  )
}
