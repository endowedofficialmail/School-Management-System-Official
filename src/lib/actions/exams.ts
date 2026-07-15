'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { calculateGrade } from '@/lib/grade'
import {
  getAcademicYears as getAcademicYearsFromSettings,
  getActiveAcademicYear as getActiveAcademicYearFromSettings,
} from '@/lib/actions/settings'

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExamWithDetails = Awaited<ReturnType<typeof getExams>>[number]
export type SubjectWithTeacher = Awaited<ReturnType<typeof getSubjectsByClass>>[number]
export type ResultRow = Awaited<ReturnType<typeof getResultsForExamAndSubject>>[number]
export type ClassSummaryData = NonNullable<Awaited<ReturnType<typeof getClassResultSummary>>>
export type SubjectAnalysisData = NonNullable<Awaited<ReturnType<typeof getSubjectWiseResult>>>
export type StudentFullResult = NonNullable<Awaited<ReturnType<typeof getStudentFullResult>>>
export type StudentResultHistoryItem = Awaited<ReturnType<typeof getStudentResultHistory>>[number]

// ─── Academic Years ──────────────────────────────────────────────────────────

export async function getAcademicYears() {
  return getAcademicYearsFromSettings()
}

export async function getActiveAcademicYear() {
  return getActiveAcademicYearFromSettings()
}

// ─── Teachers ────────────────────────────────────────────────────────────────

