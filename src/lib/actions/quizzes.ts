'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireParentChildLink } from '@/lib/security'
import type { QuestionType, Prisma } from '@prisma/client'

const SCHOOL_ID = 1

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

async function getQuizForTeacher(quizId: number, userId: number, role: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: true, questions: { include: { options: true } } },
  })
  if (!quiz) throw new Error('Quiz not found')
  await verifyTeacherOwnership(quiz.courseId, userId, role)
  return quiz
}

function revalidateQuizPaths(courseId?: number) {
  revalidatePath('/lms')
  revalidatePath('/lms/courses')
  revalidatePath('/lms/gradebook')
  revalidatePath('/portal/student')
  revalidatePath('/portal/parent')
  if (courseId) revalidatePath(`/lms/courses/${courseId}`)
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Server actions must return JSON-serializable data (no Prisma Decimal/Date). */
function serializeQuizAttemptStart(attempt: { id: number; startedAt: Date }) {
  return {
    id: attempt.id,
    startedAt: attempt.startedAt.toISOString(),
  }
}

async function recalculateQuizTotalMarks(quizId: number) {
  const questions = await prisma.quizQuestion.findMany({ where: { quizId } })
  const total = questions.reduce((sum, q) => sum + Number(q.marks), 0)
  await prisma.quiz.update({ where: { id: quizId }, data: { totalMarks: total || 0 } })
  return total
}

export async function createQuiz(
  data: {
    courseId: number
    title: string
    description?: string
    totalMarks?: number
    passingMarks?: number
    duration: number
    startTime?: Date | string | null
    endTime?: Date | string | null
    shuffleQuestions?: boolean
    showResultsImmediately?: boolean
    allowedAttempts?: number
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  await verifyTeacherOwnership(data.courseId, userId, role)
  if (!data.title?.trim()) throw new Error('Title is required')
  if (!data.duration || data.duration < 5) throw new Error('Duration must be at least 5 minutes')

  const quiz = await prisma.quiz.create({
    data: {
      courseId: data.courseId,
      title: data.title.trim(),
      description: data.description,
      totalMarks: data.totalMarks ?? 0,
      passingMarks: data.passingMarks ?? 40,
      duration: data.duration,
      startTime: data.startTime ? new Date(data.startTime) : null,
      endTime: data.endTime ? new Date(data.endTime) : null,
      shuffleQuestions: data.shuffleQuestions ?? false,
      showResultsImmediately: data.showResultsImmediately ?? true,
      allowedAttempts: Math.min(Math.max(data.allowedAttempts ?? 1, 1), 3),
      isPublished: false,
      postedById: userId,
    },
  })

  revalidateQuizPaths(data.courseId)
  return quiz
}

export async function updateQuiz(
  quizId: number,
  data: {
    title?: string
    description?: string
    passingMarks?: number
    duration?: number
    startTime?: Date | string | null
    endTime?: Date | string | null
    shuffleQuestions?: boolean
    showResultsImmediately?: boolean
    allowedAttempts?: number
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  const quiz = await getQuizForTeacher(quizId, userId, role)

  const attemptCount = await prisma.quizAttempt.count({ where: { quizId } })
  if (attemptCount > 0) throw new Error('Cannot edit quiz with existing submissions')

  const updated = await prisma.quiz.update({
    where: { id: quizId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.passingMarks !== undefined ? { passingMarks: data.passingMarks } : {}),
      ...(data.duration !== undefined ? { duration: data.duration } : {}),
      ...(data.startTime !== undefined
        ? { startTime: data.startTime ? new Date(data.startTime) : null }
        : {}),
      ...(data.endTime !== undefined
        ? { endTime: data.endTime ? new Date(data.endTime) : null }
        : {}),
      ...(data.shuffleQuestions !== undefined ? { shuffleQuestions: data.shuffleQuestions } : {}),
      ...(data.showResultsImmediately !== undefined
        ? { showResultsImmediately: data.showResultsImmediately }
        : {}),
      ...(data.allowedAttempts !== undefined
        ? { allowedAttempts: Math.min(Math.max(data.allowedAttempts, 1), 3) }
        : {}),
    },
  })

  revalidateQuizPaths(quiz.courseId)
  return updated
}

export async function addQuestion(
  data: {
    quizId: number
    questionText: string
    questionType: QuestionType
    marks?: number
    order?: number
    explanation?: string
    options?: { optionText: string; isCorrect: boolean; order?: number }[]
    trueIsCorrect?: boolean
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  const quiz = await getQuizForTeacher(data.quizId, userId, role)

  if (quiz.isPublished) {
    const attempts = await prisma.quizAttempt.count({ where: { quizId: data.quizId } })
    if (attempts > 0) throw new Error('Cannot add questions after students have attempted this quiz')
  }

  if (!data.questionText?.trim()) throw new Error('Question text is required')

  let optionsData: { optionText: string; isCorrect: boolean; order: number }[] = []

  if (data.questionType === 'MCQ') {
    const opts = (data.options || []).filter((o) => o.optionText.trim())
    if (opts.length < 2) throw new Error('MCQ requires at least 2 options')
    if (opts.filter((o) => o.isCorrect).length !== 1) {
      throw new Error('MCQ must have exactly one correct option')
    }
    optionsData = opts.map((o, i) => ({
      optionText: o.optionText.trim(),
      isCorrect: o.isCorrect,
      order: o.order ?? i,
    }))
  } else if (data.questionType === 'TRUE_FALSE') {
    const trueCorrect = data.trueIsCorrect ?? true
    optionsData = [
      { optionText: 'True', isCorrect: trueCorrect, order: 0 },
      { optionText: 'False', isCorrect: !trueCorrect, order: 1 },
    ]
  }

  const maxOrder = await prisma.quizQuestion.aggregate({
    where: { quizId: data.quizId },
    _max: { order: true },
  })

  const question = await prisma.quizQuestion.create({
    data: {
      quizId: data.quizId,
      questionText: data.questionText.trim(),
      questionType: data.questionType,
      marks: data.marks ?? 1,
      order: data.order ?? (maxOrder._max.order ?? -1) + 1,
      explanation: data.explanation,
      options: optionsData.length
        ? { create: optionsData }
        : undefined,
    },
    include: { options: { orderBy: { order: 'asc' } } },
  })

  await recalculateQuizTotalMarks(data.quizId)
  revalidateQuizPaths(quiz.courseId)
  return question
}

export async function updateQuestion(
  questionId: number,
  data: {
    questionText?: string
    marks?: number
    explanation?: string | null
    options?: { id?: number; optionText: string; isCorrect: boolean; order?: number }[]
    trueIsCorrect?: boolean
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: true, options: true },
  })
  if (!question) throw new Error('Question not found')
  await verifyTeacherOwnership(question.quiz.courseId, userId, role)

  await prisma.quizQuestion.update({
    where: { id: questionId },
    data: {
      ...(data.questionText !== undefined ? { questionText: data.questionText } : {}),
      ...(data.marks !== undefined ? { marks: data.marks } : {}),
      ...(data.explanation !== undefined ? { explanation: data.explanation } : {}),
    },
  })

  if (question.questionType === 'MCQ' && data.options) {
    const opts = data.options.filter((o) => o.optionText.trim())
    if (opts.length < 2) throw new Error('MCQ requires at least 2 options')
    if (opts.filter((o) => o.isCorrect).length !== 1) {
      throw new Error('MCQ must have exactly one correct option')
    }
    await prisma.quizOption.deleteMany({ where: { questionId } })
    await prisma.quizOption.createMany({
      data: opts.map((o, i) => ({
        questionId,
        optionText: o.optionText.trim(),
        isCorrect: o.isCorrect,
        order: o.order ?? i,
      })),
    })
  }

  if (question.questionType === 'TRUE_FALSE' && data.trueIsCorrect !== undefined) {
    await prisma.quizOption.deleteMany({ where: { questionId } })
    await prisma.quizOption.createMany({
      data: [
        { questionId, optionText: 'True', isCorrect: data.trueIsCorrect, order: 0 },
        { questionId, optionText: 'False', isCorrect: !data.trueIsCorrect, order: 1 },
      ],
    })
  }

  await recalculateQuizTotalMarks(question.quizId)
  revalidateQuizPaths(question.quiz.courseId)

  return prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { options: { orderBy: { order: 'asc' } } },
  })
}

