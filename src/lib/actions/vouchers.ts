'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { VoucherStatus } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoucherWithDetails = Awaited<ReturnType<typeof getVouchers>>[number]
export type VoucherFull = NonNullable<Awaited<ReturnType<typeof getVoucherById>>>

// ─── Voucher number generator ─────────────────────────────────────────────────

export async function generateVoucherNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.feeVoucher.count()
  let num = count + 1
  let voucherNumber = `VCH-${year}-${String(num).padStart(4, '0')}`

  // Ensure uniqueness
  while (await prisma.feeVoucher.findUnique({ where: { voucherNumber } })) {
    num++
    voucherNumber = `VCH-${year}-${String(num).padStart(4, '0')}`
  }
  return voucherNumber
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getVouchers(filters?: {
  month?: number
  year?: number
  classId?: number
  status?: VoucherStatus
  studentId?: number
}) {
  return prisma.feeVoucher.findMany({
    where: {
      ...(filters?.month ? { month: filters.month } : {}),
      ...(filters?.year ? { year: filters.year } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.studentId ? { studentId: filters.studentId } : {}),
      ...(filters?.classId
        ? { student: { classId: filters.classId } }
        : {}),
    },
    include: {
      student: {
        include: {
          class: { select: { id: true, name: true, section: true } },
        },
      },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getVoucherById(id: number) {
  return prisma.feeVoucher.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          class: { select: { id: true, name: true, section: true } },
        },
      },
      items: { orderBy: { createdAt: 'asc' } },
    },
  }).then(async (v) => {
    if (!v) return null
    const school = await prisma.school.findFirst()
    return { ...v, school }
  })
}

