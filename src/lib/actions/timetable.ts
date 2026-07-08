'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimetableEntry = Awaited<ReturnType<typeof getTeacherTimetable>>[number]
export type TeacherWithEntryCount = Awaited<ReturnType<typeof getAllTimetables>>[number]
export type TimetablePrintData = NonNullable<Awaited<ReturnType<typeof getTimetableForPrint>>>

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getTeacherTimetable(teacherId: number) {
  return prisma.timetableEntry.findMany({
    where: { teacherId },
    include: {
      subject: { select: { id: true, name: true } },
      class: { select: { id: true, name: true, section: true } },
      teacher: { select: { id: true, name: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
}

export async function getAllTimetables() {
  return prisma.user.findMany({
    where: { role: 'TEACHER', isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { timetableEntries: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getTimetableForPrint(teacherId: number) {
  const [teacher, school] = await Promise.all([
    prisma.user.findUnique({
      where: { id: teacherId },
      include: {
        timetableEntries: {
          include: {
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true, section: true } },
          },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    }),
    prisma.school.findFirst({ select: { name: true, address: true, phone: true } }),
  ])
  if (!teacher) return null
  return { teacher, school }
}

// ─── Conflict check helper ────────────────────────────────────────────────────

async function checkConflicts(
  teacherId: number,
  classId: number,
  dayOfWeek: number,
  startTime: string,
  excludeId?: number,
) {
  const teacherConflict = await prisma.timetableEntry.findFirst({
    where: {
      teacherId,
      dayOfWeek,
      startTime,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true, section: true } },
    },
  })

  if (teacherConflict) {
    throw new Error(
      `Teacher conflict: already has ${teacherConflict.subject.name} scheduled on ${DAY_NAMES[dayOfWeek]} at ${startTime}`,
    )
  }

  const classConflict = await prisma.timetableEntry.findFirst({
    where: {
      classId,
      dayOfWeek,
      startTime,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true, section: true } },
    },
  })

  if (classConflict) {
    throw new Error(
      `Class conflict: ${classConflict.class.name}-${classConflict.class.section} already has ${classConflict.subject.name} scheduled on ${DAY_NAMES[dayOfWeek]} at ${startTime}`,
    )
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createTimetableEntry(data: {
  teacherId: number
  subjectId: number
  classId: number
  dayOfWeek: number
  startTime: string
  endTime: string
  periodNumber?: number
}) {
  await checkConflicts(data.teacherId, data.classId, data.dayOfWeek, data.startTime)
  await prisma.timetableEntry.create({ data })
  revalidatePath('/teachers/timetable')
}

export async function updateTimetableEntry(
  id: number,
  data: {
    subjectId: number
    classId: number
    dayOfWeek: number
    startTime: string
    endTime: string
    periodNumber?: number
    teacherId: number
  },
) {
  await checkConflicts(data.teacherId, data.classId, data.dayOfWeek, data.startTime, id)
  await prisma.timetableEntry.update({ where: { id }, data })
  revalidatePath('/teachers/timetable')
}

export async function deleteTimetableEntry(id: number) {
  await prisma.timetableEntry.delete({ where: { id } })
  revalidatePath('/teachers/timetable')
}

export async function deleteTeacherTimetable(teacherId: number) {
  await prisma.timetableEntry.deleteMany({ where: { teacherId } })
  revalidatePath('/teachers/timetable')
}