export async function deleteQuestion(questionId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: true },
  })
  if (!question) throw new Error('Question not found')
  await verifyTeacherOwnership(question.quiz.courseId, userId, role)

  await prisma.quizQuestion.delete({ where: { id: questionId } })
  await recalculateQuizTotalMarks(question.quizId)
  revalidateQuizPaths(question.quiz.courseId)
}

export async function reorderQuestion(
  questionId: number,
  direction: 'up' | 'down',
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    include: { quiz: true },
  })
  if (!question) throw new Error('Question not found')
  await verifyTeacherOwnership(question.quiz.courseId, userId, role)

  const questions = await prisma.quizQuestion.findMany({
    where: { quizId: question.quizId },
    orderBy: { order: 'asc' },
  })
  const idx = questions.findIndex((q) => q.id === questionId)
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= questions.length) return

  await prisma.$transaction([
    prisma.quizQuestion.update({
      where: { id: questions[idx].id },
      data: { order: questions[swapIdx].order },
    }),
    prisma.quizQuestion.update({
      where: { id: questions[swapIdx].id },
      data: { order: questions[idx].order },
    }),
  ])
  revalidateQuizPaths(question.quiz.courseId)
}

export async function publishQuiz(quizId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  const quiz = await getQuizForTeacher(quizId, userId, role)

  if (quiz.questions.length === 0) throw new Error('Quiz must have at least 1 question')

  for (const q of quiz.questions) {
    if (q.questionType === 'MCQ' || q.questionType === 'TRUE_FALSE') {
      const correct = q.options.filter((o) => o.isCorrect)
      if (correct.length !== 1) {
        throw new Error(`Question "${q.questionText.slice(0, 40)}" must have exactly one correct option`)
      }
    }
  }

  await recalculateQuizTotalMarks(quizId)
  const updated = await prisma.quiz.update({
    where: { id: quizId },
    data: { isPublished: true },
  })
  revalidateQuizPaths(quiz.courseId)
  return updated
}

