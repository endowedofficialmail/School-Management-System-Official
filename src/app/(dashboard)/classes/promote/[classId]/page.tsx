import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import AccessDenied from '@/components/shared/AccessDenied'
import { getClassById } from '@/lib/actions/settings'
import PromotionChecklistClient from './PromotionChecklistClient'

export const dynamic = 'force-dynamic'

export default async function PromoteClassPage({ params }: { params: { classId: string } }) {
  const classId = Number(params.classId)
  if (isNaN(classId)) notFound()

  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (!session || !role) notFound()
  if (role !== 'ADMIN') return <AccessDenied />

  const cls = await getClassById(classId)
  if (!cls) notFound()

  return (
    <PromotionChecklistClient
      classId={classId}
      classLabel={`${cls.name} – ${cls.section}`}
      fromAcademicYearName={cls.academicYear.name}
      promotedById={Number(session.user.id)}
    />
  )
}

