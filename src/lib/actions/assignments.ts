'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireParentChildLink } from '@/lib/security'

const SCHOOL_ID = 1
const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_FILE_TYPES = ['pdf', 'docx']

async function verifyLMSAccess() {
  const settings = await prisma.lMSSettings.findUnique({ where: { schoolId: SCHOOL_ID } })
  if (!settings?.isEnabled) throw new Error('LMS is not enabled for this school')
}

async function verifyTeacherOwnership(courseId: number, userId: number, role: string) {
  if (role === 'ADMIN') return
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new Error('Course not found')
  if (course.teacherId !== userId) throw new Error('Unauthorized: You do not own this course')
}

async function getStudentFromUser(userId: number) {
  const profile = await prisma.studentPortalProfile.findUnique({
    where: { userId },
    include: { student: { select: { id: true, classId: true } } },
  })
  if (!profile) throw new Error('Student profile not found')
  return profile.student
}

function revalidateAssignmentPaths(courseId?: number) {
  revalidatePath('/lms')
  revalidatePath('/lms/courses')
  revalidatePath('/lms/gradebook')
  revalidatePath('/portal/student')
  revalidatePath('/portal/parent')
  if (courseId) revalidatePath(`/lms/courses/${courseId}`)
}

export async function createAssignment(
  data: {
    courseId: number
    title: string
    description?: string
    instructions?: string
    fileUrl?: string
    totalMarks?: number
    passingMarks?: number
    dueDate: Date | string
    allowLate?: boolean
    publishImmediately?: boolean
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  await verifyTeacherOwnership(data.courseId, userId, role)
  if (!data.title?.trim()) throw new Error('Title is required')

  const assignment = await prisma.assignment.create({
    data: {
      courseId: data.courseId,
      title: data.title.trim(),
      description: data.description,
      instructions: data.instructions,
      fileUrl: data.fileUrl || null,
      totalMarks: data.totalMarks ?? 100,
      passingMarks: data.passingMarks ?? 40,
      dueDate: new Date(data.dueDate),
      allowLate: data.allowLate ?? false,
      isPublished: data.publishImmediately ?? false,
      postedById: userId,
    },
  })

  revalidateAssignmentPaths(data.courseId)
  return assignment
}

export async function updateAssignment(
  assignmentId: number,
  data: {
    title?: string
    description?: string
    instructions?: string
    fileUrl?: string | null
    totalMarks?: number
    passingMarks?: number
    dueDate?: Date | string
    allowLate?: boolean
    isPublished?: boolean
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const existing = await prisma.assignment.findUnique({ where: { id: assignmentId } })
  if (!existing) throw new Error('Assignment not found')
  await verifyTeacherOwnership(existing.courseId, userId, role)

  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.instructions !== undefined ? { instructions: data.instructions } : {}),
      ...(data.fileUrl !== undefined ? { fileUrl: data.fileUrl } : {}),
      ...(data.totalMarks !== undefined ? { totalMarks: data.totalMarks } : {}),
      ...(data.passingMarks !== undefined ? { passingMarks: data.passingMarks } : {}),
      ...(data.dueDate !== undefined ? { dueDate: new Date(data.dueDate) } : {}),
      ...(data.allowLate !== undefined ? { allowLate: data.allowLate } : {}),
      ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
    },
  })

  revalidateAssignmentPaths(existing.courseId)
  return assignment
}

export async function publishAssignment(assignmentId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  const existing = await prisma.assignment.findUnique({ where: { id: assignmentId } })
  if (!existing) throw new Error('Assignment not found')
  await verifyTeacherOwnership(existing.courseId, userId, role)

  const assignment = await prisma.assignment.update({
    where: { id: assignmentId },
    data: { isPublished: true },
  })
  revalidateAssignmentPaths(existing.courseId)
  return assignment
}

export async function deleteAssignment(assignmentId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  const existing = await prisma.assignment.findUnique({ where: { id: assignmentId } })
  if (!existing) throw new Error('Assignment not found')
  await verifyTeacherOwnership(existing.courseId, userId, role)

  await prisma.assignment.delete({ where: { id: assignmentId } })
  revalidateAssignmentPaths(existing.courseId)
}

