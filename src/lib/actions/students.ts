'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Gender, StudentStatus } from '@prisma/client'

export type StudentWithClass = Awaited<ReturnType<typeof getStudents>>[number]
export type ClassWithYear = Awaited<ReturnType<typeof getClasses>>[number]

export async function getStudents(filters?: {
  search?: string
  classId?: number
  status?: string
  limit?: number
  fetchAll?: boolean
}) {
  const where: Record<string, unknown> = {}

  if (filters?.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { registrationNumber: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  if (filters?.classId) {
    where.classId = filters.classId
  }

  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status as StudentStatus
  }

  return prisma.student.findMany({
    where,
    include: {
      class: {
        include: { academicYear: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: filters?.fetchAll ? undefined : filters?.limit ?? 100,
  })
}

export async function getStudentById(id: number) {
  return prisma.student.findUnique({
    where: { id },
    include: {
      class: {
        include: { academicYear: true },
      },
    },
  })
}

export async function generateRegistrationNumber() {
  const year = new Date().getFullYear()
  const latest = await prisma.student.findFirst({
    where: { registrationNumber: { startsWith: `STU-${year}-` } },
    orderBy: { registrationNumber: 'desc' },
    select: { registrationNumber: true },
  })
  const lastNumber = latest?.registrationNumber.split('-').pop()
  const next = lastNumber ? Number(lastNumber) + 1 : 1
  const number = String(Number.isFinite(next) ? next : 1).padStart(3, '0')
  return `STU-${year}-${number}`
}

export interface CreateStudentInput {
  firstName: string
  lastName: string
  gender: Gender
  classId: number
  guardianName: string
  guardianPhone: string
  dateOfBirth?: string
  guardianCNIC?: string
  address?: string
  admissionDate?: string
  status?: StudentStatus
}

export async function createStudent(data: CreateStudentInput) {
  const registrationNumber = await generateRegistrationNumber()

  const student = await prisma.student.create({
    data: {
      registrationNumber,
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      classId: data.classId,
      guardianName: data.guardianName,
      guardianPhone: data.guardianPhone,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      guardianCNIC: data.guardianCNIC || null,
      address: data.address || null,
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : new Date(),
      status: data.status ?? 'ACTIVE',
    },
  })

  revalidatePath('/students')
  return student
}

export interface UpdateStudentInput {
  firstName?: string
  lastName?: string
  gender?: Gender
  classId?: number
  guardianName?: string
  guardianPhone?: string
  dateOfBirth?: string
  guardianCNIC?: string
  address?: string
  admissionDate?: string
  status?: StudentStatus
}

export async function updateStudent(id: number, data: UpdateStudentInput) {
  const student = await prisma.student.update({
    where: { id },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.gender && { gender: data.gender }),
      ...(data.classId && { classId: Number(data.classId) }),
      ...(data.guardianName && { guardianName: data.guardianName }),
      ...(data.guardianPhone && { guardianPhone: data.guardianPhone }),
      ...(data.dateOfBirth !== undefined && {
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      }),
      ...(data.guardianCNIC !== undefined && { guardianCNIC: data.guardianCNIC || null }),
      ...(data.address !== undefined && { address: data.address || null }),
      ...(data.admissionDate && { admissionDate: new Date(data.admissionDate) }),
      ...(data.status && { status: data.status }),
    },
  })

  revalidatePath('/students')
  revalidatePath(`/students/${id}`)
  return student
}

export async function deleteStudent(id: number) {
  await prisma.student.delete({ where: { id } })
  revalidatePath('/students')
}

export async function getClasses() {
  return prisma.class.findMany({
    include: { academicYear: true },
    orderBy: { name: 'asc' },
  })
}

// ─── Class Strength Report ────────────────────────────────────────────────────

export async function getClassStrengthReport() {
  const classes = await prisma.class.findMany({
    include: {
      students: { where: { status: 'ACTIVE' }, select: { gender: true } },
      academicYear: { select: { name: true } },
    },
    orderBy: [{ name: 'asc' }, { section: 'asc' }],
  })

  return classes.map((cls) => ({
    id: cls.id,
    name: cls.name,
    section: cls.section,
    academicYear: cls.academicYear.name,
    total: cls.students.length,
    male: cls.students.filter((s) => s.gender === 'MALE').length,
    female: cls.students.filter((s) => s.gender === 'FEMALE').length,
  }))
}
