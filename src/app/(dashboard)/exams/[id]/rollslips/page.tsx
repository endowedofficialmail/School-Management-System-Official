import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getExamById } from '@/lib/actions/exams'
import RollSlipsClient from './RollSlipsClient'

export default async function RollSlipsPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const examId = Number(params.id)
  const exam = await getExamById(examId)
  if (!exam) notFound()

  const examClasses = exam.examClasses.length > 0
    ? exam.examClasses.map((ec) => ({
        id: ec.class.id,
        name: ec.class.name,
        section: ec.class.section,
      }))
    : exam.class
      ? [{ id: exam.class.id, name: exam.class.name, section: exam.class.section }]
      : []

  return (
    <RollSlipsClient
      examId={examId}
      examName={exam.name}
      startDate={exam.startDate.toISOString()}
      endDate={exam.endDate.toISOString()}
      academicYearName={exam.academicYear.name}
      examClasses={examClasses}
      issuedById={Number(session.user.id)}
    />
  )
}
