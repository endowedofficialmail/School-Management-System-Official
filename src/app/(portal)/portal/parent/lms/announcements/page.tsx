import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { getParentPortalData } from '@/lib/actions/portal'
import { getLMSSettings, getAnnouncements } from '@/lib/actions/lms'
import ParentAnnouncementsClient from '@/components/portal/ParentAnnouncementsClient'
import { Card, CardContent } from '@/components/ui/card'

export default async function ParentAnnouncementsPage({
  searchParams,
}: {
  searchParams: { studentId?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'PARENT') redirect('/login')

  const lmsSettings = await getLMSSettings()
  if (!lmsSettings.isEnabled) redirect('/portal/parent')

  const data = await getParentPortalData(Number(session.user.id))
  const studentId = searchParams.studentId
    ? Number(searchParams.studentId)
    : data.students[0]?.student.id

  const link = data.students.find((s) => s.student.id === studentId)
  if (!link) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="font-bold">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-2">Unauthorized: This student is not linked to your account</p>
        </CardContent>
      </Card>
    )
  }

  const announcements = await getAnnouncements({
    userId: Number(session.user.id),
    role: 'PARENT',
    studentId,
  })

  return (
    <div className="space-y-4">
      {data.students.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {data.students.map((s) => (
            <Link
              key={s.student.id}
              href={`/portal/parent/lms/announcements?studentId=${s.student.id}`}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                s.student.id === studentId ? 'bg-primary text-primary-foreground' : 'bg-white'
              }`}
            >
              {s.student.firstName} {s.student.lastName}
            </Link>
          ))}
        </div>
      )}
      <ParentAnnouncementsClient
        announcements={announcements}
        userId={Number(session.user.id)}
      />
    </div>
  )
}