export async function getAssignments(courseId: number, userId: number, role: string, studentId?: number) {
  await verifyLMSAccess()

  if (role === 'STUDENT') {
    const student = await getStudentFromUser(userId)
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course || course.classId !== student.classId || !course.isPublished) {
      throw new Error('Unauthorized')
    }

    const assignments = await prisma.assignment.findMany({
      where: { courseId, isPublished: true },
      include: {
        submissions: { where: { studentId: student.id } },
        course: { select: { title: true, subject: { select: { name: true } } } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    return assignments.map((a) => ({
      ...a,
      mySubmission: a.submissions[0] ?? null,
      submissionCount: a._count.submissions,
    }))
  }

  if (role === 'PARENT') {
    if (!studentId) throw new Error('Student ID required')
    await requireParentChildLink(studentId, userId)
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) throw new Error('Student not found')
    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course || course.classId !== student.classId) throw new Error('Unauthorized')

    const assignments = await prisma.assignment.findMany({
      where: { courseId, isPublished: true },
      include: {
        submissions: { where: { studentId } },
        course: { select: { title: true, subject: { select: { name: true } } } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    return assignments.map((a) => ({
      ...a,
      mySubmission: a.submissions[0] ?? null,
      submissionCount: a._count.submissions,
    }))
  }

  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  await verifyTeacherOwnership(courseId, userId, role)

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { class: { include: { _count: { select: { students: { where: { status: 'ACTIVE' } } } } } } },
  })
  if (!course) throw new Error('Course not found')

  const assignments = await prisma.assignment.findMany({
    where: { courseId },
    include: {
      _count: { select: { submissions: true } },
      submissions: { select: { status: true, isLate: true } },
    },
    orderBy: { dueDate: 'asc' },
  })

  return assignments.map((a) => ({
    ...a,
    totalStudents: course.class._count.students,
    submissionCount: a._count.submissions,
    gradedCount: a.submissions.filter((s) => s.status === 'GRADED' || s.status === 'RETURNED').length,
    lateCount: a.submissions.filter((s) => s.isLate).length,
  }))
}

export async function getStudentAssignments(userId: number, role: string, studentId?: number) {
  await verifyLMSAccess()

  let targetStudentId: number
  let classId: number

  if (role === 'STUDENT') {
    const student = await getStudentFromUser(userId)
    targetStudentId = student.id
    classId = student.classId
  } else if (role === 'PARENT') {
    if (!studentId) throw new Error('Student ID required')
    await requireParentChildLink(studentId, userId)
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) throw new Error('Student not found')
    targetStudentId = student.id
    classId = student.classId
  } else {
    throw new Error('Unauthorized')
  }

  const assignments = await prisma.assignment.findMany({
    where: {
      isPublished: true,
      course: { classId, isPublished: true },
    },
    include: {
      course: { select: { id: true, title: true, subject: { select: { name: true } } } },
      submissions: { where: { studentId: targetStudentId } },
    },
    orderBy: { dueDate: 'asc' },
  })

  return assignments.map((a) => ({
    ...a,
    mySubmission: a.submissions[0] ?? null,
  }))
}

export async function getAssignmentById(assignmentId: number, userId: number, role: string, studentId?: number) {
  await verifyLMSAccess()

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: {
        include: {
          subject: { select: { name: true } },
          class: { select: { id: true, name: true, section: true } },
        },
      },
      postedBy: { select: { name: true } },
      _count: { select: { submissions: true } },
    },
  })
  if (!assignment) throw new Error('Assignment not found')

  if (role === 'ADMIN' || role === 'TEACHER') {
    await verifyTeacherOwnership(assignment.courseId, userId, role)
    return { ...assignment, mySubmission: null }
  }

  if (role === 'STUDENT') {
    const student = await getStudentFromUser(userId)
    if (assignment.course.classId !== student.classId || !assignment.isPublished) {
      throw new Error('Unauthorized')
    }
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    })
    return { ...assignment, mySubmission: submission }
  }

  if (role === 'PARENT') {
    if (!studentId) throw new Error('Student ID required')
    await requireParentChildLink(studentId, userId)
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student || assignment.course.classId !== student.classId || !assignment.isPublished) {
      throw new Error('Unauthorized')
    }
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    })
    return { ...assignment, mySubmission: submission }
  }

  throw new Error('Unauthorized')
}