export async function deleteQuiz(quizId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  const quiz = await getQuizForTeacher(quizId, userId, role)
  await prisma.quiz.delete({ where: { id: quizId } })
  revalidateQuizPaths(quiz.courseId)
}

export async function getQuizzes(courseId: number, userId: number, role: string, studentId?: number) {
  await verifyLMSAccess()

  if (role === 'STUDENT' || role === 'PARENT') {
    let targetStudentId: number
    let classId: number

    if (role === 'STUDENT') {
      const student = await getStudentFromUser(userId)
      targetStudentId = student.id
      classId = student.classId
    } else {
      if (!studentId) throw new Error('Student ID required')
      await requireParentChildLink(studentId, userId)
      const student = await prisma.student.findUnique({ where: { id: studentId } })
      if (!student) throw new Error('Student not found')
      targetStudentId = student.id
      classId = student.classId
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course || course.classId !== classId || !course.isPublished) throw new Error('Unauthorized')

    const quizzes = await prisma.quiz.findMany({
      where: { courseId, isPublished: true },
      include: {
        _count: { select: { questions: true, attempts: true } },
        attempts: { where: { studentId: targetStudentId } },
        course: { select: { title: true, subject: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return quizzes.map((q) => {
      const attempt = q.attempts[0]
      let attemptStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED'
      if (attempt?.isCompleted) attemptStatus = 'COMPLETED'
      else if (attempt) attemptStatus = 'IN_PROGRESS'

      return {
        ...q,
        questionCount: q._count.questions,
        myAttempt: attempt
          ? {
              ...attempt,
              showScore: q.showResultsImmediately || role === 'PARENT',
            }
          : null,
        attemptStatus,
      }
    })
  }

  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  await verifyTeacherOwnership(courseId, userId, role)

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { class: { include: { _count: { select: { students: { where: { status: 'ACTIVE' } } } } } } },
  })
  if (!course) throw new Error('Course not found')

  const quizzes = await prisma.quiz.findMany({
    where: { courseId },
    include: {
      _count: { select: { questions: true, attempts: true } },
      attempts: { where: { isCompleted: true }, select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return quizzes.map((q) => ({
    ...q,
    questionCount: q._count.questions,
    attemptCount: q.attempts.length,
    totalStudents: course.class._count.students,
  }))
}

export async function getStudentQuizzes(userId: number, role: string, studentId?: number) {
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

  const quizzes = await prisma.quiz.findMany({
    where: { isPublished: true, course: { classId, isPublished: true } },
    include: {
      course: { select: { id: true, title: true, subject: { select: { name: true } } } },
      _count: { select: { questions: true } },
      attempts: { where: { studentId: targetStudentId } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return quizzes.map((q) => {
    const attempt = q.attempts[0]
    let attemptStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' = 'NOT_STARTED'
    if (attempt?.isCompleted) attemptStatus = 'COMPLETED'
    else if (attempt) attemptStatus = 'IN_PROGRESS'
    return {
      ...q,
      questionCount: q._count.questions,
      myAttempt: attempt,
      attemptStatus,
    }
  })
}

export async function getQuizById(quizId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { include: { subject: true, class: true } },
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
      _count: { select: { attempts: true } },
    },
  })
  if (!quiz) throw new Error('Quiz not found')
  await verifyTeacherOwnership(quiz.courseId, userId, role)
  return quiz
}

export async function getQuizForAttempt(quizId: number, userId: number) {
  // Return structured errors instead of throwing so Next.js doesn't turn
  // server-action failures into 500 responses the client cannot handle.
  try {
    await verifyLMSAccess()
  } catch {
    return { error: 'LMS is not enabled' } as const
  }

  let student: Awaited<ReturnType<typeof getStudentFromUser>>
  try {
    student = await getStudentFromUser(userId)
  } catch {
    return { error: 'Student profile not found. Please contact the school office.' } as const
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      course: { select: { classId: true, isPublished: true, title: true } },
      questions: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
    },
  })
  if (!quiz || !quiz.isPublished || !quiz.course.isPublished) {
    return { error: 'Quiz not found or not published.' } as const
  }
  if (quiz.course.classId !== student.classId) {
    return { error: 'You are not enrolled in the class for this quiz.' } as const
  }

  const now = new Date()
  if (quiz.startTime && now < quiz.startTime) {
    return { error: 'This quiz is not available yet.' } as const
  }
  if (quiz.endTime && now > quiz.endTime) {
    return { error: 'This quiz has closed.' } as const
  }

  const existing = await prisma.quizAttempt.findUnique({
    where: { quizId_studentId: { quizId, studentId: student.id } },
  })

  const isCompleted = Boolean(existing?.isCompleted)

  // Already submitted and no retakes — client should show results or a submitted message
  if (isCompleted && quiz.allowedAttempts <= 1) {
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      duration: quiz.duration,
      totalMarks: Number(quiz.totalMarks),
      passingMarks: Number(quiz.passingMarks),
      showResultsImmediately: quiz.showResultsImmediately,
      courseTitle: quiz.course.title,
      questions: [] as Array<{
        id: number
        questionText: string
        questionType: string
        marks: number
        order: number
        options: { id: number; optionText: string; order: number }[]
      }>,
      isCompleted: true,
      existingAttemptId: existing?.id ?? null,
      existingStartedAt: existing?.startedAt?.toISOString() ?? null,
    }
  }

  let questions = quiz.questions.map((q) => ({
    id: q.id,
    questionText: q.questionText,
    questionType: q.questionType,
    marks: Number(q.marks),
    order: q.order,
    options: q.options.map((o) => ({
      id: o.id,
      optionText: o.optionText,
      order: o.order,
    })),
  }))

  if (quiz.shuffleQuestions) questions = shuffle(questions)
  questions = questions.map((q) => ({
    ...q,
    options: q.questionType === 'SHORT' ? [] : shuffle(q.options),
  }))

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    duration: quiz.duration,
    totalMarks: Number(quiz.totalMarks),
    passingMarks: Number(quiz.passingMarks),
    showResultsImmediately: quiz.showResultsImmediately,
    courseTitle: quiz.course.title,
    questions,
    isCompleted: false,
    existingAttemptId: existing?.id ?? null,
    existingStartedAt: existing?.startedAt?.toISOString() ?? null,
  }
}

export async function startQuizAttempt(quizId: number, userId: number) {
  await verifyLMSAccess()
  const student = await getStudentFromUser(userId)

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { course: { select: { classId: true } }, questions: true },
  })
  if (!quiz || !quiz.isPublished) throw new Error('Quiz not found or not published.')
  if (quiz.course.classId !== student.classId) throw new Error('You are not enrolled in the class for this quiz.')

  const now = new Date()
  if (quiz.startTime && now < quiz.startTime) throw new Error('This quiz is not available yet.')
  if (quiz.endTime && now > quiz.endTime) throw new Error('This quiz has closed.')

  const existing = await prisma.quizAttempt.findUnique({
    where: { quizId_studentId: { quizId, studentId: student.id } },
    select: { id: true, startedAt: true, isCompleted: true },
  })

  if (existing?.isCompleted) {
    if (quiz.allowedAttempts <= 1) throw new Error('No attempts remaining')
    // Reset for retake when allowedAttempts > 1 (single row unique constraint)
    await prisma.quizAnswer.deleteMany({ where: { attemptId: existing.id } })
    const reset = await prisma.quizAttempt.update({
      where: { id: existing.id },
      data: {
        startedAt: now,
        submittedAt: null,
        timeSpent: null,
        isCompleted: false,
        isTimedOut: false,
        totalMarks: quiz.totalMarks,
        marksAwarded: 0,
        percentage: 0,
        isPassed: false,
        manualMarksAwarded: null,
        teacherFeedback: null,
        gradedById: null,
        gradedAt: null,
      },
      select: { id: true, startedAt: true },
    })
    return serializeQuizAttemptStart(reset)
  }

  if (existing) return serializeQuizAttemptStart(existing)

  const created = await prisma.quizAttempt.create({
    data: {
      quizId,
      studentId: student.id,
      totalMarks: quiz.totalMarks,
      startedAt: now,
    },
    select: { id: true, startedAt: true },
  })
  return serializeQuizAttemptStart(created)
}

export async function saveAnswer(
  data: {
    attemptId: number
    questionId: number
    selectedOptionId?: number | null
    textAnswer?: string | null
  },
  userId: number
) {
  await verifyLMSAccess()
  const student = await getStudentFromUser(userId)

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: data.attemptId },
    include: { quiz: true },
  })
  if (!attempt || attempt.studentId !== student.id) throw new Error('Unauthorized')
  if (attempt.isCompleted) throw new Error('Quiz already submitted')

  const elapsedMs = Date.now() - new Date(attempt.startedAt).getTime()
  if (elapsedMs > attempt.quiz.duration * 60 * 1000 + 5000) {
    throw new Error('Time has expired')
  }

  await prisma.quizAnswer.upsert({
    where: {
      attemptId_questionId: {
        attemptId: data.attemptId,
        questionId: data.questionId,
      },
    },
    update: {
      selectedOptionId: data.selectedOptionId ?? null,
      textAnswer: data.textAnswer ?? null,
    },
    create: {
      attemptId: data.attemptId,
      questionId: data.questionId,
      selectedOptionId: data.selectedOptionId ?? null,
      textAnswer: data.textAnswer ?? null,
    },
  })

  return { ok: true as const }
}

