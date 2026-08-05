'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function normalizeCNIC(cnic: string) {
  return cnic.replace(/[-\s]/g, '')
}

export async function generateFID() {
  const latest = await prisma.family.findFirst({
    orderBy: { fid: 'desc' },
    select: { fid: true },
  })
  let next = 1
  if (latest?.fid) {
    const num = Number(latest.fid.replace('FAM-', ''))
    if (Number.isFinite(num)) next = num + 1
  }
  const fid = `FAM-${String(next).padStart(4, '0')}`
  const exists = await prisma.family.findUnique({ where: { fid } })
  if (exists) return generateFID()
  return fid
}

export async function findOrCreateFamily(guardianCNIC: string) {
  const normalized = normalizeCNIC(guardianCNIC)
  if (!normalized) throw new Error('Guardian CNIC is required')

  const existing = await prisma.family.findUnique({
    where: { guardianCNIC: normalized },
  })
  if (existing) return existing

  const fid = await generateFID()
  return prisma.family.create({
    data: { fid, guardianCNIC: normalized },
  })
}

export async function linkStudentToFamily(studentId: number, guardianCNIC: string) {
  const family = await findOrCreateFamily(guardianCNIC)
  await prisma.student.update({
    where: { id: studentId },
    data: { familyId: family.id },
  })
  revalidatePath('/students')
  revalidatePath(`/students/${studentId}`)
  revalidatePath('/students/family')
  return family
}

const studentInclude = {
  class: { include: { academicYear: true } },
} as const

export async function getFamilyByFID(fid: string) {
  const family = await prisma.family.findUnique({
    where: { fid: fid.toUpperCase() },
    include: {
      students: {
        include: studentInclude,
        orderBy: { admissionDate: 'asc' },
      },
    },
  })
  if (!family) throw new Error('Family not found')
  return family
}

export async function getFamilyByCNIC(cnic: string) {
  const normalized = normalizeCNIC(cnic)
  const family = await prisma.family.findUnique({
    where: { guardianCNIC: normalized },
    include: {
      students: {
        include: studentInclude,
        orderBy: { admissionDate: 'asc' },
      },
    },
  })
  if (!family) throw new Error('Family not found')
  return family
}

export async function getFamilyByStudentId(studentId: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { family: { include: { students: { include: studentInclude, orderBy: { admissionDate: 'asc' } } } } },
  })
  if (!student?.family) return { family: null, siblings: [] }
  const siblings = student.family.students.filter((s) => s.id !== studentId)
  return { family: student.family, siblings }
}

export async function searchFamilies(query: string) {
  const q = query.trim()
  if (!q) return []

  const byFid = await prisma.family.findMany({
    where: { fid: { contains: q.toUpperCase(), mode: 'insensitive' } },
    include: {
      students: {
        include: studentInclude,
        orderBy: { admissionDate: 'asc' },
        take: 1,
      },
      _count: { select: { students: true } },
    },
    take: 20,
  })

  if (byFid.length > 0) {
    return byFid.map((f) => ({
      ...f,
      guardianName: f.students[0]?.guardianName ?? '—',
    }))
  }

  const normalized = normalizeCNIC(q)
  if (normalized.length >= 5) {
    const byCnic = await prisma.family.findUnique({
      where: { guardianCNIC: normalized },
      include: {
        students: { include: studentInclude, orderBy: { admissionDate: 'asc' }, take: 1 },
        _count: { select: { students: true } },
      },
    })
    if (byCnic) {
      return [{ ...byCnic, guardianName: byCnic.students[0]?.guardianName ?? '—' }]
    }
  }

  const students = await prisma.student.findMany({
    where: {
      guardianName: { contains: q, mode: 'insensitive' },
      familyId: { not: null },
    },
    select: { familyId: true },
    distinct: ['familyId'],
    take: 20,
  })

  const familyIds = students.map((s) => s.familyId!).filter(Boolean)
  if (familyIds.length === 0) return []

  const families = await prisma.family.findMany({
    where: { id: { in: familyIds } },
    include: {
      students: { include: studentInclude, orderBy: { admissionDate: 'asc' }, take: 1 },
      _count: { select: { students: true } },
    },
  })

  return families.map((f) => ({
    ...f,
    guardianName: f.students[0]?.guardianName ?? '—',
  }))
}

export async function retroactivelyLinkFamilies() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') throw new Error('Unauthorized')

  const students = await prisma.student.findMany({
    where: { guardianCNIC: { not: null } },
    select: { id: true, guardianCNIC: true },
  })

  const groups = new Map<string, number[]>()
  for (const s of students) {
    if (!s.guardianCNIC) continue
    const key = normalizeCNIC(s.guardianCNIC)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(s.id)
  }

  let familiesCreated = 0
  let studentsLinked = 0

  for (const [cnic, ids] of groups) {
    const before = await prisma.family.findUnique({ where: { guardianCNIC: cnic } })
    const family = await findOrCreateFamily(cnic)
    if (!before) familiesCreated++
    await prisma.student.updateMany({
      where: { id: { in: ids } },
      data: { familyId: family.id },
    })
    studentsLinked += ids.length
  }

  revalidatePath('/students/family')
  return { familiesCreated, studentsLinked }
}