export async function getVouchersByClass(classId: number, month: number, year: number) {
  return prisma.feeVoucher.findMany({
    where: { month, year, student: { classId } },
    include: {
      student: {
        include: {
          class: { select: { id: true, name: true, section: true } },
        },
      },
      items: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { student: { firstName: 'asc' } },
  }).then(async (vouchers) => {
    const school = await prisma.school.findFirst()
    return { vouchers, school }
  })
}

export async function getVoucherDashboardStats(month: number, year: number) {
  const vouchers = await prisma.feeVoucher.findMany({
    where: { month, year },
    select: { status: true, totalAmount: true, paidAmount: true },
  })

  const totalVouchers = vouchers.length
  const paidCount = vouchers.filter((v) => v.status === 'PAID').length
  const partialCount = vouchers.filter((v) => v.status === 'PARTIAL').length
  const unpaidCount = vouchers.filter((v) => v.status === 'UNPAID').length
  const totalAmount = vouchers.reduce((s, v) => s + Number(v.totalAmount), 0)
  const collectedAmount = vouchers.reduce((s, v) => s + Number(v.paidAmount), 0)
  const pendingAmount = totalAmount - collectedAmount

  return { totalVouchers, paidCount, partialCount, unpaidCount, totalAmount, collectedAmount, pendingAmount }
}

// ─── Generate vouchers ────────────────────────────────────────────────────────

export async function generateVouchersForClass(data: {
  classId: number
  month: number
  year: number
  dueDate: Date
  feeStructureIds: number[]
}) {
  const [students, feeStructures] = await Promise.all([
    prisma.student.findMany({
      where: { classId: data.classId, status: 'ACTIVE' },
      select: { id: true },
    }),
    prisma.feeStructure.findMany({
      where: { id: { in: data.feeStructureIds } },
      select: { id: true, name: true, amount: true },
    }),
  ])

  const totalAmount = feeStructures.reduce((s, f) => s + Number(f.amount), 0)
  let created = 0
  let skipped = 0

  for (const student of students) {
    const existing = await prisma.feeVoucher.findUnique({
      where: { studentId_month_year: { studentId: student.id, month: data.month, year: data.year } },
    })
    if (existing) { skipped++; continue }

    const voucherNumber = await generateVoucherNumber()
    await prisma.feeVoucher.create({
      data: {
        voucherNumber,
        studentId: student.id,
        month: data.month,
        year: data.year,
        dueDate: data.dueDate,
        totalAmount,
        items: {
          create: feeStructures.map((f) => ({
            description: f.name,
            amount: f.amount,
          })),
        },
      },
    })
    created++
  }

  revalidatePath('/fees/vouchers')
  return { created, skipped }
}

export async function generateVoucherForStudent(data: {
  studentId: number
  month: number
  year: number
  dueDate: Date
  items: { description: string; amount: number }[]
}) {
  const existing = await prisma.feeVoucher.findUnique({
    where: { studentId_month_year: { studentId: data.studentId, month: data.month, year: data.year } },
  })
  if (existing) throw new Error('A voucher already exists for this student for the selected month/year')

  const totalAmount = data.items.reduce((s, i) => s + i.amount, 0)
  const voucherNumber = await generateVoucherNumber()

  await prisma.feeVoucher.create({
    data: {
      voucherNumber,
      studentId: data.studentId,
      month: data.month,
      year: data.year,
      dueDate: data.dueDate,
      totalAmount,
      items: { create: data.items.map((i) => ({ description: i.description, amount: i.amount })) },
    },
  })

  revalidatePath('/fees/vouchers')
}

// ─── Update vouchers ──────────────────────────────────────────────────────────

export async function markVoucherPaid(data: {
  voucherId: number
  paidAmount: number
  paidDate: Date
  receivedBy: string
  notes?: string
}) {
  const voucher = await prisma.feeVoucher.findUnique({ where: { id: data.voucherId } })
  if (!voucher) throw new Error('Voucher not found')

  const status: VoucherStatus =
    data.paidAmount >= Number(voucher.totalAmount)
      ? 'PAID'
      : data.paidAmount > 0
        ? 'PARTIAL'
        : 'UNPAID'

  await prisma.$transaction(async (tx) => {
    await tx.feeVoucher.update({
      where: { id: data.voucherId },
      data: {
        paidAmount: data.paidAmount,
        paidDate: data.paidDate,
        receivedBy: data.receivedBy,
        notes: data.notes ?? null,
        status,
      },
    })

    const invoices = await tx.feeInvoice.findMany({
      where: {
        studentId: voucher.studentId,
        month: voucher.month,
        year: voucher.year,
        status: { in: ['PENDING', 'PARTIAL'] },
      },
      include: { payments: true },
      orderBy: { id: 'asc' },
    })

    if (invoices.length > 0) {
      let remaining = data.paidAmount
      for (const inv of invoices) {
        if (remaining <= 0) break
        const alreadyPaid = inv.payments.reduce((s, p) => s + Number(p.amountPaid), 0)
        const owed = Number(inv.amount) - alreadyPaid
        const payThis = Math.min(remaining, owed)
        if (payThis <= 0) continue

        await tx.feePayment.create({
          data: {
            invoiceId: inv.id,
            amountPaid: payThis,
            paidAt: data.paidDate,
            receivedBy: data.receivedBy,
            notes: data.notes
              ? `Voucher ${voucher.voucherNumber}: ${data.notes}`
              : `Voucher ${voucher.voucherNumber}`,
          },
        })

        const newTotal = alreadyPaid + payThis
        const invStatus = newTotal >= Number(inv.amount) ? 'PAID' : 'PARTIAL'
        await tx.feeInvoice.update({ where: { id: inv.id }, data: { status: invStatus } })
        remaining -= payThis
      }
    }
  })

  revalidatePath('/fees/vouchers')
  revalidatePath('/fees/invoices')
  revalidatePath('/fees/outstanding')
}

export async function cancelVoucher(id: number) {
  await prisma.feeVoucher.update({ where: { id }, data: { status: 'CANCELLED' } })
  revalidatePath('/fees/vouchers')
}

export async function deleteVoucher(id: number) {
  const voucher = await prisma.feeVoucher.findUnique({ where: { id }, select: { status: true } })
  if (!voucher) throw new Error('Voucher not found')
  if (voucher.status === 'PAID' || voucher.status === 'PARTIAL') {
    throw new Error('Cannot delete a paid voucher')
  }
  await prisma.feeVoucher.delete({ where: { id } })
  revalidatePath('/fees/vouchers')
}
