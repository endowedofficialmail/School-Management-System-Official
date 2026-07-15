'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type RollSlipWithDetails = Awaited<ReturnType<typeof getRollSlipsByExam>>[number]
export type RollSlipPrintData = NonNullable<Awaited<ReturnType<typeof getRollSlipById>>>
export type StudentRollSlipRow = Awaited<ReturnType<typeof getRollSlipsByStudent>>[number]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export async function generateRollNumber(examId: number): Promise<string> {
  const prefix = `ROLL-${examId}-`
  const latest = await prisma.rollNumberSlip.findFirst({
    where: { examId, rollNumber: { startsWith: prefix } },
    orderBy: { rollNumber: 'desc' },
    select: { rollNumber: true },
  })

  let next = 1
  if (latest) {
    const parts = latest.rollNumber.split('-')
    const numPart = parseInt(parts[parts.length - 1] ?? '0', 10)
    if (!Number.isNaN(numPart)) next = numPart + 1
  }

  return `${prefix}${String(next).padStart(4, '0')}`
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getRollSlipsByExam(examId: number) {
  return prisma.rollNumberSlip.findMany({
    where: { examId },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          registrationNumber: true,
          class: { select: { id: true, name: true, section: true } },
        },
      },
      issuedBy: { select: { id: true, name: true } },
    },
    orderBy: { rollNumber: 'asc' },
  })
}

export async function getRollSlipsByStudent(studentId: number) {
  return prisma.rollNumberSlip.findMany({
    where: { studentId },
    include: {
      exam: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          academicYear: { select: { name: true } },
        },
      },
      issuedBy: { select: { name: true } },
    },
    orderBy: { issuedAt: 'desc' },
  })
}

export async function getRollSlipById(id: number) {
  const slip = await prisma.rollNumberSlip.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          class: { select: { id: true, name: true, section: true } },
        },
      },
      exam: {
        include: {
          academicYear: true,
          examClasses: { include: { class: true } },
          datesheetEntries: {
            include: { subject: { select: { id: true, name: true } } },
            orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          },
        },
      },
      issuedBy: { select: { id: true, name: true } },
    },
  })
  if (!slip) return null

  const school = await prisma.school.findFirst()
  return { slip, school }
}

export async function getStudentsWithoutSlips(examId: number, classId: number) {
  const existingSlips = await prisma.rollNumberSlip.findMany({
    where: { examId, student: { classId } },
    select: { studentId: true },
  })
  const issuedIds = new Set(existingSlips.map((s) => s.studentId))

  return prisma.student.findMany({
    where: {
      classId,
      status: 'ACTIVE',
      id: { notIn: Array.from(issuedIds) },
    },
    include: {
      class: { select: { id: true, name: true, section: true } },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })
}

export async function getStudentsForRollSlipIssue(examId: number, classId: number) {
  const [students, slips] = await Promise.all([
    prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      include: { class: { select: { id: true, name: true, section: true } } },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.rollNumberSlip.findMany({
      where: { examId, student: { classId } },
      select: { id: true, studentId: true, rollNumber: true, isValid: true },
    }),
  ])

  const slipMap = new Map(slips.map((s) => [s.studentId, s]))
  return students.map((s) => ({
    ...s,
    existingSlip: slipMap.get(s.id) ?? null,
  }))
}

export async function getRollSlipForStudentExam(examId: number, studentId: number) {
  return prisma.rollNumberSlip.findUnique({
    where: { studentId_examId: { studentId, examId } },
    select: { id: true, rollNumber: true, venue: true, instructions: true, isValid: true },
  })
}

export async function searchExamStudents(examId: number, query: string) {
  const examClasses = await prisma.examClass.findMany({
    where: { examId },
    select: { classId: true },
  })
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    select: { classId: true },
  })
  const classIds = examClasses.length > 0
    ? examClasses.map((ec) => ec.classId)
    : exam?.classId
      ? [exam.classId]
      : []

  if (classIds.length === 0) return []

  const q = query.trim()
  return prisma.student.findMany({
    where: {
      classId: { in: classIds },
      status: 'ACTIVE',
      ...(q
        ? {
            OR: [
              { firstName: { contains: q, mode: 'insensitive' as const } },
              { lastName: { contains: q, mode: 'insensitive' as const } },
              { registrationNumber: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    include: {
      class: { select: { id: true, name: true, section: true } },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    take: 20,
  })
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function issueRollSlipsForClass(data: {
  examId: number
  classId: number
  issuedById: number
  venue?: string
  instructions?: string
  studentIds: number[]
}) {
  let created = 0
  let skipped = 0

  for (const studentId of data.studentIds) {
    const existing = await prisma.rollNumberSlip.findUnique({
      where: { studentId_examId: { studentId, examId: data.examId } },
    })
    if (existing) {
      skipped++
      continue
    }

    const rollNumber = await generateRollNumber(data.examId)
    await prisma.rollNumberSlip.create({
      data: {
        rollNumber,
        studentId,
        examId: data.examId,
        issuedById: data.issuedById,
        venue: data.venue?.trim() || null,
        instructions: data.instructions?.trim() || null,
      },
    })
    created++
  }

  revalidatePath('/exams')
  revalidatePath(`/exams/${data.examId}/rollslips`)
  return { created, skipped }
}

export async function issueRollSlipForStudent(data: {
  examId: number
  studentId: number
  issuedById: number
  venue?: string
  instructions?: string
}) {
  const existing = await prisma.rollNumberSlip.findUnique({
    where: { studentId_examId: { studentId: data.studentId, examId: data.examId } },
  })
  if (existing) {
    throw new Error('Roll slip already issued for this student')
  }

  const rollNumber = await generateRollNumber(data.examId)
  const slip = await prisma.rollNumberSlip.create({
    data: {
      rollNumber,
      studentId: data.studentId,
      examId: data.examId,
      issuedById: data.issuedById,
      venue: data.venue?.trim() || null,
      instructions: data.instructions?.trim() || null,
    },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          registrationNumber: true,
          class: { select: { name: true, section: true } },
        },
      },
      issuedBy: { select: { name: true } },
    },
  })

  revalidatePath('/exams')
  revalidatePath(`/exams/${data.examId}/rollslips`)
  return slip
}

export async function updateRollSlipDetails(
  id: number,
  data: { venue?: string; instructions?: string }
) {
  const slip = await prisma.rollNumberSlip.update({
    where: { id },
    data: {
      venue: data.venue !== undefined ? (data.venue.trim() || null) : undefined,
      instructions: data.instructions !== undefined ? (data.instructions.trim() || null) : undefined,
    },
  })
  revalidatePath('/exams')
  revalidatePath(`/exams/${slip.examId}/rollslips`)
  return slip
}

export async function invalidateRollSlip(id: number) {
  const slip = await prisma.rollNumberSlip.update({
    where: { id },
    data: { isValid: false },
  })
  revalidatePath('/exams')
  revalidatePath(`/exams/${slip.examId}/rollslips`)
  return slip
}

export async function deleteRollSlip(id: number) {
  const slip = await prisma.rollNumberSlip.delete({ where: { id } })
  revalidatePath('/exams')
  revalidatePath(`/exams/${slip.examId}/rollslips`)
  return slip
}
