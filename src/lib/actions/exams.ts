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
export type StudentFullResult = NonNullable<Awaited<ReturnType<typeof getStudentFullResult>>>
export type StudentResultHistoryItem = Awaited<ReturnType<typeof getStudentResultHistory>>[number]
export type AwardListData = NonNullable<Awaited<ReturnType<typeof getAwardList>>>
export type AwardListRow = AwardListData['rows'][number]
export type ClassResultData = NonNullable<Awaited<ReturnType<typeof getClassResult>>>
export type ClassResultRow = ClassResultData['rows'][number]
export type AwardListSummaryItem = Awaited<ReturnType<typeof getAwardListSummary>>[number]

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

// ─── Award List — the single data entry point ─────────────────────────────────

export async function getAwardList(examId: number, subjectId: number, classId: number) {
  const [subject, students, results] = await Promise.all([
    prisma.subject.findUnique({ where: { id: subjectId } }),
    prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.result.findMany({ where: { examId, subjectId } }),
  ])
  if (!subject) return null

  const resultMap = new Map(results.map((r) => [r.studentId, r]))

  const rows = students.map((s) => {
    const r = resultMap.get(s.id)
    return {
      student: s,
      theoryMarks: r?.theoryMarks !== null && r?.theoryMarks !== undefined ? Number(r.theoryMarks) : null,
      practicalMarks: r?.practicalMarks !== null && r?.practicalMarks !== undefined ? Number(r.practicalMarks) : null,
      marksObtained: r ? Number(r.marksObtained) : null,
      totalMarks: r ? Number(r.totalMarks) : null,
      grade: r?.grade ?? null,
      isAbsent: r?.isAbsent ?? false,
      isWithheld: r?.isWithheld ?? false,
      remarks: r?.remarks ?? '',
    }
  })

  const enteredCount = rows.filter((r) => r.marksObtained !== null || r.isAbsent || r.isWithheld).length
  const scoredRows = rows.filter((r) => r.marksObtained !== null && !r.isAbsent && !r.isWithheld && r.totalMarks)
  const totalMarksHint = rows.find((r) => r.totalMarks !== null)?.totalMarks ?? null

  const topper = scoredRows.length > 0
    ? scoredRows.reduce((best, r) => (r.marksObtained! > best.marksObtained! ? r : best))
    : null
  const average = scoredRows.length > 0
    ? Math.round((scoredRows.reduce((sum, r) => sum + r.marksObtained!, 0) / scoredRows.length) * 10) / 10
    : 0
  const passCount = scoredRows.filter((r) => (r.marksObtained! / r.totalMarks!) * 100 >= 40).length
  const failCount = scoredRows.length - passCount

  return {
    subject,
    rows,
    totalStudents: students.length,
    enteredCount,
    totalMarksHint,
    topper,
    average,
    passCount,
    failCount,
  }
}

export async function getAwardListSummary(examId: number, classId: number) {
  const [subjects, totalStudents] = await Promise.all([
    getSubjectsByClass(classId),
    prisma.student.count({ where: { classId, status: 'ACTIVE' } }),
  ])
  if (subjects.length === 0) return []

  const counts = await prisma.result.groupBy({
    by: ['subjectId'],
    where: { examId, subjectId: { in: subjects.map((s) => s.id) } },
    _count: { _all: true },
  })
  const countMap = new Map(counts.map((c) => [c.subjectId, c._count._all]))

  return subjects.map((s) => {
    const entries = countMap.get(s.id) ?? 0
    const status: 'complete' | 'partial' | 'none' =
      entries === 0 ? 'none' : entries >= totalStudents ? 'complete' : 'partial'
    return { subjectId: s.id, subjectName: s.name, entries, totalStudents, status }
  })
}

// ─── Results — Write (Award List is the single entry point) ───────────────────