async function gradeAndCompleteAttempt(attemptId: number, timedOut: boolean) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          questions: { include: { options: true } },
        },
      },
      answers: true,
    },
  })
  if (!attempt) throw new Error('Attempt not found')
  if (attempt.isCompleted) {
    return prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            question: { include: { options: true } },
            selectedOption: true,
          },
        },
        quiz: true,
      },
    })
  }

  const now = new Date()
  const timeSpent = Math.max(
    0,
    Math.floor((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000)
  )

  let autoMarks = 0
  const answerUpdates: Prisma.PrismaPromise<unknown>[] = []

  for (const question of attempt.quiz.questions) {
    const answer = attempt.answers.find((a) => a.questionId === question.id)
    if (!answer) continue

    if (question.questionType === 'SHORT') {
      answerUpdates.push(
        prisma.quizAnswer.update({
          where: { id: answer.id },
          data: { isCorrect: null, marksAwarded: 0 },
        })
      )
      continue
    }

    const selected = question.options.find((o) => o.id === answer.selectedOptionId)
    const isCorrect = Boolean(selected?.isCorrect)
    const marks = isCorrect ? Number(question.marks) : 0
    autoMarks += marks
    answerUpdates.push(
      prisma.quizAnswer.update({
        where: { id: answer.id },
        data: { isCorrect, marksAwarded: marks },
      })
    )
  }

  await Promise.all(answerUpdates)

  const totalMarks = Number(attempt.quiz.totalMarks) || attempt.quiz.questions.reduce((s, q) => s + Number(q.marks), 0)
  const percentage = totalMarks > 0 ? Math.round((autoMarks / totalMarks) * 10000) / 100 : 0
  const isPassed = autoMarks >= Number(attempt.quiz.passingMarks)

  const updated = await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      submittedAt: now,
      timeSpent,
      isCompleted: true,
      isTimedOut: timedOut,
      totalMarks,
      marksAwarded: autoMarks,
      percentage,
      isPassed,
    },
    include: {
      answers: {
        include: {
          question: { include: { options: true } },
          selectedOption: true,
        },
      },
      quiz: true,
    },
  })

  return updated
}

