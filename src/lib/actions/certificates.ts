'use server'

import { revalidatePath } from 'next/cache'
import { CertificateStatus, CertificateType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type CertificateWithRelations = Awaited<ReturnType<typeof getCertificates>>[number]

function prefixForType(type: CertificateType): string {
  switch (type) {
    case 'BIRTH':
      return 'BC'
    case 'SCHOOL_LEAVING':
      return 'SLC'
    case 'CHARACTER':
      return 'CC'
    default:
      return 'CERT'
  }
}

export async function generateCertificateNumber(type: CertificateType) {
  const year = new Date().getFullYear()
  const prefix = prefixForType(type)
  const base = `${prefix}-${year}-`

  const latest = await prisma.certificate.findFirst({
    where: { type, certificateNumber: { startsWith: base } },
    orderBy: { certificateNumber: 'desc' },
    select: { certificateNumber: true },
  })

  const lastNumber = latest?.certificateNumber.split('-').pop()
  const next = lastNumber ? Number(lastNumber) + 1 : 1
  const padded = String(Number.isFinite(next) ? next : 1).padStart(4, '0')

  return `${base}${padded}`
}

export async function issueCertificate(data: {
  type: CertificateType
  studentId: number
  issuedById: number
  issueDate: Date
  notes?: string
  birthPlace?: string
  birthDate?: string
  fatherName?: string
  motherName?: string
  fatherCNIC?: string
  motherCNIC?: string
  fatherOccupation?: string
  dateOfLeaving?: Date
  lastClass?: string
  reasonForLeaving?: string
  conductDuringStay?: string
  characterRemarks?: string
  purpose?: string
}) {
  const certificateNumber = await generateCertificateNumber(data.type)

  const created = await prisma.certificate.create({
    data: {
      certificateNumber,
      type: data.type,
      studentId: data.studentId,
      issuedById: data.issuedById,
      issueDate: data.issueDate,
      notes: data.notes ?? null,
      birthPlace: data.birthPlace ?? null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      fatherName: data.fatherName ?? null,
      motherName: data.motherName ?? null,
      fatherCNIC: data.fatherCNIC ?? null,
      motherCNIC: data.motherCNIC ?? null,
      fatherOccupation: data.fatherOccupation ?? null,
      dateOfLeaving: data.dateOfLeaving ?? null,
      lastClass: data.lastClass ?? null,
      reasonForLeaving: data.reasonForLeaving ?? null,
      conductDuringStay: data.conductDuringStay ?? null,
      characterRemarks: data.characterRemarks ?? null,
      purpose: data.purpose ?? null,
    },
    include: {
      student: { include: { class: true } },
      issuedBy: { select: { id: true, name: true } },
    },
  })

  revalidatePath('/certificates')
  revalidatePath(`/students/${data.studentId}`)

  return created
}

export async function getCertificates(filters?: {
  type?: CertificateType
  studentId?: number
  status?: CertificateStatus
  search?: string
}) {
  const where: {
    type?: CertificateType
    studentId?: number
    status?: CertificateStatus
    OR?: (
      | { certificateNumber: { contains: string; mode: 'insensitive' } }
      | {
          student: {
            OR: {
              firstName?: { contains: string; mode: 'insensitive' }
              lastName?: { contains: string; mode: 'insensitive' }
            }[]
          }
        }
    )[]
  } = {}

  if (filters?.type) where.type = filters.type
  if (filters?.studentId) where.studentId = filters.studentId
  if (filters?.status) where.status = filters.status

  if (filters?.search) {
    where.OR = [
      { certificateNumber: { contains: filters.search, mode: 'insensitive' } },
      {
        student: {
          OR: [
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } },
          ],
        },
      },
    ]
  }

  return prisma.certificate.findMany({
    where,
    include: {
      student: { include: { class: true } },
      issuedBy: { select: { id: true, name: true } },
    },
    orderBy: { issueDate: 'desc' },
  })
}

export async function getCertificateById(id: number) {
  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          class: { include: { academicYear: true } },
        },
      },
      issuedBy: { select: { id: true, name: true } },
    },
  })
  const school = await prisma.school.findFirst()
  return { certificate, school }
}

export async function getStudentCertificates(studentId: number) {
  return prisma.certificate.findMany({
    where: { studentId },
    include: { issuedBy: { select: { id: true, name: true } } },
    orderBy: { issueDate: 'desc' },
  })
}

export async function revokeCertificate(id: number) {
  await prisma.certificate.update({
    where: { id },
    data: { status: 'REVOKED' },
  })
  revalidatePath('/certificates')
}

export async function deleteCertificate(id: number) {
  const cert = await prisma.certificate.findUnique({ where: { id } })
  if (!cert) return
  if (cert.status === 'ISSUED') {
    throw new Error('Cannot delete an issued certificate. Revoke it first.')
  }
  await prisma.certificate.delete({ where: { id } })
  revalidatePath('/certificates')
}

export async function getCertificateStats() {
  const [totalIssued, birth, leaving, character, thisMonthIssued] = await Promise.all([
    prisma.certificate.count({ where: { status: 'ISSUED' } }),
    prisma.certificate.count({ where: { status: 'ISSUED', type: 'BIRTH' } }),
    prisma.certificate.count({ where: { status: 'ISSUED', type: 'SCHOOL_LEAVING' } }),
    prisma.certificate.count({ where: { status: 'ISSUED', type: 'CHARACTER' } }),
    (async () => {
      const now = new Date()
      const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1))
      const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999))
      return prisma.certificate.count({
        where: {
          status: 'ISSUED',
          issueDate: { gte: start, lte: end },
        },
      })
    })(),
  ])

  return {
    totalIssued,
    birthCertificates: birth,
    schoolLeavingCertificates: leaving,
    characterCertificates: character,
    thisMonthIssued,
  }
}

