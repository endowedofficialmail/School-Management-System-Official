'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type PromotionClassCard = Awaited<ReturnType<typeof getClassesForPromotion>>[number]
export type PromotionStudentRow = Awaited<ReturnType<typeof getStudentsForPromotion>>[number]
export type PromotionTargetClass = Awaited<ReturnType<typeof getAvailableTargetClasses>>[number]
export type PromotionHistoryRow = Awaited<ReturnType<typeof getPromotionHistory>>[number]

function normalizeClassName(name: string) {
  // Try to compare numeric grades first (e.g. "Grade 1", "Class 10", "Nursery")
  const m = name.match(/(\d+)/)
  const n = m ? Number(m[1]) : NaN
  return { raw: name, num: Number.isFinite(n) ? n : null }
}

function compareClassNames(a: string, b: string) {
  const an = normalizeClassName(a)
  const bn = normalizeClassName(b)
  if (an.num != null && bn.num != null && an.num !== bn.num) return an.num - bn.num
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

async function getActiveAcademicYear() {
  const year = await prisma.academicYear.findFirst({
    where: { isActive: true },
    orderBy: { startDate: 'desc' },
  })
  if (!year) throw new Error('Active academic year not found')
  return year
}

async function getNextAcademicYear(activeId: number) {
  const active = await prisma.academicYear.findUnique({ where: { id: activeId } })
  if (!active) return null
  return prisma.academicYear.findFirst({
    where: { startDate: { gt: active.endDate } },
    orderBy: { startDate: 'asc' },
  })
}

export async function getClassesForPromotion() {
  const activeYear = await getActiveAcademicYear()
  return prisma.class.findMany({
    where: { academicYearId: activeYear.id },
    include: {
      academicYear: true,
      _count: {
        select: {
          students: {
            where: { status: 'ACTIVE' },
          },
        },
      },
    },
    orderBy: [{ name: 'asc' }, { section: 'asc' }],
  })
}

export async function getStudentsForPromotion(classId: number) {
  return prisma.student.findMany({
    where: { classId, status: 'ACTIVE' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      registrationNumber: true,
      gender: true,
      guardianName: true,
      guardianPhone: true,
      class: { select: { id: true, name: true, section: true, academicYear: true } },
      performances: {
        take: 1,
        orderBy: { exam: { startDate: 'desc' } },
        select: {
          percentage: true,
          grade: true,
          rank: true,
          isPassed: true,
          exam: { select: { id: true, name: true, startDate: true } },
        },
      },
    },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  }).then((rows) =>
    rows.map((s) => ({
      ...s,
      latestPerformance: s.performances[0]
        ? {
            ...s.performances[0],
            percentage: Number(s.performances[0].percentage),
          }
        : null,
    }))
  )
}

export async function getAvailableTargetClasses(currentClassId: number) {
  const activeYear = await getActiveAcademicYear()
  const current = await prisma.class.findUnique({
    where: { id: currentClassId },
    include: { academicYear: true },
  })
  if (!current) throw new Error('Class not found')

  const nextYear = await getNextAcademicYear(activeYear.id)

  // Same-year higher classes (heuristic by class name order)
  const sameYearClasses = await prisma.class.findMany({
    where: { academicYearId: activeYear.id },
    select: { id: true, name: true, section: true, academicYear: true, academicYearId: true },
  })

  const higherSameYear = sameYearClasses
    .filter((c) => c.id !== currentClassId)
    .filter((c) => compareClassNames(c.name, current.name) > 0)
    .sort((a, b) => compareClassNames(a.name, b.name) || a.section.localeCompare(b.section))

  const nextYearClasses = nextYear
    ? await prisma.class.findMany({
        where: { academicYearId: nextYear.id },
        select: { id: true, name: true, section: true, academicYear: true, academicYearId: true },
        orderBy: [{ name: 'asc' }, { section: 'asc' }],
      })
    : []

  // Combine, dedupe by id
  const map = new Map<number, (typeof higherSameYear)[number]>()
  for (const c of [...higherSameYear, ...nextYearClasses]) map.set(c.id, c)

  return Array.from(map.values())
}

export async function promoteStudents(data: {
  fromClassId: number
  toClassId: number
  toAcademicYearId: number
  promotedById: number
  students: {
    studentId: number
    promote: boolean
    notes?: string
  }[]
}) {
  const [fromClass, toClass] = await Promise.all([
    prisma.class.findUnique({ where: { id: data.fromClassId }, include: { academicYear: true } }),
    prisma.class.findUnique({ where: { id: data.toClassId }, include: { academicYear: true } }),
  ])
  if (!fromClass) throw new Error('From class not found')
  if (!toClass) throw new Error('Target class not found')

  const fromAcademicYearId = fromClass.academicYearId
  const toAcademicYearId = data.toAcademicYearId

  const studentIds = data.students.map((s) => s.studentId)
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, firstName: true, lastName: true, classId: true },
  })
  const studentNameById = new Map(students.map((s) => [s.id, `${s.firstName} ${s.lastName}`]))

  const existingPromos = await prisma.promotionRecord.findMany({
    where: {
      studentId: { in: studentIds },
      fromClassId: data.fromClassId,
      fromAcademicYearId,
    },
    select: { studentId: true },
  })
  const alreadyPromotedSet = new Set(existingPromos.map((r) => r.studentId))
  const alreadyPromoted = Array.from(alreadyPromotedSet).map((id) => studentNameById.get(id) ?? `Student #${id}`)

  // Outstanding fee warning (voucher-based)
  const dueVouchers = await prisma.feeVoucher.findMany({
    where: { studentId: { in: studentIds }, status: { in: ['UNPAID', 'PARTIAL'] } },
    select: { studentId: true, status: true, totalAmount: true, remainingAmount: true, paidAmount: true },
  })
  const duesMap = new Map<number, { voucherCount: number; totalDue: number }>()
  for (const v of dueVouchers) {
    const due =
      v.status === 'PARTIAL'
        ? Number(v.remainingAmount) || Math.max(0, Number(v.totalAmount) - Number(v.paidAmount))
        : Number(v.totalAmount)
    if (!duesMap.has(v.studentId)) duesMap.set(v.studentId, { voucherCount: 0, totalDue: 0 })
    const entry = duesMap.get(v.studentId)!
    entry.voucherCount += 1
    entry.totalDue += due
  }
  const studentsWithDues = Array.from(duesMap.entries())
    .map(([studentId, d]) => ({
      studentId,
      name: studentNameById.get(studentId) ?? `Student #${studentId}`,
      voucherCount: d.voucherCount,
      totalDue: d.totalDue,
    }))
    .sort((a, b) => b.totalDue - a.totalDue)

  const toClassActiveCount = await prisma.student.count({
    where: { classId: data.toClassId, status: 'ACTIVE' },
  })
  const warning =
    toClassActiveCount >= 50
      ? `Target class already has ${toClassActiveCount} active students.`
      : undefined

  let promoted = 0
  let heldBack = 0

  await prisma.$transaction(async (tx) => {
    for (const s of data.students) {
      if (alreadyPromotedSet.has(s.studentId)) {
        continue
      }

      if (s.promote) {
        await tx.student.update({
          where: { id: s.studentId },
          data: { classId: data.toClassId, status: 'ACTIVE' },
        })
        await tx.promotionRecord.create({
          data: {
            studentId: s.studentId,
            fromClassId: data.fromClassId,
            toClassId: data.toClassId,
            fromAcademicYearId,
            toAcademicYearId,
            promotedById: data.promotedById,
            wasPromoted: true,
            notes: null,
          },
        })
        promoted++
      } else {
        // Held back: keep same class and year for audit
        await tx.promotionRecord.create({
          data: {
            studentId: s.studentId,
            fromClassId: data.fromClassId,
            toClassId: data.fromClassId,
            fromAcademicYearId,
            toAcademicYearId: fromAcademicYearId,
            promotedById: data.promotedById,
            wasPromoted: false,
            notes: s.notes?.trim() || null,
          },
        })
        heldBack++
      }
    }
  })

  const remainingActiveInFromClass = await prisma.student.count({
    where: { classId: data.fromClassId, status: 'ACTIVE' },
  })

  revalidatePath('/classes')
  revalidatePath('/students')
  revalidatePath(`/classes/${data.fromClassId}`)
  revalidatePath(`/classes/${data.toClassId}`)

  return {
    promoted,
    heldBack,
    total: promoted + heldBack,
    warning,
    alreadyPromoted,
    studentsWithDues,
    classNowEmpty: remainingActiveInFromClass === 0,
  }
}