export async function submitAssignment(
  data: {
    assignmentId: number
    textAnswer?: string
    fileBase64?: string
    fileName?: string
    fileType?: string
    fileSize?: number
  },
  userId: number
) {
  await verifyLMSAccess()
  const student = await getStudentFromUser(userId)

  const assignment = await prisma.assignment.findUnique({
    where: { id: data.assignmentId },
    include: { course: { select: { classId: true, isPublished: true } } },
  })
  if (!assignment || !assignment.isPublished) throw new Error('Assignment not found')
  if (assignment.course.classId !== student.classId) throw new Error('Unauthorized')

  const hasText = Boolean(data.textAnswer?.trim())
  const hasFile = Boolean(data.fileBase64)
  if (!hasText && !hasFile) throw new Error('Provide a text answer or file upload')

  if (hasFile) {
    const type = (data.fileType || '').toLowerCase().replace('.', '')
    if (!ALLOWED_FILE_TYPES.includes(type)) {
      throw new Error('Only PDF and DOCX files are allowed')
    }
    if ((data.fileSize ?? 0) > MAX_FILE_BYTES) {
      throw new Error('File must be 5MB or smaller')
    }
  }

  const now = new Date()
  const pastDue = now > assignment.dueDate
  if (pastDue && !assignment.allowLate) {
    throw new Error('Submission deadline has passed')
  }

  const existing = await prisma.assignmentSubmission.findUnique({
    where: {
      assignmentId_studentId: {
        assignmentId: data.assignmentId,
        studentId: student.id,
      },
    },
  })

  if (existing?.status === 'GRADED' || existing?.status === 'RETURNED') {
    throw new Error('This assignment has already been graded')
  }

  if (existing && pastDue && !assignment.allowLate) {
    throw new Error('Submission deadline has passed')
  }

  const payload = {
    textAnswer: data.textAnswer?.trim() || null,
    fileUrl: data.fileBase64 || existing?.fileUrl || null,
    fileName: data.fileName || (data.fileBase64 ? null : existing?.fileName) || null,
    fileType: data.fileType || (data.fileBase64 ? null : existing?.fileType) || null,
    fileSize: data.fileSize ?? (data.fileBase64 ? null : existing?.fileSize) ?? null,
    submittedAt: now,
    isLate: pastDue,
    status: pastDue ? ('LATE' as const) : ('SUBMITTED' as const),
    marksAwarded: null,
    feedback: null,
    gradedById: null,
    gradedAt: null,
  }

  const submission = existing
    ? await prisma.assignmentSubmission.update({ where: { id: existing.id }, data: payload })
    : await prisma.assignmentSubmission.create({
        data: {
          assignmentId: data.assignmentId,
          studentId: student.id,
          ...payload,
        },
      })

  revalidateAssignmentPaths(assignment.courseId)
  revalidatePath(`/portal/student/lms/assignments/${data.assignmentId}`)
  return submission
}

export async function gradeSubmission(
  data: { submissionId: number; marksAwarded: number; feedback?: string },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: data.submissionId },
    include: { assignment: true },
  })
  if (!submission) throw new Error('Submission not found')
  await verifyTeacherOwnership(submission.assignment.courseId, userId, role)

  const total = Number(submission.assignment.totalMarks)
  if (data.marksAwarded < 0 || data.marksAwarded > total) {
    throw new Error(`Marks must be between 0 and ${total}`)
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id: data.submissionId },
    data: {
      marksAwarded: data.marksAwarded,
      feedback: data.feedback ?? null,
      gradedById: userId,
      gradedAt: new Date(),
      status: 'GRADED',
    },
  })

  revalidateAssignmentPaths(submission.assignment.courseId)
  return updated
}

export async function returnAllGraded(assignmentId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } })
  if (!assignment) throw new Error('Assignment not found')
  await verifyTeacherOwnership(assignment.courseId, userId, role)

  await prisma.assignmentSubmission.updateMany({
    where: { assignmentId, status: 'GRADED' },
    data: { status: 'RETURNED' },
  })
  revalidateAssignmentPaths(assignment.courseId)
}

export async function getSubmissionsForAssignment(assignmentId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: {
      course: {
        include: {
          class: {
            include: {
              students: {
                where: { status: 'ACTIVE' },
                orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
              },
            },
          },
          subject: { select: { name: true } },
        },
      },
    },
  })
  if (!assignment) throw new Error('Assignment not found')
  await verifyTeacherOwnership(assignment.courseId, userId, role)

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } },
      gradedBy: { select: { name: true } },
    },
  })

  const byStudent = new Map(submissions.map((s) => [s.studentId, s]))
  const rows = assignment.course.class.students.map((student) => {
    const sub = byStudent.get(student.id)
    return {
      student,
      submission: sub ?? null,
      status: sub
        ? sub.status === 'GRADED' || sub.status === 'RETURNED'
          ? 'GRADED'
          : sub.isLate
            ? 'LATE'
            : 'SUBMITTED'
        : 'NOT_SUBMITTED',
    }
  })

  rows.sort((a, b) => {
    if (!a.submission && !b.submission) return 0
    if (!a.submission) return 1
    if (!b.submission) return -1
    return new Date(b.submission.submittedAt).getTime() - new Date(a.submission.submittedAt).getTime()
  })

  const submitted = rows.filter((r) => r.submission).length
  const graded = rows.filter((r) => r.status === 'GRADED').length
  const late = rows.filter((r) => r.status === 'LATE' || r.submission?.isLate).length

  return {
    assignment,
    rows,
    summary: {
      total: rows.length,
      submitted,
      notSubmitted: rows.length - submitted,
      graded,
      late,
    },
  }
}