export async function getTeachers() {
  return prisma.user.findMany({
    where: { role: 'TEACHER', isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })
}

// ─── Subjects ────────────────────────────────────────────────────────────────

export async function getSubjects() {
  return prisma.subject.findMany({
    include: {
      class: { select: { id: true, name: true, section: true } },
      teacher: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getSubjectsByClass(classId: number) {
  return prisma.subject.findMany({
    where: { classId },
    include: { teacher: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function createSubject(data: { name: string; classId: number; teacherId?: number | null }) {
  await prisma.subject.create({ data })
  revalidatePath('/teachers/subjects')
}

export async function deleteSubject(id: number) {
  await prisma.result.deleteMany({ where: { subjectId: id } })
  await prisma.subject.delete({ where: { id } })
  revalidatePath('/teachers/subjects')
  revalidatePath('/exams')
}

// ─── Exams ────────────────────────────────────────────────────────────────────

export async function getExamClassIds(examId: number): Promise<number[]> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { examClasses: { select: { classId: true } } },
  })
  if (!exam) return []
  if (exam.examClasses.length > 0) return exam.examClasses.map((ec) => ec.classId)
  if (exam.classId) return [exam.classId]
  return []
}

export async function getExams(filters?: { classId?: number; academicYearId?: number }) {
  return prisma.exam.findMany({
    where: {
      ...(filters?.classId
        ? {
            OR: [
              { classId: filters.classId },
              { examClasses: { some: { classId: filters.classId } } },
            ],
          }
        : {}),
      ...(filters?.academicYearId ? { academicYearId: filters.academicYearId } : {}),
    },
    include: {
      class: true,
      academicYear: true,
      examClasses: { include: { class: true } },
      _count: { select: { datesheetEntries: true, rollNumberSlips: true } },
    },
    orderBy: { startDate: 'desc' },
  })
}

export async function getExamById(id: number) {
  return prisma.exam.findUnique({
    where: { id },
    include: {
      class: true,
      academicYear: true,
      examClasses: { include: { class: true } },
    },
  })
}

export async function getExamClasses(examId: number) {
  return prisma.examClass.findMany({
    where: { examId },
    include: { class: { select: { id: true, name: true, section: true } } },
    orderBy: [{ class: { name: 'asc' } }, { class: { section: 'asc' } }],
  })
}

export async function createExam(data: {
  name: string
  classIds: number[]
  academicYearId: number
  startDate: Date
  endDate: Date
}) {
  const exam = await prisma.exam.create({
    data: {
      name: data.name,
      classId: data.classIds[0] || null,
      academicYearId: data.academicYearId,
      startDate: data.startDate,
      endDate: data.endDate,
    },
  })

  if (data.classIds.length > 0) {
    await prisma.examClass.createMany({
      data: data.classIds.map((classId) => ({
        examId: exam.id,
        classId,
      })),
    })
  }

  revalidatePath('/exams')
  return exam
}

export async function updateExam(
  id: number,
  data: {
    name?: string
    classIds?: number[]
    startDate?: Date
    endDate?: Date
  }
) {
  const updateData: {
    name?: string
    classId?: number | null
    startDate?: Date
    endDate?: Date
  } = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.startDate !== undefined) updateData.startDate = data.startDate
  if (data.endDate !== undefined) updateData.endDate = data.endDate
  if (data.classIds !== undefined) {
    updateData.classId = data.classIds[0] || null
    await prisma.examClass.deleteMany({ where: { examId: id } })
    if (data.classIds.length > 0) {
      await prisma.examClass.createMany({
        data: data.classIds.map((classId) => ({
          examId: id,
          classId,
        })),
      })
    }
  }

  const exam = await prisma.exam.update({ where: { id }, data: updateData })
  revalidatePath('/exams')
  return exam
}

export async function deleteExam(id: number) {
  await prisma.result.deleteMany({ where: { examId: id } })
  await prisma.examPerformance.deleteMany({ where: { examId: id } })
  await prisma.rollNumberSlip.deleteMany({ where: { examId: id } })
  await prisma.examClass.deleteMany({ where: { examId: id } })
  await prisma.datesheetEntry.deleteMany({ where: { examId: id } })
  await prisma.exam.delete({ where: { id } })
  revalidatePath('/exams')
}

// ─── Results — Read ───────────────────────────────────────────────────────────

export async function getResultsForExamAndSubject(examId: number, subjectId: number) {
  const classIds = await getExamClassIds(examId)
  if (classIds.length === 0) return []

  const [students, existing] = await Promise.all([
    prisma.student.findMany({
      where: { classId: { in: classIds }, status: 'ACTIVE' },
      orderBy: { firstName: 'asc' },
    }),
    prisma.result.findMany({ where: { examId, subjectId } }),
  ])

  const resultMap = new Map(
    existing.map((r) => [
      r.studentId,
      {
        marksObtained: Number(r.marksObtained),
        totalMarks: Number(r.totalMarks),
        grade: r.grade,
        remarks: r.remarks ?? '',
      },
    ])
  )

  return students.map((s) => {
    const saved = resultMap.get(s.id) ?? null
    return {
      student: s,
      marksObtained: saved?.marksObtained ?? null,
      totalMarks: saved?.totalMarks ?? null,
      grade: saved?.grade ?? null,
      remarks: saved?.remarks ?? '',
    }
  })
}

// ─── Results — Write (with ExamPerformance recalculation) ─────────────────────

export async function saveResults(data: {
  examId: number
  subjectId: number
  results: { studentId: number; marksObtained: number; totalMarks: number; remarks?: string }[]
}) {
  for (const r of data.results) {
    const grade = calculateGrade(r.marksObtained, r.totalMarks)
    await prisma.result.upsert({
      where: { examId_studentId_subjectId: { examId: data.examId, studentId: r.studentId, subjectId: data.subjectId } },
      update: { marksObtained: r.marksObtained, totalMarks: r.totalMarks, grade, remarks: r.remarks ?? null },
      create: {
        examId: data.examId,
        studentId: r.studentId,
        subjectId: data.subjectId,
        marksObtained: r.marksObtained,
        totalMarks: r.totalMarks,
        grade,
        remarks: r.remarks ?? null,
      },
    })
  }

  // Recalculate ExamPerformance for all students in the class
  await recalcExamPerformance(data.examId)

  revalidatePath('/exams')
  revalidatePath('/results')
  return data.results.length
}

// ─── ExamPerformance Recalculation ────────────────────────────────────────────

async function recalcExamPerformance(examId: number) {
  const classIds = await getExamClassIds(examId)
  if (classIds.length === 0) return

  const [students, allResults] = await Promise.all([
    prisma.student.findMany({
      where: { classId: { in: classIds }, status: 'ACTIVE' },
      select: { id: true },
    }),
    prisma.result.findMany({ where: { examId } }),
  ])

  // Build totals per student
  const totals = new Map<number, { obtained: number; possible: number }>(
    students.map((s) => [s.id, { obtained: 0, possible: 0 }])
  )
  allResults.forEach((r) => {
    const t = totals.get(r.studentId)
    if (t) { t.obtained += Number(r.marksObtained); t.possible += Number(r.totalMarks) }
  })

  // Sort by percentage to assign ranks
  const ranked = Array.from(totals.entries())
    .filter(([, d]) => d.possible > 0)
    .map(([id, d]) => ({ id, pct: (d.obtained / d.possible) * 100 }))
    .sort((a, b) => b.pct - a.pct)
  const rankMap = new Map(ranked.map((r, i) => [r.id, i + 1]))

  // Upsert ExamPerformance for each student
  for (const entry of Array.from(totals.entries())) {
    const [studentId, t] = entry
    if (t.possible === 0) continue
    const pct = (t.obtained / t.possible) * 100
    const grade = calculateGrade(t.obtained, t.possible)
    await prisma.examPerformance.upsert({
      where: { examId_studentId: { examId, studentId } },
      create: {
        examId,
        studentId,
        totalMarksObtained: t.obtained,
        totalPossibleMarks: t.possible,
        percentage: Math.round(pct * 100) / 100,
        grade,
        rank: rankMap.get(studentId) ?? null,
        isPassed: pct >= 40,
      },
      update: {
        totalMarksObtained: t.obtained,
        totalPossibleMarks: t.possible,
        percentage: Math.round(pct * 100) / 100,
        grade,
        rank: rankMap.get(studentId) ?? null,
        isPassed: pct >= 40,
      },
    })
  }
}

// ─── Class Result Summary ─────────────────────────────────────────────────────

export async function getClassResultSummary(examId: number) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: {
      class: { include: { subjects: true } },
      academicYear: true,
      examClasses: { include: { class: true } },
    },
  })
  if (!exam) return null

  const [performances, allResults] = await Promise.all([
    prisma.examPerformance.findMany({
      where: { examId },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true, registrationNumber: true },
        },
      },
      orderBy: { rank: 'asc' },
    }),
    prisma.result.findMany({
      where: { examId },
      include: { subject: { select: { id: true, name: true } } },
    }),
  ])

  // Subject-wise averages
  const subjectMap = new Map<number, { name: string; obtained: number[]; possible: number[] }>()
  allResults.forEach((r) => {
    if (!subjectMap.has(r.subjectId)) {
      subjectMap.set(r.subjectId, { name: r.subject.name, obtained: [], possible: [] })
    }
    const s = subjectMap.get(r.subjectId)!
    s.obtained.push(Number(r.marksObtained))
    s.possible.push(Number(r.totalMarks))
  })

  const subjectAverages = Array.from(subjectMap.entries()).map(([subjectId, s]) => {
    const avgObtained = s.obtained.reduce((a, b) => a + b, 0) / s.obtained.length
    const avgTotal = s.possible.reduce((a, b) => a + b, 0) / s.possible.length
    return {
      subjectId,
      name: s.name,
      avgObtained: Math.round(avgObtained * 10) / 10,
      avgTotal: Math.round(avgTotal * 10) / 10,
      avgPct: avgTotal > 0 ? Math.round((avgObtained / avgTotal) * 1000) / 10 : 0,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  const passCount = performances.filter((p) => p.isPassed).length
  const failCount = performances.filter((p) => !p.isPassed).length
  const classAvg = performances.length > 0
    ? Math.round(performances.reduce((s, p) => s + Number(p.percentage), 0) / performances.length * 10) / 10
    : 0

  return {
    exam,
    performances,
    subjectAverages,
    classAverage: classAvg,
    passCount,
    failCount,
    totalStudents: performances.length,
  }
}

// ─── Student Full Result (for result card) ────────────────────────────────────

export async function getStudentFullResult(examId: number, studentId: number) {
  const [exam, student, results, school] = await Promise.all([
    prisma.exam.findUnique({
      where: { id: examId },
      include: { class: true, academicYear: true, examClasses: { include: { class: true } } },
    }),
    prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    }),
    prisma.result.findMany({
      where: { examId, studentId },
      include: { subject: true },
      orderBy: { subject: { name: 'asc' } },
    }),
    prisma.school.findFirst(),
  ])

  if (!exam || !student) return null

  const displayClass = student.class ?? exam.class

  // Get or calculate performance
  const performance = await prisma.examPerformance.findUnique({
    where: { examId_studentId: { examId, studentId } },
  })

  const totalObtained = results.reduce((s, r) => s + Number(r.marksObtained), 0)
  const totalPossible = results.reduce((s, r) => s + Number(r.totalMarks), 0)

  const classLabel = displayClass
    ? `${displayClass.name} – ${displayClass.section}`
    : '—'

  if (!performance && totalPossible > 0) {
    const pct = (totalObtained / totalPossible) * 100
    const grade = calculateGrade(totalObtained, totalPossible)
    // Calculate rank on the fly
    const allPerf = await prisma.examPerformance.findMany({ where: { examId }, orderBy: { percentage: 'desc' } })
    const totalRanked = allPerf.length + 1
    const rank = allPerf.filter((p) => Number(p.percentage) > pct).length + 1
    return {
      exam, student, school, classLabel, results: results.map((r) => ({
        subject: r.subject, marksObtained: Number(r.marksObtained),
        totalMarks: Number(r.totalMarks),
        grade: r.grade ?? calculateGrade(Number(r.marksObtained), Number(r.totalMarks)),
        remarks: r.remarks ?? null,
      })),
      totalObtained, totalPossible,
      percentage: Math.round(pct * 10) / 10,
      overallGrade: grade,
      passed: pct >= 40, rank, totalRanked,
      subjectsPassed: results.filter((r) => Number(r.marksObtained) / Number(r.totalMarks) >= 0.4).length,
      subjectsFailed: results.filter((r) => Number(r.marksObtained) / Number(r.totalMarks) < 0.4).length,
    }
  }

  const pct = performance ? Number(performance.percentage) : 0
  const allPerf = await prisma.examPerformance.findMany({ where: { examId } })
  const totalRanked = allPerf.length
  const perfRank = performance?.rank ?? null
  const perfGrade = performance?.grade ?? 'N/A'
  const perfPassed = performance?.isPassed ?? false

  return {
    exam, student, school, classLabel,
    results: results.map((r) => ({
      subject: r.subject,
      marksObtained: Number(r.marksObtained),
      totalMarks: Number(r.totalMarks),
      grade: r.grade ?? calculateGrade(Number(r.marksObtained), Number(r.totalMarks)),
      remarks: r.remarks ?? null,
    })),
    totalObtained,
    totalPossible,
    percentage: pct,
    overallGrade: perfGrade,
    passed: perfPassed,
    rank: perfRank,
    totalRanked,
    subjectsPassed: results.filter((r) => Number(r.marksObtained) / Number(r.totalMarks) >= 0.4).length,
    subjectsFailed: results.filter((r) => Number(r.marksObtained) / Number(r.totalMarks) < 0.4).length,
  }
}

