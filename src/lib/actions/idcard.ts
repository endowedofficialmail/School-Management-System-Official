'use server'

import { prisma } from '@/lib/prisma'

export async function getIdCardData(studentId: number) {
  const [student, school, activeYear] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: { include: { academicYear: true } },
      },
    }),
    prisma.school.findFirst(),
    prisma.academicYear.findFirst({ where: { isActive: true } }),
  ])

  if (!student) return { student: null, school, session: '' }

  const session = activeYear?.name ?? student.class.academicYear.name

  return {
    student: {
      firstName: student.firstName,
      lastName: student.lastName,
      registrationNumber: student.registrationNumber,
      studentCNIC: student.studentCNIC,
      photoBase64: student.photoBase64,
      guardianName: student.guardianName,
      class: student.class,
    },
    school,
    session,
  }
}

export async function getClassIdCardData(classId: number) {
  const [students, school, activeYear] = await Promise.all([
    prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      include: {
        class: { include: { academicYear: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.school.findFirst(),
    prisma.academicYear.findFirst({ where: { isActive: true } }),
  ])

  const session = activeYear?.name ?? students[0]?.class.academicYear.name ?? ''

  return {
    students: students.map((s) => ({
      firstName: s.firstName,
      lastName: s.lastName,
      registrationNumber: s.registrationNumber,
      studentCNIC: s.studentCNIC,
      photoBase64: s.photoBase64,
      guardianName: s.guardianName,
      class: s.class,
    })),
    school,
    session,
  }
}