export async function submitQuiz(attemptId: number, userId: number) {
  await verifyLMSAccess()
  const student = await getStudentFromUser(userId)

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: true },
  })
  if (!attempt || attempt.studentId !== student.id) throw new Error('Unauthorized')

  const updated = await gradeAndCompleteAttempt(attemptId, false)
  revalidateQuizPaths(attempt.quiz.courseId)

  if (!attempt.quiz.showResultsImmediately || !updated) {
    return { submitted: true, showResults: false as const }
  }

  return {
    submitted: true,
    showResults: true as const,
    attempt: {
      id: updated.id,
      marksAwarded: Number(updated.marksAwarded),
      totalMarks: Number(updated.totalMarks),
      percentage: Number(updated.percentage),
      isPassed: updated.isPassed,
      timeSpent: updated.timeSpent,
    },
    results: updated.answers.map((a) => ({
      questionId: a.questionId,
      questionText: a.question.questionText,
      questionType: a.question.questionType,
      marks: Number(a.question.marks),
      marksAwarded: a.marksAwarded != null ? Number(a.marksAwarded) : null,
      isCorrect: a.isCorrect,
      explanation: a.question.explanation,
      selectedOptionId: a.selectedOptionId,
      textAnswer: a.textAnswer,
      correctOption: a.question.options.find((o) => o.isCorrect) ?? null,
      options: a.question.options.map((o) => ({
        id: o.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
      })),
    })),
  }
}

