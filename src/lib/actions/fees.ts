'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { FeeFrequency, InvoiceStatus, Prisma } from '@prisma/client'
import {
  getActiveAcademicYear as getActiveAcademicYearFromSettings,
  getFeeStructures as getFeeStructuresFromSettings,
} from '@/lib/actions/settings'

// ─── Types ───────────────────────────────────────────────────────────────────

export type FeeStructureWithClass = Awaited<ReturnType<typeof getFeeStructuresFromSettings>>[number]
export type InvoiceWithDetails = Awaited<ReturnType<typeof getInvoices>>[number]
export type OutstandingStudent = Awaited<ReturnType<typeof getOutstandingDues>>[number]

// ─── Fee Structures ───────────────────────────────────────────────────────────

export async function getFeeStructures() {
  return getFeeStructuresFromSettings()
}

export async function getActiveAcademicYear() {
  return getActiveAcademicYearFromSettings()
}

export async function createFeeStructure(data: {
  name: string
  amount: number
  classId?: number | null
  frequency: FeeFrequency
  academicYearId: number
}) {
  const structure = await prisma.feeStructure.create({
    data: {
      name: data.name,
      amount: data.amount,
      classId: data.classId ?? null,
      frequency: data.frequency,
      academicYearId: data.academicYearId,
    },
  })
  revalidateTag('fee-structures')
  revalidatePath('/fees/structures')
  return structure
}

export async function updateFeeStructure(
  id: number,
  data: {
    name?: string
    amount?: number
    classId?: number | null
    frequency?: FeeFrequency
  }
) {
  const structure = await prisma.feeStructure.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.classId !== undefined && { classId: data.classId }),
      ...(data.frequency !== undefined && { frequency: data.frequency }),
    },
  })
  revalidateTag('fee-structures')
  revalidatePath('/fees/structures')
  return structure
}

export async function deleteFeeStructure(id: number) {
  await prisma.feeStructure.delete({ where: { id } })
  revalidateTag('fee-structures')
  revalidatePath('/fees/structures')
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function generateInvoices(data: {
  feeStructureId: number
  month: number
  year: number
  classIds: number[]
}) {
  const feeStructure = await prisma.feeStructure.findUnique({
    where: { id: data.feeStructureId },
  })
  if (!feeStructure) throw new Error('Fee structure not found')

  const students = await prisma.student.findMany({
    where: {
      status: 'ACTIVE',
      classId: { in: data.classIds },
    },
  })

  const dueDate = new Date(data.year, data.month - 1, 10)
  let created = 0
  let skipped = 0

  for (const student of students) {
    try {
      await prisma.feeInvoice.create({
        data: {
          studentId: student.id,
          feeStructureId: data.feeStructureId,
          amount: feeStructure.amount,
          dueDate,
          month: data.month,
          year: data.year,
          status: 'PENDING',
        },
      })
      created++
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        skipped++
      } else {
        throw e
      }
    }
  }

  revalidatePath('/fees/invoices')
  return { created, skipped }
}

export async function getInvoices(filters?: {
  month?: number
  year?: number
  classId?: number
  status?: string
}) {
  const where: Prisma.FeeInvoiceWhereInput = {}

  if (filters?.month) where.month = filters.month
  if (filters?.year) where.year = filters.year
  if (filters?.classId) where.student = { classId: filters.classId }
  if (filters?.status && filters.status !== 'ALL') {
    where.status = filters.status as InvoiceStatus
  }

  const invoices = await prisma.feeInvoice.findMany({
    where,
    include: {
      student: { include: { class: true } },
      feeStructure: true,
      payments: { select: { amountPaid: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return invoices.map((inv) => ({
    ...inv,
    totalPaid: inv.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0),
    amountNum: Number(inv.amount),
  }))
}

export async function getInvoiceById(id: number) {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id },
    include: {
      student: { include: { class: true } },
      feeStructure: true,
      payments: true,
    },
  })
  if (!invoice) return null
  return {
    ...invoice,
    totalPaid: invoice.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0),
    amountNum: Number(invoice.amount),
  }
}