// ─── Student Result History ───────────────────────────────────────────────────

export async function getStudentResultHistory(studentId: number) {
  const perfs = await prisma.examPerformance.findMany({
    where: { studentId },
    include: {
      exam: {
        include: {
          class: true,
          academicYear: true,
          examClasses: { include: { class: true } },
        },
      },
    },
    orderBy: { exam: { startDate: 'desc' } },
  })
  return perfs.map((p) => {
    const classes = p.exam.examClasses.length > 0
      ? p.exam.examClasses.map((ec) => ec.class)
      : p.exam.class
        ? [p.exam.class]
        : []
    const className = classes.length > 0
      ? `${classes[0].name} – ${classes[0].section}`
      : '—'
    return {
      id: p.id,
      examId: p.examId,
      examName: p.exam.name,
      className,
      academicYear: p.exam.academicYear.name,
      percentage: Number(p.percentage),
      grade: p.grade,
      rank: p.rank,
      isPassed: p.isPassed,
    }
  })
}

// ─── Subject-wise Analysis ────────────────────────────────────────────────────

export async function getSubjectWiseResult(examId: number, subjectId: number) {
  const [subject, results] = await Promise.all([
    prisma.subject.findUnique({ where: { id: subjectId } }),
    prisma.result.findMany({
      where: { examId, subjectId },
      include: { student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } } },
      orderBy: { marksObtained: 'desc' },
    }),
  ])
  if (!subject || results.length === 0) return null

  const rows = results.map((r) => {
    const obtained = Number(r.marksObtained)
    const total = Number(r.totalMarks)
    const pct = total > 0 ? Math.round((obtained / total) * 1000) / 10 : 0
    return {
      studentId: r.studentId,
      name: `${r.student.firstName} ${r.student.lastName}`,
      registrationNumber: r.student.registrationNumber,
      marksObtained: obtained,
      totalMarks: total,
      percentage: pct,
      grade: r.grade ?? calculateGrade(obtained, total),
      passed: pct >= 40,
    }
  })

  const totalObtained = rows.reduce((s, r) => s + r.marksObtained, 0)
  const totalPossible = rows.reduce((s, r) => s + r.totalMarks, 0)
  const average = rows.length > 0 ? Math.round((totalObtained / totalPossible) * 1000) / 10 : 0

  return {
    subject,
    results: rows,
    topper: rows[0] ?? null,
    average,
    passCount: rows.filter((r) => r.passed).length,
    failCount: rows.filter((r) => !r.passed).length,
  }
}

