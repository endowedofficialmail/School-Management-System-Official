'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type DatesheetEntryWithDetails = Awaited<ReturnType<typeof getDatesheetByExam>>[number]
export type DatesheetPrintData = NonNullable<Awaited<ReturnType<typeof getDatesheetForPrint>>>

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getDatesheetByExam(examId: number) {
  return prisma.datesheetEntry.findMany({
    where: { examId },
    include: {
      subject: { select: { id: true, name: true } },
      exam: {
        select: {
          id: true,
          name: true,
          class: { select: { id: true, name: true, section: true } },
        },
      },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
}

export async function getDatesheetForPrint(examId: number) {
  const [exam, school] = await Promise.all([
    prisma.exam.findUnique({
      where: { id: examId },
      include: {
        class: true,
        academicYear: true,
        examClasses: { include: { class: true } },
        datesheetEntries: {
          include: { subject: { select: { id: true, name: true } } },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        },
      },
    }),
    prisma.school.findFirst({ select: { name: true, address: true, phone: true } }),
  ])
  if (!exam) return null
  return { exam, school }
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function upsertDatesheetEntry(data: {
  examId: number
  subjectId: number
  date: Date
  startTime: string
  endTime: string
  room?: string
}) {
  await prisma.datesheetEntry.upsert({
    where: { examId_subjectId: { examId: data.examId, subjectId: data.subjectId } },
    create: data,
    update: {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      room: data.room ?? null,
    },
  })
  revalidatePath('/exams')
}

export async function deleteDatesheetEntry(id: number) {
  await prisma.datesheetEntry.delete({ where: { id } })
  revalidatePath('/exams')
}

export async function deleteFullDatesheet(examId: number) {
  await prisma.datesheetEntry.deleteMany({ where: { examId } })
  revalidatePath('/exams')
}
