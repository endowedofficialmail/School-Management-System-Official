'use server'

import bcrypt from 'bcryptjs'
import { getDaysInMonth } from 'date-fns'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export type StudentPortalData = Awaited<ReturnType<typeof getStudentPortalData>>
export type ParentPortalData = Awaited<ReturnType<typeof getParentPortalData>>
export type AttendanceSummary = Awaited<ReturnType<typeof getStudentAttendanceSummary>>
export type PortalManagementData = Awaited<ReturnType<typeof getPortalManagementData>>

function monthRange(month: number, year: number) {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  return { start, end, daysInMonth: getDaysInMonth(new Date(year, month - 1)) }
}

async function assertCanAccessStudent(studentId: number) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ? Number(session.user.id) : null
  const role = session?.user?.role
  if (!userId) throw new Error('Unauthorized')

  if (role === 'ADMIN' || role === 'TEACHER' || role === 'RECEPTIONIST') return

  if (role === 'STUDENT') {
    const profile = await prisma.studentPortalProfile.findUnique({
      where: { userId },
      select: { studentId: true },
    })
    if (profile?.studentId === studentId) return
  }

  if (role === 'PARENT') {
    const linked = await prisma.parentStudent.findFirst({
      where: { studentId, parent: { userId } },
      select: { id: true },
    })
    if (linked) return
  }

  throw new Error('Unauthorized')
}

export async function createStudentPortalAccess(data: {
  studentId: number
  email: string
  password: string
}) {
  const existing = await prisma.studentPortalProfile.findUnique({
    where: { studentId: data.studentId },
  })
  if (existing) throw new Error('Student already has portal access')

  const student = await prisma.student.findUnique({ where: { id: data.studentId } })
  if (!student) throw new Error('Student not found')

  const hashed = await bcrypt.hash(data.password, 12)
  const user = await prisma.user.create({
    data: {
      name: `${student.firstName} ${student.lastName}`,
      email: data.email,
      password: hashed,
      role: 'STUDENT',
      studentProfile: { create: { studentId: student.id } },
    },
    select: { id: true, name: true, email: true, role: true },
  })

  revalidatePath('/settings/users')
  return user
}

export async function createParentPortalAccess(data: {
  studentIds: number[]
  email: string
  password: string
  name: string
  relation: string
}) {
  if (data.studentIds.length === 0) throw new Error('Select at least one student')
  const hashed = await bcrypt.hash(data.password, 12)
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashed,
      role: 'PARENT',
      parentProfile: {
        create: {
          students: {
            create: data.studentIds.map((studentId) => ({
              studentId,
              relation: data.relation,
            })),
          },
        },
      },
    },
    select: { id: true, name: true, email: true, role: true },
  })

  revalidatePath('/settings/users')
  return user
}

export async function getStudentPortalData(userId: number) {
  const profile = await prisma.studentPortalProfile.findUnique({
    where: { userId },
    include: {
      student: {
        include: {
          class: { include: { academicYear: true } },
          attendance: { orderBy: { date: 'desc' }, take: 5 },
          performances: {
            include: { exam: { select: { id: true, name: true, startDate: true } } },
            orderBy: { exam: { startDate: 'desc' } },
          },
          vouchers: { include: { items: true }, orderBy: { createdAt: 'desc' } },
        },
      },
    },
  })
  if (!profile) throw new Error('Student profile not found')
  return profile.student
}

export async function getParentPortalData(userId: number) {
  const parent = await prisma.parent.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      students: {
        include: {
          student: {
            include: {
              class: { include: { academicYear: true } },
              attendance: { orderBy: { date: 'desc' }, take: 3 },
              performances: {
                include: { exam: { select: { id: true, name: true, startDate: true } } },
                orderBy: { exam: { startDate: 'desc' } },
                take: 1,
              },
              vouchers: {
                where: { status: { in: ['UNPAID', 'PARTIAL', 'ADVANCE'] } },
                include: { items: true },
              },
            },
          },
        },
      },
    },
  })
  if (!parent) throw new Error('Parent profile not found')

  return {
    parent: parent.user,
    students: parent.students.map((link) => ({
      relation: link.relation,
      student: link.student,
      latestPerformance: link.student.performances[0] ?? null,
      pendingVoucherCount: link.student.vouchers.filter((v) => v.status === 'UNPAID' || v.status === 'PARTIAL').length,
      pendingAmount: link.student.vouchers
        .filter((v) => v.status === 'UNPAID' || v.status === 'PARTIAL')
        .reduce((sum, v) => {
          if (v.status === 'PARTIAL') {
            return sum + (Number(v.remainingAmount) || Math.max(0, Number(v.totalAmount) - Number(v.paidAmount)))
          }
          return sum + Number(v.totalAmount)
        }, 0),
    })),
  }
}

export async function getStudentAttendanceSummary(studentId: number, month: number, year: number) {
  await assertCanAccessStudent(studentId)
  const { start, end, daysInMonth } = monthRange(month, year)
  const records = await prisma.attendance.findMany({
    where: { studentId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  })

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 }
  records.forEach((r) => { counts[r.status] += 1 })
  const attended = counts.PRESENT + counts.LATE
  const marked = records.length
  const percentage = marked > 0 ? Math.round((attended / marked) * 1000) / 10 : 0

  return {
    records,
    dayMap: Object.fromEntries(records.map((r) => [new Date(r.date).getUTCDate(), r.status])),
    counts,
    percentage,
    daysInMonth,
    month,
    year,
  }
}

export async function getPortalFeeVouchers(studentId: number) {
  await assertCanAccessStudent(studentId)
  return prisma.feeVoucher.findMany({
    where: { studentId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getPortalExamResults(studentId: number) {
  await assertCanAccessStudent(studentId)
  return prisma.examPerformance.findMany({
    where: { studentId },
    include: {
      exam: { include: { class: true, academicYear: true } },
    },
    orderBy: { exam: { startDate: 'desc' } },
  })
}

export async function getParentLinkedStudents(userId: number) {
  const parent = await prisma.parent.findUnique({
    where: { userId },
    include: {
      students: {
        include: {
          student: { include: { class: { include: { academicYear: true } } } },
        },
      },
    },
  })
  if (!parent) throw new Error('Parent profile not found')
  return parent.students
}

export async function removeStudentPortalAccess(studentId: number) {
  const profile = await prisma.studentPortalProfile.findUnique({ where: { studentId } })
  if (!profile) throw new Error('Portal access not found')
  await prisma.user.delete({ where: { id: profile.userId } })
  revalidatePath('/settings/users')
}

export async function removeParentPortalAccess(userId: number) {
  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/settings/users')
}

export async function getPortalManagementData() {
  const [studentProfiles, parentProfiles, students] = await Promise.all([
    prisma.studentPortalProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        student: { include: { class: { select: { id: true, name: true, section: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.parent.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, isActive: true } },
        students: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.student.findMany({
      include: {
        class: { select: { id: true, name: true, section: true } },
        portalProfile: { select: { id: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ])

  return { studentProfiles, parentProfiles, students }
}