export async function recordPayment(data: {
  invoiceId: number
  amountPaid: number
  paidAt: Date
  receivedBy: string
  notes?: string
}) {
  await prisma.feePayment.create({
    data: {
      invoiceId: data.invoiceId,
      amountPaid: data.amountPaid,
      paidAt: data.paidAt,
      receivedBy: data.receivedBy,
      notes: data.notes ?? null,
    },
  })

  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: data.invoiceId },
    include: { payments: { select: { amountPaid: true } } },
  })
  if (!invoice) throw new Error('Invoice not found')

  const totalPaid = invoice.payments.reduce(
    (sum, p) => sum + Number(p.amountPaid),
    0
  )
  const invoiceAmount = Number(invoice.amount)

  let newStatus: InvoiceStatus
  if (totalPaid >= invoiceAmount) {
    newStatus = 'PAID'
  } else if (totalPaid > 0) {
    newStatus = 'PARTIAL'
  } else {
    newStatus = 'PENDING'
  }

  const updated = await prisma.feeInvoice.update({
    where: { id: data.invoiceId },
    data: { status: newStatus },
  })

  revalidatePath('/fees/invoices')
  revalidatePath('/fees/outstanding')
  return updated
}

// ─── Outstanding Dues ─────────────────────────────────────────────────────────

export async function getOutstandingDues(filters?: { classId?: number }) {
  const invoices = await prisma.feeInvoice.findMany({
    where: {
      status: { in: ['PENDING', 'PARTIAL'] },
      ...(filters?.classId
        ? { student: { classId: filters.classId } }
        : {}),
    },
    include: {
      student: { include: { class: true } },
      feeStructure: { select: { name: true } },
      payments: { select: { amountPaid: true } },
    },
    orderBy: { dueDate: 'asc' },
  })

  // Group by student
  const map = new Map<
    number,
    {
      student: (typeof invoices)[number]['student']
      pendingCount: number
      totalOutstanding: number
    }
  >()

  for (const inv of invoices) {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amountPaid), 0)
    const outstanding = Number(inv.amount) - paid

    if (!map.has(inv.studentId)) {
      map.set(inv.studentId, {
        student: inv.student,
        pendingCount: 0,
        totalOutstanding: 0,
      })
    }
    const entry = map.get(inv.studentId)!
    entry.pendingCount++
    entry.totalOutstanding += outstanding
  }

  return Array.from(map.values()).sort(
    (a, b) => b.totalOutstanding - a.totalOutstanding
  )
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getFeeDashboardStats() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const [collected, pendingInvoices] = await Promise.all([
    prisma.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: { paidAt: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.feeInvoice.findMany({
      where: { status: { in: ['PENDING', 'PARTIAL'] } },
      include: { payments: { select: { amountPaid: true } } },
    }),
  ])

  const totalCollectedThisMonth = Number(collected._sum.amountPaid ?? 0)

  const totalPendingDues = pendingInvoices.reduce((acc, inv) => {
    const paid = inv.payments.reduce((s, p) => s + Number(p.amountPaid), 0)
    return acc + Number(inv.amount) - paid
  }, 0)

  return { totalCollectedThisMonth, totalPendingDues }
}

// ─── Fee Collection Report ────────────────────────────────────────────────────

export async function getFeeCollectionReport(filters: { month: number; year: number }) {
  const invoices = await prisma.feeInvoice.findMany({
    where: { month: filters.month, year: filters.year },
    include: {
      payments: { select: { amountPaid: true } },
      student: {
        include: {
          class: { select: { id: true, name: true, section: true } },
        },
      },
    },
  })

  let totalInvoiced = 0
  let totalCollected = 0

  const classMap = new Map<
    number,
    { name: string; section: string; invoiced: number; collected: number }
  >()

  for (const inv of invoices) {
    const amount = Number(inv.amount)
    const paid = inv.payments.reduce((s, p) => s + Number(p.amountPaid), 0)
    totalInvoiced += amount
    totalCollected += paid

    const cls = inv.student.class
    if (!classMap.has(cls.id)) {
      classMap.set(cls.id, { name: cls.name, section: cls.section, invoiced: 0, collected: 0 })
    }
    const entry = classMap.get(cls.id)!
    entry.invoiced += amount
    entry.collected += paid
  }

  const byClass = Array.from(classMap.entries())
    .map(([id, d]) => ({ id, ...d, pending: d.invoiced - d.collected }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    totalInvoiced,
    totalCollected,
    totalPending: totalInvoiced - totalCollected,
    byClass,
  }
}
