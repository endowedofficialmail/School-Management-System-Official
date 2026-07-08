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
      paymentHistory: { orderBy: { createdAt: 'asc' } },
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
      paymentHistory: { orderBy: { createdAt: 'asc' } },
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
    select: {
      status: true,
      totalAmount: true,
      paidAmount: true,
      advanceAmount: true,
      remainingAmount: true,
    },
  })

  const totalVouchers = vouchers.length
  const paidCount = vouchers.filter((v) => v.status === 'PAID').length
  const partialCount = vouchers.filter((v) => v.status === 'PARTIAL').length
  const advanceCount = vouchers.filter((v) => v.status === 'ADVANCE').length
  const unpaidCount = vouchers.filter((v) => v.status === 'UNPAID').length
  const totalAmount = vouchers.reduce((s, v) => s + Number(v.totalAmount), 0)
  const collectedAmount = vouchers.reduce((s, v) => s + Number(v.paidAmount), 0)
  const advanceAmount = vouchers.reduce((s, v) => s + Number(v.advanceAmount), 0)
  const pendingAmount = vouchers
    .filter((v) => v.status === 'UNPAID' || v.status === 'PARTIAL')
    .reduce((s, v) => {
      if (v.status === 'PARTIAL') return s + Number(v.remainingAmount)
      return s + Number(v.totalAmount)
    }, 0)

  return {
    totalVouchers,
    paidCount,
    unpaidCount,
    partialCount,
    advanceCount,
    totalAmount,
    collectedAmount,
    pendingAmount,
    advanceAmount,
  }
}

export async function getSchoolGenerationPreview() {
  const [classCount, studentCount] = await Promise.all([
    prisma.class.count({ where: { academicYear: { isActive: true } } }),
    prisma.student.count({
      where: {
        status: 'ACTIVE',
        class: { academicYear: { isActive: true } },
      },
    }),
  ])
  return { classCount, studentCount }
}

export async function getOutstandingVouchers(filters?: { classId?: number }) {
  const vouchers = await prisma.feeVoucher.findMany({
    where: {
      status: { in: ['UNPAID', 'PARTIAL'] },
      ...(filters?.classId ? { student: { classId: filters.classId } } : {}),
    },
    include: {
      student: {
        include: { class: { select: { id: true, name: true, section: true } } },
      },
      paymentHistory: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { dueDate: 'asc' },
  })

  const map = new Map<
    number,
    {
      student: (typeof vouchers)[number]['student']
      pendingCount: number
      totalOutstanding: number
      vouchers: {
        id: number
        voucherNumber: string
        status: VoucherStatus
        totalAmount: number
        paidAmount: number
        remainingAmount: number
        advanceAmount: number
        month: number
        year: number
        paymentHistory: (typeof vouchers)[number]['paymentHistory']
      }[]
    }
  >()

  for (const v of vouchers) {
    const remaining =
      v.status === 'PARTIAL'
        ? Number(v.remainingAmount) || Math.max(0, Number(v.totalAmount) - Number(v.paidAmount))
        : Number(v.totalAmount)

    if (!map.has(v.studentId)) {
      map.set(v.studentId, {
        student: v.student,
        pendingCount: 0,
        totalOutstanding: 0,
        vouchers: [],
      })
    }
    const entry = map.get(v.studentId)!
    entry.pendingCount++
    entry.totalOutstanding += remaining
    entry.vouchers.push({
      id: v.id,
      voucherNumber: v.voucherNumber,
      status: v.status,
      totalAmount: Number(v.totalAmount),
      paidAmount: Number(v.paidAmount),
      remainingAmount: remaining,
      advanceAmount: Number(v.advanceAmount),
      month: v.month,
      year: v.year,
      paymentHistory: v.paymentHistory,
    })
  }

  return Array.from(map.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding)
}

export async function getStudentsWithAdvanceCredit(filters?: { classId?: number }) {
  return prisma.student.findMany({
    where: {
      advanceBalance: { gt: 0 },
      ...(filters?.classId ? { classId: filters.classId } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      registrationNumber: true,
      advanceBalance: true,
      updatedAt: true,
      class: { select: { id: true, name: true, section: true } },
    },
    orderBy: { advanceBalance: 'desc' },
  }).then((rows) =>
    rows.map((s) => ({
      ...s,
      advanceBalance: Number(s.advanceBalance),
    }))
  )
}

export async function getAdvancePaymentCredits(filters?: { classId?: number }) {
  const vouchers = await prisma.feeVoucher.findMany({
    where: {
      status: 'ADVANCE',
      ...(filters?.classId ? { student: { classId: filters.classId } } : {}),
    },
    include: {
      student: {
        include: { class: { select: { id: true, name: true, section: true } } },
      },
    },
    orderBy: { paidDate: 'desc' },
  })

  return vouchers.map((v) => ({
    id: v.id,
    voucherNumber: v.voucherNumber,
    advanceAmount: Number(v.advanceAmount),
    paidAmount: Number(v.paidAmount),
    totalAmount: Number(v.totalAmount),
    month: v.month,
    year: v.year,
    student: v.student,
  }))
}

// ─── Advance balance helpers ──────────────────────────────────────────────────

export async function getStudentAdvanceBalance(studentId: number): Promise<number> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { advanceBalance: true },
  })
  return Number(student?.advanceBalance ?? 0)
}