export async function getPromotionHistory(filters?: {
  classId?: number
  studentId?: number
  academicYearId?: number
  fromDate?: Date
  toDate?: Date
  status?: 'PROMOTED' | 'HELD_BACK' | 'ALL'
}) {
  const and: Record<string, unknown>[] = []

  if (filters?.studentId) and.push({ studentId: filters.studentId })
  if (filters?.classId) {
    and.push({ OR: [{ fromClassId: filters.classId }, { toClassId: filters.classId }] })
  }
  if (filters?.academicYearId) {
    and.push({
      OR: [
        { fromAcademicYearId: filters.academicYearId },
        { toAcademicYearId: filters.academicYearId },
      ],
    })
  }
  if (filters?.fromDate || filters?.toDate) {
    and.push({
      promotedAt: {
        ...(filters.fromDate ? { gte: filters.fromDate } : {}),
        ...(filters.toDate ? { lte: filters.toDate } : {}),
      },
    })
  }
  if (filters?.status && filters.status !== 'ALL') {
    and.push({ wasPromoted: filters.status === 'PROMOTED' })
  }

  return prisma.promotionRecord.findMany({
    where: and.length > 0 ? { AND: and } : {},
    include: {
      student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } },
      fromClass: { select: { id: true, name: true, section: true } },
      toClass: { select: { id: true, name: true, section: true } },
      fromAcademicYear: { select: { id: true, name: true } },
      toAcademicYear: { select: { id: true, name: true } },
      promotedBy: { select: { id: true, name: true } },
    },
    orderBy: { promotedAt: 'desc' },
  })
}