export async function saveResults(data: {
  examId: number
  subjectId: number
  results: {
    studentId: number
    marksObtained: number
    totalMarks: number
    theoryMarks?: number
    practicalMarks?: number
    isAbsent?: boolean
    isWithheld?: boolean
    remarks?: string
  }[]
}) {
  for (const result of data.results) {
    const grade = result.isAbsent
      ? 'ABS'
      : result.isWithheld
        ? 'W/H'
        : calculateGrade(result.marksObtained, result.totalMarks)

    await prisma.result.upsert({
      where: {
        examId_studentId_subjectId: {
          examId: data.examId,
          studentId: result.studentId,
          subjectId: data.subjectId,
        },
      },
      update: {
        marksObtained: result.marksObtained,
        totalMarks: result.totalMarks,
        theoryMarks: result.theoryMarks,
        practicalMarks: result.practicalMarks,
        isAbsent: result.isAbsent || false,
        isWithheld: result.isWithheld || false,
        grade,
        remarks: result.remarks,
      },
      create: {
        examId: data.examId,
        studentId: result.studentId,
        subjectId: data.subjectId,
        marksObtained: result.marksObtained,
        totalMarks: result.totalMarks,
        theoryMarks: result.theoryMarks,
        practicalMarks: result.practicalMarks,
        isAbsent: result.isAbsent || false,
        isWithheld: result.isWithheld || false,
        grade,
        remarks: result.remarks,
      },
    })
  }

  // Auto-calculate Class Result + DMC data for every student in the exam
  await recalculateExamPerformance(data.examId)

  revalidatePath('/exams')
  revalidatePath('/results')
  return data.results.length
}

// ─── ExamPerformance Recalculation — everything flows from here ───────────────

async function recalculateExamPerformance(examId: number) {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { examClasses: true },
  })
  if (!exam) return

  const classIds = exam.examClasses.length > 0
    ? exam.examClasses.map((ec) => ec.classId)
    : exam.classId
      ? [exam.classId]
      : []
  if (classIds.length === 0) return

  const students = await prisma.student.findMany({
    where: { classId: { in: classIds }, status: 'ACTIVE' },
    select: { id: true },
  })
  if (students.length === 0) return

  const allResults = await prisma.result.findMany({
    where: { examId, studentId: { in: students.map((s) => s.id) } },
  })

  const resultsByStudent = new Map<number, typeof allResults>()
  allResults.forEach((r) => {
    if (!resultsByStudent.has(r.studentId)) resultsByStudent.set(r.studentId, [])
    resultsByStudent.get(r.studentId)!.push(r)
  })

  type Perf = {
    studentId: number
    totalObtained: number
    totalPossible: number
    percentage: number
    subjectsPassed: number
    subjectsFailed: number
    totalSubjects: number
    hasAbsent: boolean
    resultStatus: string
    grade: string
    isPassed: boolean
    rank: number
  }

  const performances: Omit<Perf, 'rank'>[] = []

  for (const student of students) {
    const results = resultsByStudent.get(student.id) ?? []
    if (results.length === 0) continue

    const totalObtained = results
      .filter((r) => !r.isAbsent && !r.isWithheld)
      .reduce((sum, r) => sum + Number(r.marksObtained), 0)

    const totalPossible = results.reduce((sum, r) => sum + Number(r.totalMarks), 0)

    const percentage = totalPossible > 0
      ? Number(((totalObtained / totalPossible) * 100).toFixed(2))
      : 0

    const subjectsPassed = results.filter((r) =>
      !r.isAbsent && !r.isWithheld && Number(r.totalMarks) > 0 &&
      (Number(r.marksObtained) / Number(r.totalMarks)) * 100 >= 40
    ).length

    const subjectsFailed = results.filter((r) =>
      !r.isAbsent && !r.isWithheld && Number(r.totalMarks) > 0 &&
      (Number(r.marksObtained) / Number(r.totalMarks)) * 100 < 40
    ).length

    const hasAbsent = results.some((r) => r.isAbsent)
    const hasWithheld = results.some((r) => r.isWithheld)

    let resultStatus = 'Pass'
    if (hasWithheld) resultStatus = 'Withheld'
    else if (hasAbsent) resultStatus = 'Absent'
    else if (subjectsFailed > 0) resultStatus = 'Fail'

    const grade = calculateGrade(totalObtained, totalPossible)

    performances.push({
      studentId: student.id,
      totalObtained,
      totalPossible,
      percentage,
      subjectsPassed,
      subjectsFailed,
      totalSubjects: results.length,
      hasAbsent,
      resultStatus,
      grade,
      isPassed: resultStatus === 'Pass',
    })
  }

  // Sort by percentage descending to assign ranks (ties share the same rank)
  performances.sort((a, b) => b.percentage - a.percentage)
  const ranked: Perf[] = []
  let rank = 1
  for (let i = 0; i < performances.length; i++) {
    if (i > 0 && performances[i].percentage < performances[i - 1].percentage) {
      rank = i + 1
    }
    ranked.push({ ...performances[i], rank })
  }

  for (const perf of ranked) {
    await prisma.examPerformance.upsert({
      where: { examId_studentId: { examId, studentId: perf.studentId } },
      update: {
        totalMarksObtained: perf.totalObtained,
        totalPossibleMarks: perf.totalPossible,
        percentage: perf.percentage,
        grade: perf.grade,
        rank: perf.rank,
        isPassed: perf.isPassed,
        totalSubjects: perf.totalSubjects,
        subjectsPassed: perf.subjectsPassed,
        subjectsFailed: perf.subjectsFailed,
        isAbsent: perf.hasAbsent,
        resultStatus: perf.resultStatus,
      },
      create: {
        examId,
        studentId: perf.studentId,
        totalMarksObtained: perf.totalObtained,
        totalPossibleMarks: perf.totalPossible,
        percentage: perf.percentage,
        grade: perf.grade,
        rank: perf.rank,
        isPassed: perf.isPassed,
        totalSubjects: perf.totalSubjects,
        subjectsPassed: perf.subjectsPassed,
        subjectsFailed: perf.subjectsFailed,
        isAbsent: perf.hasAbsent,
        resultStatus: perf.resultStatus,
      },
    })
  }
}

