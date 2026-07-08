'use server'

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function isSystemSetup(): Promise<boolean> {
  const school = await prisma.school.findFirst()
  return !!school
}

export async function setupSystem(data: {
  schoolName: string
  address: string
  phone: string
  email?: string
  logoBase64: string
  adminName: string
  adminEmail: string
  adminPassword: string
  academicYearName?: string
  academicYearStartDate?: string
  academicYearEndDate?: string
}) {
  const hashed = await bcrypt.hash(data.adminPassword, 12)

  const now = new Date()
  const currentYear = now.getFullYear()

  await prisma.$transaction(async (tx) => {
    await tx.school.create({
      data: {
        id: 1,
        name: data.schoolName,
        address: data.address,
        phone: data.phone,
        email: data.email?.trim() || null,
        logoUrl: data.logoBase64,
      },
    })

    await tx.academicYear.create({
      data: {
        name: data.academicYearName || `${currentYear}-${currentYear + 1}`,
        startDate: data.academicYearStartDate ? new Date(data.academicYearStartDate) : new Date(`${currentYear}-04-01`),
        endDate: data.academicYearEndDate ? new Date(data.academicYearEndDate) : new Date(`${currentYear + 1}-03-31`),
        isActive: true,
      },
    })

    await tx.user.create({
      data: {
        name: data.adminName,
        email: data.adminEmail,
        password: hashed,
        role: 'ADMIN',
        isActive: true,
      },
    })
  })
}