// ─── Legacy: Student Result Card (kept for backward compat) ──────────────────

export async function getStudentResultCard(examId: number, studentId: number) {
  return getStudentFullResult(examId, studentId)
}

// ─── Exam Summary Report (reports page) ──────────────────────────────────────

export async function getExamSummaryReport(examId: number) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { class: true, academicYear: true, examClasses: { include: { class: true } } },
  })
  if (!exam) return null

  const classIds = exam.examClasses.length > 0
    ? exam.examClasses.map((ec) => ec.classId)
    : exam.classId
      ? [exam.classId]
      : []

  const [students, results, school] = await Promise.all([
    prisma.student.findMany({
      where: { classId: { in: classIds }, status: 'ACTIVE' },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.result.findMany({ where: { examId } }),
    prisma.school.findFirst({ select: { name: true } }),
  ])

  const studentTotals = new Map<number, { obtained: number; possible: number }>()
  students.forEach((s) => studentTotals.set(s.id, { obtained: 0, possible: 0 }))
  results.forEach((r) => {
    const t = studentTotals.get(r.studentId)
    if (t) { t.obtained += Number(r.marksObtained); t.possible += Number(r.totalMarks) }
  })

  const studentStats = students.map((s) => {
    const t = studentTotals.get(s.id)!
    const percentage = t.possible > 0 ? Math.round((t.obtained / t.possible) * 1000) / 10 : null
    const passed = percentage !== null && percentage >= 40
    const grade = t.possible > 0 ? calculateGrade(t.obtained, t.possible) : null
    return {
      id: s.id, name: `${s.firstName} ${s.lastName}`,
      registrationNumber: s.registrationNumber,
      obtained: t.obtained, possible: t.possible, percentage, grade, passed,
    }
  }).sort((a, b) => (b.percentage ?? -1) - (a.percentage ?? -1))

  const ranked = studentStats.filter((s) => s.percentage !== null)
  const avgPct = ranked.length > 0
    ? Math.round(ranked.reduce((s, r) => s + (r.percentage ?? 0), 0) / ranked.length * 10) / 10
    : null

  return {
    exam, school, students: studentStats,
    summary: {
      avgPct, passCount: studentStats.filter((s) => s.passed).length,
      failCount: studentStats.filter((s) => s.percentage !== null && !s.passed).length,
      highest: ranked[0] ?? null, lowest: ranked[ranked.length - 1] ?? null,
      totalStudents: students.length,
    },
  }
}