export async function downloadSubmissionFile(submissionId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER' && role !== 'STUDENT' && role !== 'PARENT') {
    throw new Error('Unauthorized')
  }

  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: { include: { course: true } } },
  })
  if (!submission || !submission.fileUrl) throw new Error('File not found')

  if (role === 'TEACHER' || role === 'ADMIN') {
    await verifyTeacherOwnership(submission.assignment.courseId, userId, role)
  } else if (role === 'STUDENT') {
    const student = await getStudentFromUser(userId)
    if (submission.studentId !== student.id) throw new Error('Unauthorized')
  }

  return {
    fileUrl: submission.fileUrl,
    fileName: submission.fileName || 'submission',
    fileType: submission.fileType,
  }
}

export async function getPendingGradingCounts(userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const courseWhere = role === 'TEACHER' ? { teacherId: userId } : {}
  const assignments = await prisma.assignment.findMany({
    where: { isPublished: true, course: courseWhere },
    include: {
      course: { select: { id: true, title: true } },
      submissions: { where: { status: { in: ['SUBMITTED', 'LATE'] } } },
    },
  })

  return assignments
    .filter((a) => a.submissions.length > 0)
    .map((a) => ({
      assignmentId: a.id,
      title: a.title,
      courseId: a.course.id,
      courseTitle: a.course.title,
      pendingCount: a.submissions.length,
    }))
}

export async function getGradeBook(courseId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  await verifyTeacherOwnership(courseId, userId, role)

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      class: {
        include: {
          students: {
            where: { status: 'ACTIVE' },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
          },
        },
      },
      assignments: {
        where: { isPublished: true },
        orderBy: { dueDate: 'asc' },
        include: { submissions: true },
      },
      quizzes: {
        where: { isPublished: true },
        orderBy: { createdAt: 'asc' },
        include: { attempts: { where: { isCompleted: true } } },
      },
    },
  })
  if (!course) throw new Error('Course not found')

  const rows = course.class.students.map((student) => {
    const assignmentScores = course.assignments.map((a) => {
      const sub = a.submissions.find((s) => s.studentId === student.id)
      const marks = sub?.marksAwarded != null ? Number(sub.marksAwarded) : null
      const total = Number(a.totalMarks)
      const passing = Number(a.passingMarks)
      return {
        assignmentId: a.id,
        title: a.title,
        marks,
        total,
        passing,
        status: !sub ? 'MISSING' : marks == null ? 'PENDING' : marks >= passing ? 'PASS' : 'FAIL',
      }
    })

    const quizScores = course.quizzes.map((q) => {
      const attempt = q.attempts.find((att) => att.studentId === student.id)
      const marks = attempt ? Number(attempt.marksAwarded) : null
      const total = Number(q.totalMarks)
      const passing = Number(q.passingMarks)
      return {
        quizId: q.id,
        title: q.title,
        marks,
        total,
        passing,
        status: !attempt ? 'MISSING' : marks == null ? 'PENDING' : Number(attempt.percentage) >= (passing / total) * 100 || attempt.isPassed ? 'PASS' : 'FAIL',
        percentage: attempt ? Number(attempt.percentage) : null,
      }
    })

    const graded = [
      ...assignmentScores.filter((s) => s.marks != null).map((s) => (s.marks! / s.total) * 100),
      ...quizScores.filter((s) => s.percentage != null).map((s) => s.percentage!),
    ]
    const average = graded.length
      ? Math.round(graded.reduce((sum, n) => sum + n, 0) / graded.length)
      : null

    return { student, assignmentScores, quizScores, average }
  })

  const averages = rows.filter((r) => r.average != null).map((r) => r.average!)
  const classAverage = averages.length
    ? Math.round(averages.reduce((s, n) => s + n, 0) / averages.length)
    : null

  return {
    course: { id: course.id, title: course.title, class: course.class },
    assignments: course.assignments.map((a) => ({ id: a.id, title: a.title, totalMarks: a.totalMarks, passingMarks: a.passingMarks })),
    quizzes: course.quizzes.map((q) => ({ id: q.id, title: q.title, totalMarks: q.totalMarks, passingMarks: q.passingMarks })),
    rows,
    classAverage,
  }
}