export async function updateStudentAdvanceBalance(studentId: number, newBalance: number) {
  if (newBalance < 0) throw new Error('Advance balance cannot be negative')
  await prisma.student.update({
    where: { id: studentId },
    data: { advanceBalance: newBalance },
  })
}

export async function recalculateStudentAdvanceBalance(studentId: number) {
  const vouchers = await prisma.feeVoucher.findMany({
    where: { studentId, status: { not: 'CANCELLED' } },
    select: { advanceAmount: true, appliedAdvance: true, status: true },
  })

  const generated = vouchers.reduce((s, v) => s + Number(v.advanceAmount), 0)
  const applied = vouchers.reduce((s, v) => s + Number(v.appliedAdvance), 0)
  const balance = Math.max(0, generated - applied)

  await prisma.student.update({
    where: { id: studentId },
    data: { advanceBalance: balance },
  })
  return balance
}

export async function manuallyAdjustAdvanceBalance(
  studentId: number,
  adjustmentAmount: number,
  reason: string,
  adminId: number,
  adjustedBy: string
) {
  if (!reason.trim()) throw new Error('Reason is required')
  if (adjustmentAmount === 0) throw new Error('Adjustment amount cannot be zero')

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { advanceBalance: true },
  })
  if (!student) throw new Error('Student not found')

  const previousBalance = Number(student.advanceBalance)
  const newBalance = previousBalance + adjustmentAmount
  if (newBalance < 0) {
    throw new Error('Adjustment would result in negative balance')
  }

  await prisma.$transaction(async (tx) => {
    await tx.student.update({
      where: { id: studentId },
      data: { advanceBalance: newBalance },
    })
    await tx.advanceBalanceLog.create({
      data: {
        studentId,
        adjustmentAmount,
        previousBalance,
        newBalance,
        reason: reason.trim(),
        adjustedBy,
        adminId,
      },
    })
  })

  revalidatePath(`/students/${studentId}`)
  revalidatePath('/fees/outstanding')
  revalidatePath('/fees/vouchers')
  return { previousBalance, newBalance }
}

type AdvanceApplyResult = {
  appliedAdvance: number
  finalStatus: VoucherStatus
  paidAmount: number
  remainingAmount: number
  leftoverAdvance: number
  newStudentAdvanceBalance: number
}

function computeAdvanceApplication(originalTotal: number, advanceBalance: number): AdvanceApplyResult {
  if (advanceBalance <= 0) {
    return {
      appliedAdvance: 0,
      finalStatus: 'UNPAID',
      paidAmount: 0,
      remainingAmount: originalTotal,
      leftoverAdvance: 0,
      newStudentAdvanceBalance: 0,
    }
  }

  if (advanceBalance >= originalTotal) {
    const leftover = advanceBalance - originalTotal
    return {
      appliedAdvance: originalTotal,
      finalStatus: leftover > 0 ? 'ADVANCE' : 'PAID',
      paidAmount: originalTotal,
      remainingAmount: 0,
      leftoverAdvance: leftover,
      newStudentAdvanceBalance: leftover,
    }
  }

  return {
    appliedAdvance: advanceBalance,
    finalStatus: 'PARTIAL',
    paidAmount: advanceBalance,
    remainingAmount: originalTotal - advanceBalance,
    leftoverAdvance: 0,
    newStudentAdvanceBalance: 0,
  }
}

