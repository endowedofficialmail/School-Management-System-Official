import { prisma } from '@/lib/prisma'

const SCHOOL_ID = 1

export async function requireRole(
  session: { user?: { role?: string } } | null,
  allowedRoles: string[]
) {
  if (!session?.user) throw new Error('Not authenticated')
  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    throw new Error(`Unauthorized: Required role ${allowedRoles.join(' or ')}`)
  }
}

export async function requireLMSEnabled() {
  const settings = await prisma.lMSSettings.findUnique({
    where: { schoolId: SCHOOL_ID },
  })
  if (!settings?.isEnabled) throw new Error('LMS is not enabled')
}

export async function requireCourseOwnership(
  courseId: number,
  userId: number,
  role: string
) {
  if (role === 'ADMIN') return
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course || course.teacherId !== userId) throw new Error('Unauthorized')
}

export async function requireStudentSelf(requestedStudentId: number, userId: number) {
  const profile = await prisma.studentPortalProfile.findUnique({
    where: { userId },
  })
  if (!profile || profile.studentId !== requestedStudentId) {
    throw new Error("Unauthorized: Cannot access another student's data")
  }
}

export async function requireParentChildLink(studentId: number, parentUserId: number) {
  const link = await prisma.parentStudent.findFirst({
    where: {
      student: { id: studentId },
      parent: { userId: parentUserId },
    },
  })
  if (!link) throw new Error('Unauthorized: This student is not linked to your account')
}
