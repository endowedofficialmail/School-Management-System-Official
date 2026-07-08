'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AttendanceStatus } from '@prisma/client'
import { getDaysInMonth } from 'date-fns'

// Parse a 'YYYY-MM-DD' string into a UTC-midnight Date (consistent with Prisma @db.Date)
function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export type StudentForAttendance = Awaited<ReturnType<typeof getStudentsByClass>>[number]
export type AttendanceRecord = Awaited<ReturnType<typeof getAttendanceForClassAndDate>>[number]

export type AttendanceReportResult = {
  students: {
    student: StudentForAttendance
    dayMap: Record<number, string>
    percentage: number | null
  }[]
  daysInMonth: number
}

// ─── 1. Students in a class ───────────────────────────────────────────────────

export async function getStudentsByClass(classId: number) {
  return prisma.student.findMany({
    where: { classId, status: 'ACTIVE' },
    orderBy: { firstName: 'asc' },
  })
}

// ─── 2. Existing attendance for a class+date ─────────────────────────────────

export async function getAttendanceForClassAndDate(classId: number, dateStr: string) {
  const date = parseDateStr(dateStr)
  return prisma.attendance.findMany({
    where: { classId, date },
    include: { student: true },
  })
}

// ─── 3. Mark / upsert attendance ─────────────────────────────────────────────

export async function markAttendance(data: {
  classId: number
  dateStr: string
  records: { studentId: number; status: string }[]
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Not authenticated')
  const userId = Number(session.user.id)
  const date = parseDateStr(data.dateStr)

  let count = 0
  for (const rec of data.records) {
    await prisma.attendance.upsert({
      where: { studentId_date: { studentId: rec.studentId, date } },
      update: { status: rec.status as AttendanceStatus },
      create: {
        studentId: rec.studentId,
        classId: data.classId,
        date,
        status: rec.status as AttendanceStatus,
        userId,
      },
    })
    count++
  }

  revalidatePath('/attendance/mark')
  revalidatePath('/attendance/report')
  return count
}

// ─── 4. Attendance report for a class + month ─────────────────────────────────

export async function getAttendanceReport(filters: {
  classId: number
  month: number
  year: number
}): Promise<AttendanceReportResult> {
  const startDate = new Date(Date.UTC(filters.year, filters.month - 1, 1))
  const endDate = new Date(Date.UTC(filters.year, filters.month, 0, 23, 59, 59, 999))
  const daysCount = getDaysInMonth(new Date(filters.year, filters.month - 1))

  const [students, records] = await Promise.all([
    prisma.student.findMany({
      where: { classId: filters.classId, status: 'ACTIVE' },
      orderBy: { firstName: 'asc' },
    }),
    prisma.attendance.findMany({
      where: {
        classId: filters.classId,
        date: { gte: startDate, lte: endDate },
      },
    }),
  ])

  // Build map: studentId → { day → status }
  const attendanceMap = new Map<number, Record<number, string>>()
  students.forEach((s) => attendanceMap.set(s.id, {}))

  for (const rec of records) {
    const day = new Date(rec.date).getUTCDate()
    const studentData = attendanceMap.get(rec.studentId)
    if (studentData) studentData[day] = rec.status
  }

  return {
    students: students.map((s) => {
      const dayMap = attendanceMap.get(s.id) ?? {}
      const markedDays = Object.keys(dayMap).length
      const presentDays = Object.values(dayMap).filter(
        (st) => st === 'PRESENT' || st === 'LATE'
      ).length
      const percentage = markedDays > 0
        ? Math.round((presentDays / markedDays) * 100)
        : null
      return { student: s, dayMap, percentage }
    }),
    daysInMonth: daysCount,
  }
}

// ─── 5. Today's attendance summary ───────────────────────────────────────────

export async function getTodayAttendanceStats() {
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const [total, marked] = await Promise.all([
    prisma.student.count({ where: { status: 'ACTIVE' } }),
    prisma.attendance.count({
      where: {
        date: today,
        status: { in: ['PRESENT', 'LATE'] },
      },
    }),
  ])

  const percentage = total > 0 ? Math.round((marked / total) * 100) : 0
  return { percentage, marked, total }
}
