'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { Gender, StudentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

async function generateRegistrationNumber() {
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

export interface ImportRow {
  firstName: string
  lastName: string
  gender: 'MALE' | 'FEMALE'
  className: string
  section: string
  classId?: number
  guardianName: string
  guardianPhone: string
  guardianCNIC?: string
  address?: string
  dateOfBirth?: Date
  admissionDate?: Date
  status: 'ACTIVE' | 'LEFT' | 'GRADUATED'
  rowNumber: number
}

export interface ImportError {
  rowNumber: number
  rowData: string
  errors: string[]
}

export interface CredentialRow {
  rowNumber: number
  studentName: string
  registrationNumber: string
  className: string
  studentEmail: string
  studentPassword: string
  parentEmail: string
  parentPassword: string
  parentAccountStatus: string
}

export type PortalCredentials = {
  studentEmail: string
  studentPassword: string
  parentEmail: string
  parentPassword: string
  parentAccountCreated: boolean
}

// ─── Email / password generators ─────────────────────────────────────────────

function generateStudentEmail(registrationNumber: string, schoolName: string): string {
  const clean = registrationNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
  const schoolSlug = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'school'
  return `${clean}@${schoolSlug}.portal`
}

function generateParentEmail(guardianPhone: string, schoolName: string): string {
  const clean = guardianPhone.replace(/[^0-9]/g, '')
  const schoolSlug = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'school'
  return `${clean}@${schoolSlug}.portal`
}

function generateStudentPassword(registrationNumber: string): string {
  return registrationNumber.replace(/-/g, '')
}

function generateParentPassword(guardianPhone: string, guardianCNIC?: string): string {
  if (guardianCNIC) {
    const clean = guardianCNIC.replace(/[^0-9]/g, '')
    if (clean.length >= 6) return clean.slice(-6)
  }
  const phone = guardianPhone.replace(/[^0-9]/g, '')
  return phone.slice(-6) || '123456'
}

function isValidPakistaniPhone(phone: string): boolean {
  return /^(0[0-9]{2,3}-?[0-9]{7,8})$/.test(phone.trim())
}

function parseGender(value: string): 'MALE' | 'FEMALE' | null {
  const v = value.trim().toUpperCase()
  if (v === 'MALE' || v === 'M') return 'MALE'
  if (v === 'FEMALE' || v === 'F') return 'FEMALE'
  return null
}

function parseStatus(value: string | undefined): StudentStatus {
  if (!value || !value.trim()) return 'ACTIVE'
  const v = value.trim().toUpperCase()
  if (v === 'ACTIVE' || v === 'LEFT' || v === 'GRADUATED') return v
  throw new Error(`Status must be ACTIVE, LEFT, or GRADUATED`)
}

function parseOptionalDate(value: string | undefined, field: string): Date | undefined {
  if (!value || !value.trim()) return undefined
  const d = new Date(value.trim())
  if (Number.isNaN(d.getTime())) throw new Error(`${field} is not a valid date`)
  return d
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

const HEADER_MAP: Record<string, string> = {
  firstname: 'firstName',
  lastname: 'lastName',
  gender: 'gender',
  malefemale: 'gender',
  classname: 'className',
  class: 'className',
  section: 'section',
  guardianname: 'guardianName',
  guardianphone: 'guardianPhone',
  phone: 'guardianPhone',
  guardiancnic: 'guardianCNIC',
  cnic: 'guardianCNIC',
  dateofbirth: 'dateOfBirth',
  dob: 'dateOfBirth',
  address: 'address',
  admissiondate: 'admissionDate',
  status: 'status',
}

// ─── Auto portal account creation ────────────────────────────────────────────

export async function createPortalAccountsForStudent(studentId: number): Promise<PortalCredentials> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  })
  if (!student) throw new Error('Student not found')

  const school = await prisma.school.findFirst()
  if (!school) throw new Error('School not found')

  const results: PortalCredentials = {
    studentEmail: '',
    studentPassword: '',
    parentEmail: '',
    parentPassword: '',
    parentAccountCreated: false,
  }

  // 1. Create STUDENT portal account
  const existingStudentProfile = await prisma.studentPortalProfile.findUnique({
    where: { studentId },
  })

  if (!existingStudentProfile) {
    const studentEmail = generateStudentEmail(student.registrationNumber, school.name)
    const studentPassword = generateStudentPassword(student.registrationNumber)
    const hashedPassword = await bcrypt.hash(studentPassword, 12)

    const existingUser = await prisma.user.findUnique({ where: { email: studentEmail } })

    if (!existingUser) {
      const studentUser = await prisma.user.create({
        data: {
          name: `${student.firstName} ${student.lastName}`,
          email: studentEmail,
          password: hashedPassword,
          role: 'STUDENT',
          isActive: true,
          mustChangePassword: true,
        },
      })

      await prisma.studentPortalProfile.create({
        data: {
          userId: studentUser.id,
          studentId: student.id,
        },
      })

      results.studentEmail = studentEmail
      results.studentPassword = studentPassword
    } else {
      // Email exists but no profile — try to link if possible
      const profileForUser = await prisma.studentPortalProfile.findUnique({
        where: { userId: existingUser.id },
      })
      if (!profileForUser) {
        await prisma.studentPortalProfile.create({
          data: { userId: existingUser.id, studentId: student.id },
        })
        results.studentEmail = studentEmail
        results.studentPassword = '(existing account)'
      }
    }
  } else {
    const user = await prisma.user.findUnique({ where: { id: existingStudentProfile.userId } })
    results.studentEmail = user?.email ?? ''
    results.studentPassword = '(existing account)'
  }

  // 2. Create or link PARENT portal account
  if (student.guardianPhone) {
    const parentEmail = generateParentEmail(student.guardianPhone, school.name)
    const parentPassword = generateParentPassword(
      student.guardianPhone,
      student.guardianCNIC || undefined
    )

    let parentUser = await prisma.user.findUnique({ where: { email: parentEmail } })
    let parent = parentUser
      ? await prisma.parent.findUnique({ where: { userId: parentUser.id } })
      : null

    if (!parentUser) {
      const hashedPassword = await bcrypt.hash(parentPassword, 12)
      parentUser = await prisma.user.create({
        data: {
          name: student.guardianName,
          email: parentEmail,
          password: hashedPassword,
          role: 'PARENT',
          isActive: true,
          mustChangePassword: true,
        },
      })

      parent = await prisma.parent.create({
        data: { userId: parentUser.id },
      })

      results.parentEmail = parentEmail
      results.parentPassword = parentPassword
      results.parentAccountCreated = true
    } else {
      results.parentEmail = parentEmail
      results.parentPassword = '(existing account)'
      results.parentAccountCreated = false

      if (!parent) {
        parent = await prisma.parent.create({
          data: { userId: parentUser.id },
        })
      }
    }

    if (parent) {
      const existingLink = await prisma.parentStudent.findUnique({
        where: {
          parentId_studentId: {
            parentId: parent.id,
            studentId: student.id,
          },
        },
      })

      if (!existingLink) {
        await prisma.parentStudent.create({
          data: {
            parentId: parent.id,
            studentId: student.id,
            relation: 'Guardian',
          },
        })
      }
    }
  }

  return results
}