export async function autoSubmitExpiredAttempt(attemptId: number, userId?: number) {
  await verifyLMSAccess()

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: true },
  })
  if (!attempt) throw new Error('Attempt not found')
  if (userId) {
    const student = await getStudentFromUser(userId)
    if (attempt.studentId !== student.id) throw new Error('Unauthorized')
  }
  if (attempt.isCompleted) return { submitted: true, timedOut: true }

  const updated = await gradeAndCompleteAttempt(attemptId, true)
  revalidateQuizPaths(attempt.quiz.courseId)

  if (!attempt.quiz.showResultsImmediately || !updated) {
    return { submitted: true, timedOut: true, showResults: false as const }
  }

  return {
    submitted: true,
    timedOut: true,
    showResults: true as const,
    attempt: {
      id: updated.id,
      marksAwarded: Number(updated.marksAwarded),
      totalMarks: Number(updated.totalMarks),
      percentage: Number(updated.percentage),
      isPassed: updated.isPassed,
      timeSpent: updated.timeSpent,
    },
    results: updated.answers.map((a) => ({
      questionId: a.questionId,
      questionText: a.question.questionText,
      questionType: a.question.questionType,
      marks: Number(a.question.marks),
      marksAwarded: a.marksAwarded != null ? Number(a.marksAwarded) : null,
      isCorrect: a.isCorrect,
      explanation: a.question.explanation,
      selectedOptionId: a.selectedOptionId,
      textAnswer: a.textAnswer,
      correctOption: a.question.options.find((o) => o.isCorrect) ?? null,
      options: a.question.options.map((o) => ({
        id: o.id,
        optionText: o.optionText,
        isCorrect: o.isCorrect,
      })),
    })),
  }
}