export async function getStudentPromotionHistory(studentId: number) {
  return prisma.promotionRecord.findMany({
    where: { studentId },
    include: {
      fromClass: { select: { name: true, section: true } },
      toClass: { select: { name: true, section: true } },
      fromAcademicYear: { select: { name: true } },
      toAcademicYear: { select: { name: true } },
      promotedBy: { select: { name: true } },
    },
    orderBy: { promotedAt: 'desc' },
  })
}

export async function getPromotionPrecheck(data: {
  fromClassId: number
  toClassId: number
  studentIds: number[]
}) {
  const fromClass = await prisma.class.findUnique({
    where: { id: data.fromClassId },
    select: { academicYearId: true },
  })
  if (!fromClass) throw new Error('Source class not found')

  const students = await prisma.student.findMany({
    where: { id: { in: data.studentIds } },
    select: { id: true, firstName: true, lastName: true },
  })
  const nameById = new Map(students.map((s) => [s.id, `${s.firstName} ${s.lastName}`]))

  const existingPromos = await prisma.promotionRecord.findMany({
    where: {
      studentId: { in: data.studentIds },
      fromClassId: data.fromClassId,
      fromAcademicYearId: fromClass.academicYearId,
    },
    select: { studentId: true },
  })
  const alreadySet = new Set(existingPromos.map((r) => r.studentId))
  const alreadyPromoted = Array.from(alreadySet).map((id) => nameById.get(id) ?? `Student #${id}`)

  const dueVouchers = await prisma.feeVoucher.findMany({
    where: { studentId: { in: data.studentIds }, status: { in: ['UNPAID', 'PARTIAL'] } },
    select: { studentId: true, status: true, totalAmount: true, remainingAmount: true, paidAmount: true },
  })
  const duesMap = new Map<number, { voucherCount: number; totalDue: number }>()
  for (const v of dueVouchers) {
    const due =
      v.status === 'PARTIAL'
        ? Number(v.remainingAmount) || Math.max(0, Number(v.totalAmount) - Number(v.paidAmount))
        : Number(v.totalAmount)
    if (!duesMap.has(v.studentId)) duesMap.set(v.studentId, { voucherCount: 0, totalDue: 0 })
    const entry = duesMap.get(v.studentId)!
    entry.voucherCount += 1
    entry.totalDue += due
  }
  const studentsWithDues = Array.from(duesMap.entries()).map(([studentId, d]) => ({
    studentId,
    name: nameById.get(studentId) ?? `Student #${studentId}`,
    voucherCount: d.voucherCount,
    totalDue: d.totalDue,
  }))

  const toClassActiveCount = await prisma.student.count({
    where: { classId: data.toClassId, status: 'ACTIVE' },
  })
  const warning =
    toClassActiveCount >= 50
      ? `Target class already has ${toClassActiveCount} active students.`
      : undefined

  return { alreadyPromoted, studentsWithDues, warning }
}

export async function getPromotionFilters() {
  const [classes, years] = await Promise.all([
    prisma.class.findMany({
      select: { id: true, name: true, section: true, academicYear: { select: { id: true, name: true } } },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
    }),
    prisma.academicYear.findMany({ select: { id: true, name: true }, orderBy: { startDate: 'desc' } }),
  ])
  return { classes, years }
}