async function createVoucherWithAdvance(opts: {
  studentId: number
  month: number
  year: number
  dueDate: Date
  feeItems: { description: string; amount: number }[]
}) {
  const originalTotal = opts.feeItems.reduce((s, i) => s + i.amount, 0)
  const studentRecord = await prisma.student.findUnique({
    where: { id: opts.studentId },
    select: { advanceBalance: true },
  })
  const advanceBalance = Number(studentRecord?.advanceBalance || 0)
  const applied = computeAdvanceApplication(originalTotal, advanceBalance)
  const voucherNumber = await generateVoucherNumber()

  const voucher = await prisma.feeVoucher.create({
    data: {
      voucherNumber,
      studentId: opts.studentId,
      month: opts.month,
      year: opts.year,
      issueDate: new Date(),
      dueDate: opts.dueDate,
      originalAmount: originalTotal,
      totalAmount: originalTotal,
      appliedAdvance: applied.appliedAdvance,
      paidAmount: applied.paidAmount,
      remainingAmount: applied.remainingAmount,
      advanceAmount: applied.leftoverAdvance,
      partialAmount: applied.finalStatus === 'PARTIAL' ? applied.paidAmount : 0,
      status: applied.finalStatus,
      paidDate: applied.appliedAdvance > 0 ? new Date() : null,
      receivedBy: applied.appliedAdvance > 0 ? 'System (Advance Carry-Forward)' : null,
      items: {
        create: opts.feeItems.map((f) => ({
          description: f.description,
          amount: f.amount,
        })),
      },
      ...(applied.appliedAdvance > 0
        ? {
            paymentHistory: {
              create: {
                amountPaid: applied.appliedAdvance,
                paymentDate: new Date(),
                receivedBy: 'System (Advance Carry-Forward)',
                paymentMode: 'Advance Adjustment',
                notes: `Automatically applied from advance balance. Original fee: Rs. ${originalTotal.toLocaleString('en-PK')}`,
              },
            },
          }
        : {}),
    },
  })

  if (advanceBalance > 0) {
    await prisma.student.update({
      where: { id: opts.studentId },
      data: { advanceBalance: applied.newStudentAdvanceBalance },
    })
  }

  return voucher
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

  let created = 0
  let skipped = 0
  let advanceAppliedCount = 0

  for (const student of students) {
    try {
      const existing = await prisma.feeVoucher.findUnique({
        where: { studentId_month_year: { studentId: student.id, month: data.month, year: data.year } },
      })
      if (existing) { skipped++; continue }

      const voucher = await createVoucherWithAdvance({
        studentId: student.id,
        month: data.month,
        year: data.year,
        dueDate: data.dueDate,
        feeItems: feeStructures.map((f) => ({ description: f.name, amount: Number(f.amount) })),
      })
      if (Number(voucher.appliedAdvance) > 0) advanceAppliedCount++
      created++
    } catch {
      skipped++
    }
  }

  revalidatePath('/fees/vouchers')
  revalidatePath('/fees/outstanding')
  return { created, skipped, advanceAppliedCount }
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

  await createVoucherWithAdvance({
    studentId: data.studentId,
    month: data.month,
    year: data.year,
    dueDate: data.dueDate,
    feeItems: data.items,
  })

  revalidatePath('/fees/vouchers')
  revalidatePath(`/students/${data.studentId}`)
}

export async function generateVouchersForSchool(data: {
  month: number
  year: number
  dueDate: Date
  feeStructureIds: number[]
}) {
  const allClasses = await prisma.class.findMany({
    where: { academicYear: { isActive: true } },
    select: { id: true, name: true, section: true },
  })

  let totalCreated = 0
  let totalSkipped = 0
  const classResults: { className: string; created: number; skipped: number }[] = []

  for (const cls of allClasses) {
    const applicableFeeStructures = await prisma.feeStructure.findMany({
      where: {
        id: { in: data.feeStructureIds },
        OR: [{ classId: cls.id }, { classId: null }],
      },
    })

    if (applicableFeeStructures.length === 0) {
      classResults.push({ className: `${cls.name}-${cls.section}`, created: 0, skipped: 0 })
      continue
    }

    const students = await prisma.student.findMany({
      where: { classId: cls.id, status: 'ACTIVE' },
      select: { id: true },
    })

    let classCreated = 0
    let classSkipped = 0

    for (const student of students) {
      try {
        const existing = await prisma.feeVoucher.findUnique({
          where: {
            studentId_month_year: {
              studentId: student.id,
              month: data.month,
              year: data.year,
            },
          },
        })

        if (existing) {
          classSkipped++
          continue
        }

        await createVoucherWithAdvance({
          studentId: student.id,
          month: data.month,
          year: data.year,
          dueDate: data.dueDate,
          feeItems: applicableFeeStructures.map((fs) => ({
            description: fs.name,
            amount: Number(fs.amount),
          })),
        })
        classCreated++
      } catch {
        classSkipped++
      }
    }

    totalCreated += classCreated
    totalSkipped += classSkipped
    classResults.push({
      className: `${cls.name}-${cls.section}`,
      created: classCreated,
      skipped: classSkipped,
    })
  }

  revalidatePath('/fees/vouchers')
  revalidatePath('/fees/outstanding')
  return { totalCreated, totalSkipped, classResults }
}