// ─── Class Result — auto-generated, read-only from ExamPerformance/Result ────

export async function getClassResult(examId: number, classId: number) {
  const [exam, subjects, students] = await Promise.all([
    prisma.exam.findUnique({ where: { id: examId }, include: { academicYear: true } }),
    getSubjectsByClass(classId),
    prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    }),
  ])
  if (!exam) return null

  const studentIds = students.map((s) => s.id)
  const subjectIds = subjects.map((s) => s.id)

  const [performances, results, rollSlips] = await Promise.all([
    prisma.examPerformance.findMany({ where: { examId, studentId: { in: studentIds } } }),
    prisma.result.findMany({ where: { examId, subjectId: { in: subjectIds }, studentId: { in: studentIds } } }),
    prisma.rollNumberSlip.findMany({ where: { examId, studentId: { in: studentIds } } }),
  ])

  const perfMap = new Map(performances.map((p) => [p.studentId, p]))
  const rollMap = new Map(rollSlips.map((r) => [r.studentId, r.rollNumber]))
  const resultsByStudent = new Map<number, Map<number, (typeof results)[number]>>()
  results.forEach((r) => {
    if (!resultsByStudent.has(r.studentId)) resultsByStudent.set(r.studentId, new Map())
    resultsByStudent.get(r.studentId)!.set(r.subjectId, r)
  })

  const rows = students.map((s) => {
    const perf = perfMap.get(s.id)
    const subjectMarks = subjects.map((subj) => {
      const r = resultsByStudent.get(s.id)?.get(subj.id)
      return {
        subjectId: subj.id,
        marksObtained: r ? Number(r.marksObtained) : null,
        totalMarks: r ? Number(r.totalMarks) : null,
        isAbsent: r?.isAbsent ?? false,
        isWithheld: r?.isWithheld ?? false,
      }
    })
    return {
      student: s,
      rollNumber: rollMap.get(s.id) ?? null,
      subjectMarks,
      totalObtained: perf ? Number(perf.totalMarksObtained) : null,
      totalPossible: perf ? Number(perf.totalPossibleMarks) : null,
      percentage: perf ? Number(perf.percentage) : null,
      grade: perf?.grade ?? null,
      rank: perf?.rank ?? null,
      resultStatus: perf?.resultStatus ?? 'Pending',
      isPassed: perf?.isPassed ?? false,
    }
  }).sort((a, b) => {
    if (a.rank === null && b.rank === null) return 0
    if (a.rank === null) return 1
    if (b.rank === null) return -1
    return a.rank - b.rank
  })

  const subjectAverages = subjects.map((subj) => {
    const marks = rows.map((r) => r.subjectMarks.find((m) => m.subjectId === subj.id))
    const scored = marks.filter((m) => m && m.marksObtained !== null && !m.isAbsent && !m.isWithheld)
    const avgObtained = scored.length > 0
      ? Math.round((scored.reduce((sum, m) => sum + m!.marksObtained!, 0) / scored.length) * 10) / 10
      : 0
    const totalMarks = marks.find((m) => m && m.totalMarks !== null)?.totalMarks ?? 0
    return { subjectId: subj.id, name: subj.name, totalMarks, avgObtained }
  })

  const withPerf = rows.filter((r) => r.percentage !== null)
  const passCount = rows.filter((r) => r.resultStatus === 'Pass').length
  const failCount = rows.filter((r) => r.resultStatus === 'Fail').length
  const absentCount = rows.filter((r) => r.resultStatus === 'Absent').length
  const withheldCount = rows.filter((r) => r.resultStatus === 'Withheld').length
  const classAverage = withPerf.length > 0
    ? Math.round((withPerf.reduce((sum, r) => sum + r.percentage!, 0) / withPerf.length) * 10) / 10
    : 0
  const highest = withPerf.length > 0 ? Math.max(...withPerf.map((r) => r.percentage!)) : 0
  const lowest = withPerf.length > 0 ? Math.min(...withPerf.map((r) => r.percentage!)) : 0

  return {
    exam,
    subjects,
    rows,
    totalStudents: students.length,
    passCount,
    failCount,
    absentCount,
    withheldCount,
    classAverage,
    highest,
    lowest,
    subjectAverages,
  }
}

