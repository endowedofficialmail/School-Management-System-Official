'use server'

import { prisma } from '@/lib/prisma'

export type TeacherWithStats = Awaited<ReturnType<typeof getTeachersWithStats>>[number]
export type TeacherDetail = NonNullable<Awaited<ReturnType<typeof getTeacherById>>>

export async function getTeachersWithStats() {
  return prisma.user.findMany({
    where: { role: 'TEACHER' },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      _count: { select: { classes: true, subjects: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getTeacherById(id: number) {
  return prisma.user.findFirst({
    where: { id, role: 'TEACHER' },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      classes: {
        select: {
          id: true,
          name: true,
          section: true,
          _count: { select: { students: true } },
          academicYear: { select: { name: true } },
        },
        orderBy: { name: 'asc' },
      },
      subjects: {
        include: {
          class: { select: { name: true, section: true } },
        },
        orderBy: { name: 'asc' },
      },
    },
  })
}