// ─── Validation of parsed rows (client sends string[][]) ─────────────────────

export async function validateImportRows(rawRows: string[][]): Promise<{
  valid: ImportRow[]
  errors: ImportError[]
  total: number
}> {
  if (!rawRows.length) {
    return { valid: [], errors: [{ rowNumber: 0, rowData: '', errors: ['File is empty'] }], total: 0 }
  }

  // Skip comment rows starting with #
  const cleaned = rawRows.filter((row) => {
    const first = String(row[0] ?? '').trim()
    return first && !first.startsWith('#')
  })

  if (cleaned.length < 2) {
    return {
      valid: [],
      errors: [{ rowNumber: 0, rowData: '', errors: ['File must include a header row and at least one data row'] }],
      total: 0,
    }
  }

  const headerCells = cleaned[0].map((h) => normalizeHeader(String(h ?? '')))
  const colIndex: Record<string, number> = {}
  headerCells.forEach((h, i) => {
    const key = HEADER_MAP[h]
    if (key && colIndex[key] === undefined) colIndex[key] = i
  })

  const required = ['firstName', 'lastName', 'gender', 'className', 'section', 'guardianName', 'guardianPhone']
  const missingHeaders = required.filter((k) => colIndex[k] === undefined)
  if (missingHeaders.length) {
    return {
      valid: [],
      errors: [{
        rowNumber: 1,
        rowData: cleaned[0].join(','),
        errors: [`Missing required columns: ${missingHeaders.join(', ')}`],
      }],
      total: 0,
    }
  }

  const classes = await prisma.class.findMany({
    where: { academicYear: { isActive: true } },
    select: { id: true, name: true, section: true },
  })

  const classLookup = new Map(
    classes.map((c) => [`${c.name.trim().toLowerCase()}|${c.section.trim().toLowerCase()}`, c.id])
  )

  const valid: ImportRow[] = []
  const errors: ImportError[] = []

  for (let i = 1; i < cleaned.length; i++) {
    const row = cleaned[i]
    const rowNumber = i + 1
    const get = (key: string) => String(row[colIndex[key]] ?? '').trim()
    const rowErrors: string[] = []

    const firstName = get('firstName')
    const lastName = get('lastName')
    const genderRaw = get('gender')
    const className = get('className')
    const section = get('section')
    const guardianName = get('guardianName')
    const guardianPhone = get('guardianPhone')
    const guardianCNIC = colIndex.guardianCNIC !== undefined ? get('guardianCNIC') : ''
    const address = colIndex.address !== undefined ? get('address') : ''
    const dobRaw = colIndex.dateOfBirth !== undefined ? get('dateOfBirth') : ''
    const admissionRaw = colIndex.admissionDate !== undefined ? get('admissionDate') : ''
    const statusRaw = colIndex.status !== undefined ? get('status') : ''

    if (!firstName) rowErrors.push('First Name is required')
    if (!lastName) rowErrors.push('Last Name is required')
    if (!guardianName) rowErrors.push('Guardian Name is required')
    if (!guardianPhone) rowErrors.push('Guardian Phone is required')
    else if (!isValidPakistaniPhone(guardianPhone)) {
      rowErrors.push('Guardian phone format invalid (e.g. 0300-1234567)')
    }
    if (!className) rowErrors.push('Class Name is required')
    if (!section) rowErrors.push('Section is required')

    const gender = parseGender(genderRaw)
    if (!gender) rowErrors.push('Gender must be Male or Female')

    let status: StudentStatus = 'ACTIVE'
    try {
      status = parseStatus(statusRaw)
    } catch (e) {
      rowErrors.push(e instanceof Error ? e.message : 'Invalid status')
    }

    let dateOfBirth: Date | undefined
    let admissionDate: Date | undefined
    try {
      dateOfBirth = parseOptionalDate(dobRaw, 'Date of Birth')
    } catch (e) {
      rowErrors.push(e instanceof Error ? e.message : 'Invalid date of birth')
    }
    try {
      admissionDate = parseOptionalDate(admissionRaw, 'Admission Date')
    } catch (e) {
      rowErrors.push(e instanceof Error ? e.message : 'Invalid admission date')
    }

    const classId = classLookup.get(`${className.toLowerCase()}|${section.toLowerCase()}`)
    if (className && section && !classId) {
      rowErrors.push(`Class "${className} - ${section}" not found in system`)
    }

    if (rowErrors.length) {
      errors.push({
        rowNumber,
        rowData: row.join(','),
        errors: rowErrors,
      })
      continue
    }

    valid.push({
      firstName,
      lastName,
      gender: gender as Gender,
      className,
      section,
      classId,
      guardianName,
      guardianPhone,
      guardianCNIC: guardianCNIC || undefined,
      address: address || undefined,
      dateOfBirth,
      admissionDate,
      status,
      rowNumber,
    })
  }

  return { valid, errors, total: cleaned.length - 1 }
}