// ─── Student Full Result (for DMC / result card) — auto-generated ─────────────

export async function getStudentFullResult(examId: number, studentId: number) {
  const [exam, student, results, school, performance, rollSlip] = await Promise.all([
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
    prisma.examPerformance.findUnique({ where: { examId_studentId: { examId, studentId } } }),
    prisma.rollNumberSlip.findUnique({ where: { studentId_examId: { studentId, examId } } }),
  ])

  if (!exam || !student) return null

  const displayClass = student.class ?? exam.class
  const classLabel = displayClass ? `${displayClass.name} – ${displayClass.section}` : '—'

  const totalObtained = results
    .filter((r) => !r.isAbsent && !r.isWithheld)
    .reduce((s, r) => s + Number(r.marksObtained), 0)
  const totalPossible = results.reduce((s, r) => s + Number(r.totalMarks), 0)

  const allPerf = await prisma.examPerformance.findMany({ where: { examId } })
  const totalRanked = allPerf.length

  const percentage = performance
    ? Number(performance.percentage)
    : totalPossible > 0
      ? Math.round((totalObtained / totalPossible) * 1000) / 10
      : 0
  const overallGrade = performance?.grade ?? (totalPossible > 0 ? calculateGrade(totalObtained, totalPossible) : 'N/A')
  const resultStatus = performance?.resultStatus ?? (results.length === 0 ? 'Pending' : overallGrade === 'F' ? 'Fail' : 'Pass')
  const passed = performance?.isPassed ?? resultStatus === 'Pass'
  const rank = performance?.rank ?? null

  const subjectsPassed = performance?.subjectsPassed ?? results.filter((r) =>
    !r.isAbsent && !r.isWithheld && Number(r.totalMarks) > 0 && Number(r.marksObtained) / Number(r.totalMarks) >= 0.4
  ).length
  const subjectsFailed = performance?.subjectsFailed ?? results.filter((r) =>
    !r.isAbsent && !r.isWithheld && Number(r.totalMarks) > 0 && Number(r.marksObtained) / Number(r.totalMarks) < 0.4
  ).length

  return {
    exam,
    student,
    school,
    classLabel,
    rollNumber: rollSlip?.rollNumber ?? null,
    results: results.map((r) => ({
      subject: r.subject,
      marksObtained: Number(r.marksObtained),
      totalMarks: Number(r.totalMarks),
      theoryMarks: r.theoryMarks !== null ? Number(r.theoryMarks) : null,
      practicalMarks: r.practicalMarks !== null ? Number(r.practicalMarks) : null,
      isAbsent: r.isAbsent,
      isWithheld: r.isWithheld,
      grade: r.grade ?? calculateGrade(Number(r.marksObtained), Number(r.totalMarks)),
      remarks: r.remarks ?? null,
    })),
    totalObtained,
    totalPossible,
    percentage,
    overallGrade,
    resultStatus,
    passed,
    rank,
    totalRanked,
    subjectsPassed,
    subjectsFailed,
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
