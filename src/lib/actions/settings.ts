'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath, unstable_cache, revalidateTag } from 'next/cache'
import bcrypt from 'bcryptjs'
import { UserRole } from '@prisma/client'

// ─── School Profile ───────────────────────────────────────────────────────────

const getSchoolProfileCached = unstable_cache(
  async () => {
    return await prisma.school.findFirst()
  },
  ['school-profile'],
  { revalidate: 3600, tags: ['school-profile'] }
)

export async function getSchoolProfile() {
  return getSchoolProfileCached()
}

export async function updateSchoolProfile(data: {
  name: string
  address: string
  phone: string
  email?: string
  logoUrl: string
}) {
  if (!data.name || data.name.trim().length < 3) {
    throw new Error('School name is required (minimum 3 characters)')
  }
  if (!data.address || data.address.trim().length < 10) {
    throw new Error('Complete address is required')
  }
  if (!data.phone || !/^(0[0-9]{2,3}-?[0-9]{7,8})$/.test(data.phone.trim())) {
    throw new Error('Valid Pakistani phone number is required')
  }
  if (!data.logoUrl || data.logoUrl.trim().length === 0) {
    throw new Error('School logo is required')
  }

  const school = await prisma.school.upsert({
    where: { id: 1 },
    update: {
      name: data.name.trim(),
      address: data.address.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      logoUrl: data.logoUrl,
    },
    create: {
      id: 1,
      name: data.name.trim(),
      address: data.address.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      logoUrl: data.logoUrl,
    },
  })
  revalidateTag('school-profile')
  revalidatePath('/settings/school')
  revalidatePath('/login')
  return school
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true, name: true, email: true,
      role: true, isActive: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: UserRole
}) {
  const hashed = await bcrypt.hash(data.password, 12)
  await prisma.user.create({
    data: { ...data, password: hashed },
  })
  revalidatePath('/settings/users')
}

export async function updateUser(
  id: number,
  data: { name: string; email: string; role: UserRole; isActive: boolean }
) {
  await prisma.user.update({ where: { id }, data })
  revalidatePath('/settings/users')
}

export async function resetUserPassword(id: number, newPassword: string) {
  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id }, data: { password: hashed } })
  revalidatePath('/settings/users')
}

export async function toggleUserActive(id: number) {
  const user = await prisma.user.findUnique({ where: { id }, select: { isActive: true } })
  if (!user) throw new Error('User not found')
  await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } })
  revalidatePath('/settings/users')
}

// ─── Academic Years ───────────────────────────────────────────────────────────

const getAcademicYearsCached = unstable_cache(
  async () => {
    return await prisma.academicYear.findMany({
      orderBy: { startDate: 'desc' },
    })
  },
  ['academic-years'],
  { revalidate: 3600, tags: ['academic-years'] }
)

const getActiveAcademicYearCached = unstable_cache(
  async () => {
    return await prisma.academicYear.findFirst({ where: { isActive: true } })
  },
  ['active-academic-year'],
  { revalidate: 3600, tags: ['academic-year'] }
)

export async function getAcademicYears() {
  return getAcademicYearsCached()
}

export async function getActiveAcademicYear() {
  return getActiveAcademicYearCached()
}

export async function createAcademicYear(data: {
  name: string
  startDate: Date
  endDate: Date
}) {
  await prisma.academicYear.create({ data: { ...data, isActive: false } })
  revalidateTag('academic-years')
  revalidatePath('/settings/academic-years')
}

export async function setActiveAcademicYear(id: number) {
  await prisma.$transaction([
    prisma.academicYear.updateMany({ data: { isActive: false } }),
    prisma.academicYear.update({ where: { id }, data: { isActive: true } }),
  ])
  revalidateTag('academic-year')
  revalidateTag('academic-years')
  revalidateTag('classes')
  revalidatePath('/settings/academic-years')
  revalidatePath('/dashboard')
}

// ─── Classes ──────────────────────────────────────────────────────────────────

const getClassesCached = unstable_cache(
  async () => {
    return await prisma.class.findMany({
      include: { classTeacher: true, academicYear: true },
      orderBy: { name: 'asc' },
    })
  },
  ['all-classes'],
  { revalidate: 300, tags: ['classes'] }
)

const getAllClassesCached = unstable_cache(
  async () => {
    return await prisma.class.findMany({
      include: {
        classTeacher: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    })
  },
  ['all-classes-detail'],
  { revalidate: 300, tags: ['classes'] }
)

export async function getClasses() {
  return getClassesCached()
}

export async function getAllClasses() {
  return getAllClassesCached()
}

// ─── Fee Structures (cached list for server components) ───────────────────────

const getFeeStructuresCached = unstable_cache(
  async () => {
    return await prisma.feeStructure.findMany({
      include: { class: true, academicYear: true },
      orderBy: { createdAt: 'desc' },
    })
  },
  ['fee-structures'],
  { revalidate: 300, tags: ['fee-structures'] }
)

export async function getFeeStructures() {
  return getFeeStructuresCached()
}

export async function createClass(data: {
  name: string
  section: string
  classTeacherId?: number | null
  academicYearId: number
}) {
  await prisma.class.create({ data })
  revalidateTag('classes')
  revalidatePath('/settings/classes')
  revalidatePath('/classes')
}

export async function updateClass(
  id: number,
  data: {
    name?: string
    section?: string
    classTeacherId?: number | null
    academicYearId?: number
  }
) {
  await prisma.class.update({ where: { id }, data })
  revalidateTag('classes')
  revalidatePath('/settings/classes')
  revalidatePath('/classes')
}

export async function deleteClass(id: number) {
  const count = await prisma.student.count({ where: { classId: id } })
  if (count > 0) {
    throw new Error('Cannot delete a class that has enrolled students')
  }
  await prisma.class.delete({ where: { id } })
  revalidateTag('classes')
  revalidatePath('/settings/classes')
  revalidatePath('/classes')
}

// ─── Class Detail ─────────────────────────────────────────────────────────────

export async function getClassById(id: number) {
  return prisma.class.findUnique({
    where: { id },
    include: {
      classTeacher: { select: { id: true, name: true, email: true } },
      academicYear: { select: { id: true, name: true } },
      students: {
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        select: {
          id: true,
          registrationNumber: true,
          firstName: true,
          lastName: true,
          gender: true,
          status: true,
          guardianName: true,
          guardianPhone: true,
        },
      },
      subjects: {
        orderBy: { name: 'asc' },
        include: {
          teacher: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })
}

export async function getClassStats(id: number) {
  const [totalStudents, activeStudents, maleCount, femaleCount, totalSubjects] = await Promise.all([
    prisma.student.count({ where: { classId: id } }),
    prisma.student.count({ where: { classId: id, status: 'ACTIVE' } }),
    prisma.student.count({ where: { classId: id, status: 'ACTIVE', gender: 'MALE' } }),
    prisma.student.count({ where: { classId: id, status: 'ACTIVE', gender: 'FEMALE' } }),
    prisma.subject.count({ where: { classId: id } }),
  ])
  return { totalStudents, activeStudents, maleCount, femaleCount, totalSubjects }
}