export async function gradeShortAnswers(
  data: {
    attemptId: number
    answers: { answerId: number; marksAwarded: number }[]
    feedback?: string
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: data.attemptId },
    include: {
      quiz: { include: { questions: true } },
      answers: { include: { question: true } },
    },
  })
  if (!attempt) throw new Error('Attempt not found')
  await verifyTeacherOwnership(attempt.quiz.courseId, userId, role)

  let manualTotal = 0
  for (const item of data.answers) {
    const answer = attempt.answers.find((a) => a.id === item.answerId)
    if (!answer || answer.question.questionType !== 'SHORT') continue
    const max = Number(answer.question.marks)
    const marks = Math.max(0, Math.min(item.marksAwarded, max))
    manualTotal += marks
    await prisma.quizAnswer.update({
      where: { id: item.answerId },
      data: {
        marksAwarded: marks,
        isCorrect: marks >= max,
      },
    })
  }

  const autoMarks = attempt.answers
    .filter((a) => a.question.questionType !== 'SHORT')
    .reduce((sum, a) => sum + Number(a.marksAwarded ?? 0), 0)

  const totalAwarded = autoMarks + manualTotal
  const totalMarks = Number(attempt.totalMarks) || Number(attempt.quiz.totalMarks)
  const percentage = totalMarks > 0 ? Math.round((totalAwarded / totalMarks) * 10000) / 100 : 0

  const updated = await prisma.quizAttempt.update({
    where: { id: data.attemptId },
    data: {
      marksAwarded: totalAwarded,
      manualMarksAwarded: manualTotal,
      percentage,
      isPassed: totalAwarded >= Number(attempt.quiz.passingMarks),
      teacherFeedback: data.feedback ?? null,
      gradedById: userId,
      gradedAt: new Date(),
    },
  })

  revalidateQuizPaths(attempt.quiz.courseId)
  return updated
}

export async function getQuizResults(quizId: number, userId: number, role: string) {
  await verifyLMSAccess()

  if (role === 'STUDENT') {
    // For student UX we must never hard-fail here.
    // When results aren't available (not completed yet / not released yet),
    // we return `{ attempt: null }` so the client can continue safely.
    let student: Awaited<ReturnType<typeof getStudentFromUser>> | null = null
    try {
      student = await getStudentFromUser(userId)
    } catch {
      return {
        quiz: null,
        attempt: null,
      }
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
    if (!quiz || !quiz.showResultsImmediately) {
      return {
        quiz: quiz
          ? {
              id: quiz.id,
              title: quiz.title,
              showResultsImmediately: quiz.showResultsImmediately,
            }
          : null,
        attempt: null,
      }
    }

    const attempt = await prisma.quizAttempt.findUnique({
      where: { quizId_studentId: { quizId, studentId: student.id } },
      include: {
        answers: {
          include: {
            question: { include: { options: true } },
            selectedOption: true,
          },
        },
      },
    })
    if (!attempt?.isCompleted) {
      return {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          showResultsImmediately: quiz.showResultsImmediately,
        },
        attempt: null,
      }
    }
    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        showResultsImmediately: quiz.showResultsImmediately,
      },
      attempt: {
        id: attempt.id,
        isCompleted: attempt.isCompleted,
        marksAwarded: Number(attempt.marksAwarded),
        totalMarks: Number(attempt.totalMarks),
        percentage: Number(attempt.percentage),
        isPassed: attempt.isPassed,
        timeSpent: attempt.timeSpent,
        answers: attempt.answers.map((a) => ({
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
          textAnswer: a.textAnswer,
          marksAwarded: a.marksAwarded != null ? Number(a.marksAwarded) : null,
          isCorrect: a.isCorrect,
          question: {
            questionText: a.question.questionText,
            questionType: a.question.questionType,
            marks: Number(a.question.marks),
            explanation: a.question.explanation,
            options: a.question.options.map((o) => ({
              id: o.id,
              optionText: o.optionText,
              isCorrect: o.isCorrect,
            })),
          },
        })),
      },
    }
  }

  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')
  const quiz = await getQuizForTeacher(quizId, userId, role)

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId, isCompleted: true },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } },
    },
    orderBy: { submittedAt: 'desc' },
  })

  const scores = attempts.map((a) => Number(a.percentage))
  const avg = scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : 0
  const highest = scores.length ? Math.max(...scores) : 0
  const passed = attempts.filter((a) => a.isPassed).length

  return {
    quiz,
    attempts,
    summary: {
      averageScore: Math.round(avg * 100) / 100,
      highestScore: highest,
      passCount: passed,
      failCount: attempts.length - passed,
      total: attempts.length,
    },
  }
}