// ─── Update vouchers ──────────────────────────────────────────────────────────

export async function markVoucherPaid(data: {
  voucherId: number
  amountPaid: number
  paidDate: Date
  receivedBy: string
  paymentMode: string
  referenceNumber?: string
  notes?: string
}) {
  const voucher = await prisma.feeVoucher.findUnique({
    where: { id: data.voucherId },
    include: { paymentHistory: true },
  })

  if (!voucher) throw new Error('Voucher not found')
  if (voucher.status === 'CANCELLED') throw new Error('Cannot record payment on a cancelled voucher')
  if (voucher.status === 'PAID' || voucher.status === 'ADVANCE') {
    throw new Error('This voucher is already fully paid')
  }

  const thisPayment = data.amountPaid
  if (!(thisPayment > 0)) throw new Error('Payment amount must be greater than 0')

  const totalAmount = Number(voucher.totalAmount)
  if (thisPayment > totalAmount * 2) {
    throw new Error('Payment amount is unusually large. Please check and try again.')
  }

  const previouslyPaid = Number(voucher.paidAmount)
  const previousAdvance = Number(voucher.advanceAmount)
  const newTotalPaid = previouslyPaid + thisPayment
  const remaining = Math.max(0, totalAmount - newTotalPaid)
  const newAdvanceGenerated = Math.max(0, newTotalPaid - totalAmount)
  const advanceDelta = Math.max(0, newAdvanceGenerated - previousAdvance)

  let status: VoucherStatus
  if (newTotalPaid >= totalAmount) {
    status = newAdvanceGenerated > 0 ? 'ADVANCE' : 'PAID'
  } else {
    status = 'PARTIAL'
  }

  const paymentNotes = data.referenceNumber
    ? `Ref: ${data.referenceNumber}${data.notes ? ` — ${data.notes}` : ''}`
    : (data.notes || null)

  await prisma.$transaction(async (tx) => {
    await tx.feeVoucher.update({
      where: { id: data.voucherId },
      data: {
        paidAmount: newTotalPaid,
        paidDate: data.paidDate,
        receivedBy: data.receivedBy,
        status,
        advanceAmount: newAdvanceGenerated,
        remainingAmount: remaining,
        partialAmount: newTotalPaid < totalAmount ? newTotalPaid : 0,
        notes: data.notes ?? null,
        originalAmount: Number(voucher.originalAmount) > 0
          ? voucher.originalAmount
          : totalAmount,
      },
    })

    await tx.feeVoucherPayment.create({
      data: {
        voucherId: data.voucherId,
        amountPaid: thisPayment,
        paymentDate: data.paidDate,
        receivedBy: data.receivedBy,
        paymentMode: data.paymentMode || 'Cash',
        notes: paymentNotes,
      },
    })

    if (data.paymentMode === 'Advance Adjustment') {
      const student = await tx.student.findUnique({
        where: { id: voucher.studentId },
        select: { advanceBalance: true },
      })
      const currentBalance = Number(student?.advanceBalance || 0)
      if (thisPayment > currentBalance + 0.001) {
        throw new Error('Insufficient advance credit balance')
      }
      await tx.student.update({
        where: { id: voucher.studentId },
        data: { advanceBalance: Math.max(0, currentBalance - thisPayment) },
      })
      await tx.feeVoucher.update({
        where: { id: data.voucherId },
        data: {
          appliedAdvance: { increment: thisPayment },
          // If somehow still leftover after covering voucher, keep as voucher advanceAmount
          advanceAmount: newAdvanceGenerated,
        },
      })
    } else if (advanceDelta > 0) {
      const student = await tx.student.findUnique({
        where: { id: voucher.studentId },
        select: { advanceBalance: true },
      })
      const currentBalance = Number(student?.advanceBalance || 0)
      await tx.student.update({
        where: { id: voucher.studentId },
        data: { advanceBalance: currentBalance + advanceDelta },
      })
    }

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
      let rem = thisPayment
      for (const inv of invoices) {
        if (rem <= 0) break
        const alreadyPaid = inv.payments.reduce((s, p) => s + Number(p.amountPaid), 0)
        const owed = Number(inv.amount) - alreadyPaid
        const payThis = Math.min(rem, owed)
        if (payThis <= 0) continue

        await tx.feePayment.create({
          data: {
            invoiceId: inv.id,
            amountPaid: payThis,
            paidAt: data.paidDate,
            receivedBy: data.receivedBy,
            notes: paymentNotes
              ? `Voucher ${voucher.voucherNumber}: ${paymentNotes}`
              : `Voucher ${voucher.voucherNumber}`,
          },
        })

        const newTotal = alreadyPaid + payThis
        let invStatus: 'PAID' | 'PARTIAL' | 'ADVANCE' = 'PARTIAL'
        if (newTotal > Number(inv.amount)) invStatus = 'ADVANCE'
        else if (newTotal >= Number(inv.amount)) invStatus = 'PAID'
        await tx.feeInvoice.update({ where: { id: inv.id }, data: { status: invStatus } })
        rem -= payThis
      }
    }
  })

  revalidatePath('/fees/vouchers')
  revalidatePath('/fees/invoices')
  revalidatePath('/fees/outstanding')
  revalidatePath(`/students/${voucher.studentId}`)

  return {
    status,
    remaining,
    advance: newAdvanceGenerated,
    newTotalPaid,
    message: newAdvanceGenerated > 0
      ? `Rs. ${newAdvanceGenerated.toLocaleString('en-PK')} advance credit added to student account`
      : status === 'PARTIAL'
        ? `Rs. ${remaining.toLocaleString('en-PK')} remaining balance`
        : 'Payment complete',
  }
}