// Keep alias name from spec
export async function parseStudentImportFile(
  fileContent: string,
  fileType: 'csv' | 'excel'
): Promise<{ valid: ImportRow[]; errors: ImportError[]; total: number }> {
  void fileContent
  void fileType
  throw new Error('Use validateImportRows with client-parsed data instead')
}

export async function bulkImportStudents(
  rows: ImportRow[],
  adminId: number
): Promise<{
  imported: number
  failed: number
  credentialsList: CredentialRow[]
  errors: { rowNumber: number; error: string }[]
}> {
  void adminId
  const credentialsList: CredentialRow[] = []
  let imported = 0
  let failed = 0
  const errors: { rowNumber: number; error: string }[] = []

  for (const row of rows) {
    try {
      const classRecord = await prisma.class.findFirst({
        where: {
          name: { equals: row.className, mode: 'insensitive' },
          section: { equals: row.section, mode: 'insensitive' },
          academicYear: { isActive: true },
        },
      })

      if (!classRecord) {
        errors.push({
          rowNumber: row.rowNumber,
          error: `Class "${row.className} - ${row.section}" not found`,
        })
        failed++
        continue
      }

      const registrationNumber = await generateRegistrationNumber()

      const student = await prisma.student.create({
        data: {
          registrationNumber,
          firstName: row.firstName,
          lastName: row.lastName,
          gender: row.gender,
          classId: classRecord.id,
          guardianName: row.guardianName,
          guardianPhone: row.guardianPhone,
          guardianCNIC: row.guardianCNIC || null,
          address: row.address || null,
          dateOfBirth: row.dateOfBirth || null,
          admissionDate: row.admissionDate || new Date(),
          status: row.status || 'ACTIVE',
        },
      })

      const credentials = await createPortalAccountsForStudent(student.id)

      credentialsList.push({
        rowNumber: row.rowNumber,
        studentName: `${row.firstName} ${row.lastName}`,
        registrationNumber,
        className: `${row.className} - ${row.section}`,
        studentEmail: credentials.studentEmail,
        studentPassword: credentials.studentPassword,
        parentEmail: credentials.parentEmail,
        parentPassword: credentials.parentPassword,
        parentAccountStatus: credentials.parentAccountCreated
          ? 'New account created'
          : 'Linked to existing account',
      })

      imported++
    } catch (error: unknown) {
      errors.push({
        rowNumber: row.rowNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      failed++
    }
  }

  revalidatePath('/students')
  revalidatePath('/settings/users')
  return { imported, failed, credentialsList, errors }
}

// ─── Credentials / password reset helpers ────────────────────────────────────

export async function resetAllStudentPasswordsToRegNumbers(): Promise<{ count: number }> {
  const profiles = await prisma.studentPortalProfile.findMany({
    include: {
      student: { select: { registrationNumber: true } },
      user: { select: { id: true } },
    },
  })

  let count = 0
  for (const profile of profiles) {
    const password = generateStudentPassword(profile.student.registrationNumber)
    const hashed = await bcrypt.hash(password, 12)
    await prisma.user.update({
      where: { id: profile.user.id },
      data: { password: hashed, mustChangePassword: true },
    })
    count++
  }

  revalidatePath('/settings/users')
  return { count }
}

export async function getAllPortalCredentialsExport(): Promise<
  Array<{
    studentName: string
    registrationNumber: string
    className: string
    studentEmail: string
    parentEmail: string
    parentAccountStatus: string
  }>
> {
  const profiles = await prisma.studentPortalProfile.findMany({
    include: {
      user: { select: { email: true } },
      student: {
        include: {
          class: { select: { name: true, section: true } },
          parentLinks: {
            include: {
              parent: { include: { user: { select: { email: true } } } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return profiles.map((p) => {
    const parentLink = p.student.parentLinks[0]
    return {
      studentName: `${p.student.firstName} ${p.student.lastName}`,
      registrationNumber: p.student.registrationNumber,
      className: `${p.student.class.name} - ${p.student.class.section}`,
      studentEmail: p.user.email,
      parentEmail: parentLink?.parent.user.email ?? '',
      parentAccountStatus: parentLink ? 'Linked' : 'No parent linked',
    }
  })
}