export async function getSubmissionsForQuiz(quizId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
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
      questions: true,
    },
  })
  if (!quiz) throw new Error('Quiz not found')
  await verifyTeacherOwnership(quiz.courseId, userId, role)

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, registrationNumber: true } },
      answers: { include: { question: true } },
    },
  })

  const byStudent = new Map(attempts.map((a) => [a.studentId, a]))
  const hasShort = quiz.questions.some((q) => q.questionType === 'SHORT')

  const rows = quiz.course.class.students.map((student) => {
    const attempt = byStudent.get(student.id)
    const needsGrading =
      Boolean(attempt?.isCompleted) &&
      hasShort &&
      attempt!.answers.some(
        (a) =>
          a.question.questionType === 'SHORT' &&
          (a.marksAwarded == null || (attempt!.gradedAt == null && Number(a.marksAwarded) === 0 && a.textAnswer))
      ) &&
      !attempt!.gradedAt

    return {
      student,
      attempt: attempt ?? null,
      status: !attempt
        ? 'NOT_ATTEMPTED'
        : !attempt.isCompleted
          ? 'IN_PROGRESS'
          : needsGrading
            ? 'NEEDS_GRADING'
            : attempt.isPassed
              ? 'PASSED'
              : 'FAILED',
    }
  })

  rows.sort((a, b) => {
    if (!a.attempt?.isCompleted && !b.attempt?.isCompleted) return 0
    if (!a.attempt?.isCompleted) return 1
    if (!b.attempt?.isCompleted) return -1
    return (
      new Date(b.attempt.submittedAt!).getTime() - new Date(a.attempt.submittedAt!).getTime()
    )
  })

  const attempted = rows.filter((r) => r.attempt?.isCompleted).length
  const passed = rows.filter((r) => r.status === 'PASSED').length
  const failed = rows.filter((r) => r.status === 'FAILED').length
  const scores = rows
    .filter((r) => r.attempt?.isCompleted)
    .map((r) => Number(r.attempt!.percentage))
  const avgScore = scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : 0

  return {
    quiz,
    rows,
    summary: {
      total: rows.length,
      attempted,
      notAttempted: rows.length - attempted,
      passed,
      failed,
      avgScore: Math.round(avgScore * 100) / 100,
      needsGrading: rows.filter((r) => r.status === 'NEEDS_GRADING').length,
    },
  }
}

export async function getQuizAttemptDetail(attemptId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      student: true,
      quiz: { include: { course: true, questions: { include: { options: true }, orderBy: { order: 'asc' } } } },
      answers: {
        include: {
          question: { include: { options: true } },
          selectedOption: true,
        },
      },
    },
  })
  if (!attempt) throw new Error('Attempt not found')
  await verifyTeacherOwnership(attempt.quiz.courseId, userId, role)
  return attempt
}

export async function getPendingQuizReviews(userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const courseWhere = role === 'TEACHER' ? { teacherId: userId } : {}
  const quizzes = await prisma.quiz.findMany({
    where: {
      isPublished: true,
      course: courseWhere,
      questions: { some: { questionType: 'SHORT' } },
    },
    include: {
      course: { select: { id: true, title: true } },
      attempts: {
        where: { isCompleted: true, gradedAt: null },
        include: { answers: { include: { question: true } } },
      },
    },
  })

  return quizzes
    .map((q) => {
      const needing = q.attempts.filter((a) =>
        a.answers.some((ans) => ans.question.questionType === 'SHORT' && ans.textAnswer)
      )
      return {
        quizId: q.id,
        title: q.title,
        courseId: q.course.id,
        courseTitle: q.course.title,
        pendingCount: needing.length,
      }
    })
    .filter((q) => q.pendingCount > 0)
}