export async function resetVoucherPayment(voucherId: number) {
  const voucher = await prisma.feeVoucher.findUnique({ where: { id: voucherId } })
  if (!voucher) throw new Error('Voucher not found')
  if (voucher.status !== 'PARTIAL') {
    throw new Error('Only partial payments can be reset')
  }
  if (Number(voucher.appliedAdvance) > 0) {
    throw new Error('Cannot reset a voucher that has advance credit applied. Contact admin.')
  }

  // Restore any advance credit that was created on this voucher (should be 0 for PARTIAL)
  const advanceOnVoucher = Number(voucher.advanceAmount)

  const updated = await prisma.$transaction(async (tx) => {
    await tx.feeVoucherPayment.deleteMany({ where: { voucherId } })
    if (advanceOnVoucher > 0) {
      const student = await tx.student.findUnique({
        where: { id: voucher.studentId },
        select: { advanceBalance: true },
      })
      const bal = Math.max(0, Number(student?.advanceBalance || 0) - advanceOnVoucher)
      await tx.student.update({
        where: { id: voucher.studentId },
        data: { advanceBalance: bal },
      })
    }
    return tx.feeVoucher.update({
      where: { id: voucherId },
      data: {
        paidAmount: 0,
        status: 'UNPAID',
        paidDate: null,
        receivedBy: null,
        advanceAmount: 0,
        remainingAmount: Number(voucher.totalAmount),
        partialAmount: 0,
        notes: null,
      },
    })
  })

  revalidatePath('/fees/vouchers')
  revalidatePath('/fees/outstanding')
  revalidatePath(`/students/${voucher.studentId}`)
  return updated
}

export async function cancelVoucher(id: number) {
  await prisma.feeVoucher.update({ where: { id }, data: { status: 'CANCELLED' } })
  revalidatePath('/fees/vouchers')
}

export async function deleteVoucher(id: number) {
  const voucher = await prisma.feeVoucher.findUnique({ where: { id }, select: { status: true } })
  if (!voucher) throw new Error('Voucher not found')
  if (voucher.status === 'PAID' || voucher.status === 'PARTIAL' || voucher.status === 'ADVANCE') {
    throw new Error('Cannot delete a paid voucher')
  }
  await prisma.feeVoucher.delete({ where: { id } })
  revalidatePath('/fees/vouchers')
}

