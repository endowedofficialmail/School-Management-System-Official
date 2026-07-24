'use server'

import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import {
  requireParentChildLink,
} from '@/lib/security'

const SCHOOL_ID = 1
const LMS_COOKIE = 'lms-enabled'

// ─── Security helpers ─────────────────────────────────────────────────────────

export async function getLMSSettings() {
  const settings = await prisma.lMSSettings.findUnique({
    where: { schoolId: SCHOOL_ID },
  })
  if (!settings) return { isEnabled: false, schoolId: SCHOOL_ID }
  return settings
}

async function verifyLMSAccess() {
  const settings = await getLMSSettings()
  if (!settings.isEnabled) throw new Error('LMS is not enabled for this school')
}

async function verifyTeacherOwnership(courseId: number, teacherId: number, role: string) {
  if (role === 'ADMIN') return
  const course = await prisma.course.findUnique({ where: { id: courseId } })
  if (!course) throw new Error('Course not found')
  if (course.teacherId !== teacherId) {
    throw new Error('Unauthorized: You do not own this course')
  }
}

/** Class-based access: student sees a course iff student.classId === course.classId and it is published. */
async function verifyStudentCourseAccess(courseId: number, userId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { classId: true, isPublished: true },
  })
  if (!course) throw new Error('Course not found')
  if (!course.isPublished) throw new Error('This course is not yet published')

  const profile = await prisma.studentPortalProfile.findUnique({
    where: { userId },
    include: { student: { select: { classId: true } } },
  })
  if (!profile) throw new Error('Student profile not found')

  if (profile.student.classId !== course.classId) {
    throw new Error('Unauthorized: This course is not for your class')
  }
  return true
}

async function verifyStudentInCourseClass(courseId: number, studentId: number) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { classId: true, isPublished: true },
  })
  if (!course) throw new Error('Course not found')
  if (!course.isPublished) throw new Error('This course is not yet published')

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  })
  if (!student) throw new Error('Student not found')
  if (student.classId !== course.classId) {
    throw new Error('Unauthorized: This course is not for your class')
  }
  return true
}

async function verifyParentChildAccess(studentId: number, parentUserId: number) {
  await requireParentChildLink(studentId, parentUserId)
}

async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error('Not authenticated')
  return {
    userId: Number(session.user.id),
    role: session.user.role as string,
    session,
  }
}

function isValidVideoUrl(url: string) {
  return (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('drive.google.com')
  )
}

function revalidateLMSPaths() {
  revalidatePath('/settings/school')
  revalidatePath('/dashboard')
  revalidatePath('/lms')
  revalidatePath('/lms/courses')
  revalidatePath('/lms/announcements')
  revalidatePath('/lms/homework')
  revalidatePath('/portal/student')
  revalidatePath('/portal/parent')
}

// ─── LMS Settings ─────────────────────────────────────────────────────────────

export async function toggleLMS(enabled: boolean) {
  const { role } = await getSessionUser()
  if (role !== 'ADMIN') throw new Error('Unauthorized')

  await prisma.lMSSettings.upsert({
    where: { schoolId: SCHOOL_ID },
    update: { isEnabled: enabled },
    create: { schoolId: SCHOOL_ID, isEnabled: enabled },
  })

  cookies().set(LMS_COOKIE, enabled ? 'true' : 'false', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  })

  revalidateLMSPaths()
  return { isEnabled: enabled }
}

// ─── Course actions ───────────────────────────────────────────────────────────

const courseListInclude = {
  subject: { select: { id: true, name: true } },
  class: { select: { id: true, name: true, section: true } },
  teacher: { select: { id: true, name: true } },
  _count: { select: { lessons: true, homeworks: true } },
} as const

const studentCourseListInclude = {
  subject: { select: { id: true, name: true } },
  class: { select: { id: true, name: true, section: true } },
  teacher: { select: { id: true, name: true } },
  _count: {
    select: {
      lessons: { where: { isPublished: true } },
      homeworks: true,
    },
  },
} as const

export async function getCourses(filters?: {
  classId?: number
  teacherId?: number
  isPublished?: boolean
  userId?: number
  role?: string
  studentId?: number
}) {
  await verifyLMSAccess()
  const role = filters?.role
  const userId = filters?.userId

  // Students see all published courses for their class — no enrollment/membership lists
  if (role === 'STUDENT') {
    if (!userId) throw new Error('User ID required')
    const profile = await prisma.studentPortalProfile.findUnique({
      where: { userId },
      include: { student: { select: { classId: true } } },
    })
    if (!profile) throw new Error('Student profile not found')

    return prisma.course.findMany({
      where: {
        classId: profile.student.classId,
        isPublished: true,
      },
      include: studentCourseListInclude,
      orderBy: { createdAt: 'desc' },
    })
  }

  if (role === 'PARENT') {
    if (!userId) throw new Error('User ID required')
    const parent = await prisma.parent.findUnique({
      where: { userId },
      include: {
        students: {
          include: { student: { select: { classId: true } } },
        },
      },
    })
    if (!parent || parent.students.length === 0) {
      throw new Error('No linked students found')
    }

    const targetStudentLink = filters?.studentId
      ? parent.students.find((s) => s.studentId === filters.studentId)
      : parent.students[0]
    if (!targetStudentLink) throw new Error('Student not linked to this parent')

    return prisma.course.findMany({
      where: {
        classId: targetStudentLink.student.classId,
        isPublished: true,
      },
      include: studentCourseListInclude,
      orderBy: { createdAt: 'desc' },
    })
  }

  const where: Record<string, unknown> = {}
  if (filters?.classId) where.classId = filters.classId
  if (filters?.isPublished !== undefined) where.isPublished = filters.isPublished

  if (role === 'TEACHER' && userId) {
    where.teacherId = userId
  } else if (filters?.teacherId) {
    where.teacherId = filters.teacherId
  }

  return prisma.course.findMany({
    where,
    include: courseListInclude,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCourseById(
  courseId: number,
  requestingUserId: number,
  role: string
) {
  await verifyLMSAccess()

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      subject: true,
      class: true,
      teacher: { select: { id: true, name: true } },
      lessons: { orderBy: { order: 'asc' } },
      announcements: { orderBy: { createdAt: 'desc' } },
      homeworks: { orderBy: { dueDate: 'asc' } },
    },
  })

  if (!course) throw new Error('Course not found')

  if (role === 'ADMIN') {
    return course
  }
  if (role === 'TEACHER') {
    if (course.teacherId !== requestingUserId) throw new Error('Unauthorized')
    return course
  }
  if (role === 'STUDENT') {
    await verifyStudentCourseAccess(courseId, requestingUserId)
    return {
      ...course,
      lessons: course.lessons.filter((l) => l.isPublished),
    }
  }
  if (role === 'PARENT') {
    const parent = await prisma.parent.findUnique({
      where: { userId: requestingUserId },
      include: { students: { include: { student: true } } },
    })
    if (!parent || parent.students.length === 0) throw new Error('Unauthorized')
    const child = parent.students[0].student
    await verifyStudentInCourseClass(courseId, child.id)
    return {
      ...course,
      lessons: course.lessons.filter((l) => l.isPublished),
    }
  }

  throw new Error('Unauthorized')
}

export async function createCourse(
  data: {
    title: string
    description?: string
    subjectId: number
    classId: number
    teacherId: number
  },
  adminOrTeacherUserId: number,
  role: string
) {
  await verifyLMSAccess()

  if (role === 'TEACHER' && data.teacherId !== adminOrTeacherUserId) {
    throw new Error('Unauthorized')
  }
  if (role !== 'ADMIN' && role !== 'TEACHER') {
    throw new Error('Unauthorized')
  }

  const subject = await prisma.subject.findFirst({
    where: { id: data.subjectId, classId: data.classId },
  })
  if (!subject) throw new Error('Subject does not belong to the selected class')

  const course = await prisma.course.create({
    data: {
      title: data.title,
      description: data.description,
      subjectId: data.subjectId,
      classId: data.classId,
      teacherId: data.teacherId,
      isPublished: false,
    },
  })

  revalidateLMSPaths()
  return course
}

export async function updateCourse(
  courseId: number,
  data: { title?: string; description?: string; isPublished?: boolean },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  await verifyTeacherOwnership(courseId, userId, role)

  const course = await prisma.course.update({
    where: { id: courseId },
    data,
  })

  revalidateLMSPaths()
  return course
}

export async function publishCourse(courseId: number, userId: number, role: string) {
  await verifyLMSAccess()
  await verifyTeacherOwnership(courseId, userId, role)

  const publishedLessons = await prisma.lesson.count({
    where: { courseId, isPublished: true },
  })
  if (publishedLessons < 1) {
    throw new Error('Course must have at least 1 published lesson before publishing')
  }

  const course = await prisma.course.update({
    where: { id: courseId },
    data: { isPublished: true },
  })

  revalidateLMSPaths()
  return course
}

export async function deleteCourse(courseId: number, userId: number, role: string) {
  await verifyLMSAccess()
  if (role !== 'ADMIN') throw new Error('Unauthorized')

  await prisma.course.delete({ where: { id: courseId } })
  revalidateLMSPaths()
}

// ─── Lesson actions ───────────────────────────────────────────────────────────

export async function createLesson(
  data: {
    courseId: number
    title: string
    content?: string
    videoUrl?: string
    pdfUrl?: string
    order?: number
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  await verifyTeacherOwnership(data.courseId, userId, role)

  if (data.videoUrl && !isValidVideoUrl(data.videoUrl)) {
    throw new Error('Video URL must be a YouTube or Google Drive link')
  }
  if (!data.content && !data.videoUrl && !data.pdfUrl) {
    throw new Error('At least one of content, video URL, or PDF URL is required')
  }

  const maxOrder = await prisma.lesson.aggregate({
    where: { courseId: data.courseId },
    _max: { order: true },
  })

  const lesson = await prisma.lesson.create({
    data: {
      courseId: data.courseId,
      title: data.title,
      content: data.content,
      videoUrl: data.videoUrl,
      pdfUrl: data.pdfUrl,
      order: data.order ?? (maxOrder._max.order ?? -1) + 1,
      isPublished: false,
    },
  })

  revalidateLMSPaths()
  return lesson
}

export async function updateLesson(
  lessonId: number,
  data: {
    title?: string
    content?: string
    videoUrl?: string
    pdfUrl?: string
    isPublished?: boolean
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } })
  if (!lesson) throw new Error('Lesson not found')
  await verifyTeacherOwnership(lesson.courseId, userId, role)

  if (data.videoUrl && !isValidVideoUrl(data.videoUrl)) {
    throw new Error('Video URL must be a YouTube or Google Drive link')
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data,
  })

  revalidateLMSPaths()
  return updated
}

export async function deleteLesson(lessonId: number, userId: number, role: string) {
  await verifyLMSAccess()
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } })
  if (!lesson) throw new Error('Lesson not found')
  await verifyTeacherOwnership(lesson.courseId, userId, role)

  await prisma.lesson.delete({ where: { id: lessonId } })
  revalidateLMSPaths()
}

export async function publishLesson(lessonId: number, userId: number, role: string) {
  await verifyLMSAccess()
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } })
  if (!lesson) throw new Error('Lesson not found')
  await verifyTeacherOwnership(lesson.courseId, userId, role)

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: { isPublished: true },
  })

  revalidateLMSPaths()
  return updated
}

export async function reorderLessons(
  courseId: number,
  lessonIds: number[],
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  await verifyTeacherOwnership(courseId, userId, role)

  await prisma.$transaction(
    lessonIds.map((id, index) =>
      prisma.lesson.update({ where: { id }, data: { order: index } })
    )
  )

  revalidateLMSPaths()
}

export async function markLessonComplete(lessonId: number, userId: number) {
  await verifyLMSAccess()

  const profile = await prisma.studentPortalProfile.findUnique({
    where: { userId },
    include: { student: { select: { classId: true, id: true } } },
  })
  if (!profile) throw new Error('Student profile not found')

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { course: { select: { classId: true, isPublished: true } } },
  })
  if (!lesson) throw new Error('Lesson not found')
  if (!lesson.course.isPublished) throw new Error('Course not published')
  if (lesson.course.classId !== profile.student.classId) {
    throw new Error('Unauthorized: This lesson is not for your class')
  }
  if (!lesson.isPublished) throw new Error('This lesson is not published yet')

  const completion = await prisma.lessonCompletion.upsert({
    where: {
      lessonId_studentId: {
        lessonId,
        studentId: profile.student.id,
      },
    },
    update: { completedAt: new Date() },
    create: {
      lessonId,
      studentId: profile.student.id,
      completedAt: new Date(),
    },
  })

  revalidatePath('/portal/student')
  revalidateLMSPaths()
  return completion
}

export async function getStudentProgress(
  courseId: number,
  studentId: number,
  requestingUserId?: number,
  role?: string
) {
  await verifyLMSAccess()

  if (role === 'STUDENT' && requestingUserId) {
    const profile = await prisma.studentPortalProfile.findUnique({
      where: { userId: requestingUserId },
    })
    if (!profile || profile.studentId !== studentId) {
      throw new Error('Unauthorized')
    }
  }
  if (role === 'PARENT' && requestingUserId) {
    await requireParentChildLink(studentId, requestingUserId)
  }

  const lessons = await prisma.lesson.findMany({
    where: { courseId, isPublished: true },
    orderBy: { order: 'asc' },
  })

  const completions = await prisma.lessonCompletion.findMany({
    where: {
      lessonId: { in: lessons.map((l) => l.id) },
      studentId,
    },
  })

  const completedIds = new Set(completions.map((c) => c.lessonId))
  const totalLessons = lessons.length
  const completedLessons = completions.length
  const completionPercentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return {
    totalLessons,
    completedLessons,
    completionPercentage,
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      order: lesson.order,
      completed: completedIds.has(lesson.id),
      completedAt:
        completions.find((c) => c.lessonId === lesson.id)?.completedAt ?? null,
    })),
  }
}

// ─── Announcement actions ─────────────────────────────────────────────────────

export async function createAnnouncement(
  data: {
    title: string
    content: string
    courseId?: number | null
    classId?: number | null
    isImportant: boolean
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()

  if (role === 'RECEPTIONIST' || role === 'STUDENT' || role === 'PARENT') {
    throw new Error('Unauthorized')
  }

  if (role === 'TEACHER') {
    if (data.courseId) {
      await verifyTeacherOwnership(data.courseId, userId, role)
    } else if (data.classId) {
      const teachesClass = await prisma.class.findFirst({
        where: {
          id: data.classId,
          OR: [
            { classTeacherId: userId },
            { subjects: { some: { teacherId: userId } } },
            { courses: { some: { teacherId: userId } } },
          ],
        },
      })
      if (!teachesClass) throw new Error('Unauthorized')
    } else {
      throw new Error('Teachers cannot post school-wide announcements')
    }
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: data.title,
      content: data.content,
      courseId: data.courseId ?? null,
      classId: data.classId ?? null,
      postedById: userId,
      isImportant: data.isImportant,
    },
  })

  revalidateLMSPaths()
  return announcement
}

export async function getAnnouncements(filters: {
  classId?: number
  courseId?: number
  userId: number
  role: string
  studentId?: number
  limit?: number
}) {
  await verifyLMSAccess()

  const { userId, role } = filters

  if (role === 'STUDENT') {
    const profile = await prisma.studentPortalProfile.findUnique({
      where: { userId },
      include: { student: { select: { classId: true } } },
    })
    if (!profile) throw new Error('Student profile not found')

    const studentClassId = profile.student.classId
    const courseIds = (
      await prisma.course.findMany({
        where: { classId: studentClassId, isPublished: true },
        select: { id: true },
      })
    ).map((c) => c.id)

    return prisma.announcement.findMany({
      where: {
        OR: [
          { classId: null, courseId: null },
          { classId: studentClassId },
          ...(courseIds.length > 0 ? [{ courseId: { in: courseIds } }] : []),
        ],
      },
      include: {
        postedBy: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
        class: { select: { id: true, name: true, section: true } },
        readReceipts: { where: { userId } },
        _count: { select: { readReceipts: true } },
      },
      orderBy: [{ isImportant: 'desc' }, { createdAt: 'desc' }],
      take: filters.limit,
    })
  }

  if (role === 'PARENT') {
    const targetStudentId = filters.studentId
    if (!targetStudentId) throw new Error('Student ID required')
    await requireParentChildLink(targetStudentId, userId)

    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
      select: { classId: true },
    })
    if (!student) throw new Error('Student not found')

    const courseIds = (
      await prisma.course.findMany({
        where: { classId: student.classId, isPublished: true },
        select: { id: true },
      })
    ).map((c) => c.id)

    return prisma.announcement.findMany({
      where: {
        OR: [
          { classId: null, courseId: null },
          { classId: student.classId },
          ...(courseIds.length > 0 ? [{ courseId: { in: courseIds } }] : []),
        ],
      },
      include: {
        postedBy: { select: { id: true, name: true } },
        course: { select: { id: true, title: true } },
        class: { select: { id: true, name: true, section: true } },
        readReceipts: { where: { userId } },
        _count: { select: { readReceipts: true } },
      },
      orderBy: [{ isImportant: 'desc' }, { createdAt: 'desc' }],
      take: filters.limit,
    })
  }

  const where: Record<string, unknown> = {}
  if (filters.courseId) where.courseId = filters.courseId
  if (filters.classId) where.classId = filters.classId

  if (role === 'TEACHER') {
    where.OR = [
      { postedById: userId },
      { course: { teacherId: userId } },
      {
        class: {
          OR: [
            { classTeacherId: userId },
            { subjects: { some: { teacherId: userId } } },
          ],
        },
      },
    ]
  }

  return prisma.announcement.findMany({
    where,
    include: {
      postedBy: { select: { id: true, name: true } },
      course: { select: { id: true, title: true } },
      class: { select: { id: true, name: true, section: true } },
      readReceipts: { where: { userId } },
      _count: { select: { readReceipts: true } },
    },
    orderBy: [{ isImportant: 'desc' }, { createdAt: 'desc' }],
    take: filters.limit,
  })
}

export async function markAnnouncementRead(announcementId: number, userId: number) {
  await verifyLMSAccess()

  await prisma.announcementReadReceipt.upsert({
    where: { announcementId_userId: { announcementId, userId } },
    update: { readAt: new Date() },
    create: { announcementId, userId },
  })

  revalidateLMSPaths()
}

export async function getAnnouncementReadReceipts(
  announcementId: number,
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    include: {
      course: { include: { class: { include: { students: { where: { status: 'ACTIVE' } } } } } },
      class: { include: { students: { where: { status: 'ACTIVE' } } } },
      readReceipts: { include: { user: { select: { id: true, name: true } } } },
    },
  })

  if (!announcement) throw new Error('Announcement not found')

  if (role === 'TEACHER') {
    if (announcement.postedById !== userId) {
      if (announcement.course && announcement.course.teacherId !== userId) {
        throw new Error('Unauthorized')
      }
    }
  }

  let students = announcement.class?.students ?? announcement.course?.class.students ?? []
  if (!announcement.classId && !announcement.courseId) {
    students = await prisma.student.findMany({ where: { status: 'ACTIVE' } })
  }

  const studentUserIds = await prisma.studentPortalProfile.findMany({
    where: { studentId: { in: students.map((s) => s.id) } },
    include: { user: { select: { id: true, name: true } } },
  })

  const parentUsers = await prisma.parentStudent.findMany({
    where: { studentId: { in: students.map((s) => s.id) } },
    include: { parent: { include: { user: { select: { id: true, name: true } } } } },
  })

  const allUsers = [
    ...studentUserIds.map((p) => p.user),
    ...parentUsers.map((p) => p.parent.user),
  ]

  const readUserIds = new Set(announcement.readReceipts.map((r) => r.userId))
  const read = allUsers.filter((u) => readUserIds.has(u.id))
  const unread = allUsers.filter((u) => !readUserIds.has(u.id))

  return { read, unread, total: allUsers.length, readCount: read.length }
}

export async function deleteAnnouncement(
  announcementId: number,
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
  })
  if (!announcement) throw new Error('Announcement not found')
  if (role !== 'ADMIN' && announcement.postedById !== userId) {
    throw new Error('Unauthorized')
  }

  await prisma.announcement.delete({ where: { id: announcementId } })
  revalidateLMSPaths()
}

// ─── Homework actions ─────────────────────────────────────────────────────────

export async function createHomework(
  data: {
    courseId: number
    title: string
    description?: string
    dueDate: Date
  },
  userId: number,
  role: string
) {
  await verifyLMSAccess()

  if (role === 'STUDENT' || role === 'PARENT' || role === 'RECEPTIONIST') {
    throw new Error('Unauthorized')
  }

  if (role === 'TEACHER') {
    await verifyTeacherOwnership(data.courseId, userId, role)
  }

  if (new Date(data.dueDate) <= new Date()) {
    throw new Error('Due date must be in the future')
  }

  const homework = await prisma.homework.create({
    data: {
      courseId: data.courseId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      postedById: userId,
    },
  })

  revalidateLMSPaths()
  return homework
}

export async function getHomework(filters: {
  courseId?: number
  classId?: number
  userId: number
  role: string
  studentId?: number
}) {
  await verifyLMSAccess()

  const { userId, role } = filters
  const now = new Date()

  function mapHomework<T extends {
    dueDate: Date
    completions: Array<{ studentId: number; isDone: boolean; markedAt: Date | null }>
  }>(homeworks: T[], targetStudentId?: number) {
    return homeworks.map((hw) => {
      const dueDate = new Date(hw.dueDate)
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const studentCompletion = targetStudentId
        ? hw.completions.find((c) => c.studentId === targetStudentId)
        : null

      return {
        ...hw,
        isOverdue: dueDate < now,
        daysUntilDue,
        isDone: studentCompletion?.isDone ?? false,
        markedAt: studentCompletion?.markedAt ?? null,
      }
    })
  }

  if (role === 'STUDENT') {
    const profile = await prisma.studentPortalProfile.findUnique({
      where: { userId },
      include: { student: { select: { classId: true, id: true } } },
    })
    if (!profile) throw new Error('Student profile not found')

    const studentClassId = profile.student.classId
    const studentId = profile.student.id

    const homeworkList = await prisma.homework.findMany({
      where: {
        course: {
          classId: studentClassId,
          isPublished: true,
        },
      },
      include: {
        course: {
          include: {
            subject: { select: { name: true } },
            class: { select: { id: true, name: true, section: true } },
          },
        },
        completions: { where: { studentId } },
        postedBy: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    return mapHomework(homeworkList, studentId)
  }

  if (role === 'PARENT') {
    const targetStudentId = filters.studentId
    if (!targetStudentId) throw new Error('Student ID required for parent access')
    await requireParentChildLink(targetStudentId, userId)

    const student = await prisma.student.findUnique({
      where: { id: targetStudentId },
      select: { classId: true },
    })
    if (!student) throw new Error('Student not found')

    const homeworkList = await prisma.homework.findMany({
      where: {
        course: {
          classId: student.classId,
          isPublished: true,
        },
      },
      include: {
        course: {
          include: {
            subject: { select: { name: true } },
            class: { select: { id: true, name: true, section: true } },
          },
        },
        completions: { where: { studentId: targetStudentId } },
        postedBy: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    })

    return mapHomework(homeworkList, targetStudentId)
  }

  const courseWhere: Record<string, unknown> = {}
  if (filters.courseId) courseWhere.id = filters.courseId
  if (filters.classId) courseWhere.classId = filters.classId
  if (role === 'TEACHER') courseWhere.teacherId = userId

  const homeworks = await prisma.homework.findMany({
    where: { course: courseWhere },
    include: {
      course: {
        include: {
          subject: { select: { name: true } },
          class: { select: { id: true, name: true, section: true } },
        },
      },
      completions: filters.studentId
        ? { where: { studentId: filters.studentId } }
        : true,
      postedBy: { select: { name: true } },
    },
    orderBy: { dueDate: 'asc' },
  })

  return mapHomework(homeworks, filters.studentId)
}

export async function updateHomework(
  homeworkId: number,
  data: { title?: string; description?: string; dueDate?: Date },
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: { course: true },
  })
  if (!homework) throw new Error('Homework not found')
  await verifyTeacherOwnership(homework.courseId, userId, role)

  const updated = await prisma.homework.update({
    where: { id: homeworkId },
    data,
  })

  revalidateLMSPaths()
  return updated
}

export async function deleteHomework(homeworkId: number, userId: number, role: string) {
  await verifyLMSAccess()
  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
  })
  if (!homework) throw new Error('Homework not found')
  await verifyTeacherOwnership(homework.courseId, userId, role)

  await prisma.homework.delete({ where: { id: homeworkId } })
  revalidateLMSPaths()
}

export async function markHomeworkDone(homeworkId: number, userId: number) {
  await verifyLMSAccess()

  const profile = await prisma.studentPortalProfile.findUnique({
    where: { userId },
    include: { student: { select: { classId: true, id: true } } },
  })
  if (!profile) throw new Error('Student profile not found')

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: { course: { select: { classId: true, isPublished: true } } },
  })
  if (!homework) throw new Error('Homework not found')
  if (homework.course.classId !== profile.student.classId) {
    throw new Error('Unauthorized')
  }

  const completion = await prisma.homeworkCompletion.upsert({
    where: {
      homeworkId_studentId: {
        homeworkId,
        studentId: profile.student.id,
      },
    },
    update: { isDone: true, markedAt: new Date() },
    create: {
      homeworkId,
      studentId: profile.student.id,
      isDone: true,
      markedAt: new Date(),
    },
  })

  revalidatePath('/portal/student')
  revalidateLMSPaths()
  return completion
}

export async function unmarkHomeworkDone(homeworkId: number, userId: number) {
  await verifyLMSAccess()

  const profile = await prisma.studentPortalProfile.findUnique({
    where: { userId },
    include: { student: { select: { classId: true, id: true } } },
  })
  if (!profile) throw new Error('Student profile not found')

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
    include: { course: { select: { classId: true, isPublished: true } } },
  })
  if (!homework) throw new Error('Homework not found')
  if (homework.course.classId !== profile.student.classId) {
    throw new Error('Unauthorized')
  }

  const completion = await prisma.homeworkCompletion.upsert({
    where: {
      homeworkId_studentId: {
        homeworkId,
        studentId: profile.student.id,
      },
    },
    update: { isDone: false, markedAt: null },
    create: {
      homeworkId,
      studentId: profile.student.id,
      isDone: false,
    },
  })

  revalidatePath('/portal/student')
  revalidateLMSPaths()
  return completion
}

export async function getHomeworkCompletionStatus(
  homeworkId: number,
  userId: number,
  role: string
) {
  await verifyLMSAccess()
  if (role !== 'ADMIN' && role !== 'TEACHER') throw new Error('Unauthorized')

  const homework = await prisma.homework.findUnique({
    where: { id: homeworkId },
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
        },
      },
      completions: true,
    },
  })

  if (!homework) throw new Error('Homework not found')
  if (role === 'TEACHER' && homework.course.teacherId !== userId) {
    throw new Error('Unauthorized')
  }

  const completionMap = new Map(
    homework.completions.map((c) => [c.studentId, c])
  )

  const students = homework.course.class.students.map((s) => {
    const completion = completionMap.get(s.id)
    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      isDone: completion?.isDone ?? false,
      markedAt: completion?.markedAt ?? null,
    }
  })

  const done = students.filter((s) => s.isDone)
  const notDone = students.filter((s) => !s.isDone)

  return {
    students,
    done,
    notDone,
    counts: { done: done.length, notDone: notDone.length, total: students.length },
  }
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export async function getLMSDashboardStats(userId: number, role: string) {
  await verifyLMSAccess()

  if (role === 'ADMIN') {
    const [totalCourses, publishedCourses, totalLessons, activeStudents, recentAnnouncements] =
      await Promise.all([
        prisma.course.count(),
        prisma.course.count({ where: { isPublished: true } }),
        prisma.lesson.count(),
        prisma.lessonCompletion
          .findMany({ select: { studentId: true }, distinct: ['studentId'] })
          .then((r) => r.length),
        prisma.announcement.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { postedBy: { select: { name: true } } },
        }),
      ])

    return { totalCourses, publishedCourses, totalLessons, activeStudents, recentAnnouncements }
  }

  if (role === 'TEACHER') {
    const myCourses = await prisma.course.findMany({
      where: { teacherId: userId },
      include: {
        _count: { select: { lessons: { where: { isPublished: true } }, homeworks: true } },
        lessons: { where: { isPublished: true }, select: { id: true } },
        homeworks: {
          where: {
            dueDate: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    })

    const courseIds = myCourses.map((c) => c.id)

    const pendingHomework = await prisma.homework.count({
      where: {
        courseId: { in: courseIds },
        completions: { none: { isDone: true } },
      },
    })

    return {
      myCourses: myCourses.length,
      publishedLessons: myCourses.reduce((sum, c) => sum + c._count.lessons, 0),
      homeworkDueThisWeek: myCourses.reduce((sum, c) => sum + c.homeworks.length, 0),
      pendingHomework,
      courses: myCourses,
    }
  }

  throw new Error('Unauthorized')
}

export async function getCourseCompletionStats(courseId: number) {
  await verifyLMSAccess()

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
      lessons: { where: { isPublished: true } },
    },
  })

  if (!course) throw new Error('Course not found')

  const totalLessons = course.lessons.length
  const completions = await prisma.lessonCompletion.findMany({
    where: {
      lessonId: { in: course.lessons.map((l) => l.id) },
      studentId: { in: course.class.students.map((s) => s.id) },
    },
  })

  const byStudent = course.class.students.map((student) => {
    const studentCompletions = completions.filter((c) => c.studentId === student.id)
    const completedCount = studentCompletions.length
    const lastActivity = studentCompletions.sort(
      (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
    )[0]?.completedAt

    return {
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      completedCount,
      totalLessons,
      percentage: totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0,
      lastActivity: lastActivity ?? null,
      completedLessonIds: studentCompletions.map((c) => c.lessonId),
    }
  })

  const studentsWithCompletion = byStudent.filter((s) => s.completedCount > 0).length
  const completionRate =
    course.class.students.length > 0
      ? Math.round((studentsWithCompletion / course.class.students.length) * 100)
      : 0

  return { students: byStudent, totalLessons, completionRate }
}

export async function getTeacherClassesAndSubjects(userId: number, role: string) {
  if (role === 'ADMIN') {
    const classes = await prisma.class.findMany({
      include: { subjects: { include: { teacher: { select: { id: true, name: true } } } } },
      orderBy: { name: 'asc' },
    })
    return classes
  }

  const classes = await prisma.class.findMany({
    where: {
      OR: [
        { classTeacherId: userId },
        { subjects: { some: { teacherId: userId } } },
      ],
    },
    include: {
      subjects: {
        where: { OR: [{ teacherId: userId }, { teacherId: null }] },
        include: { teacher: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return classes
}

export async function getTeachers() {
  return prisma.user.findMany({
    where: { role: 'TEACHER', isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export { verifyStudentCourseAccess, verifyStudentInCourseClass, verifyParentChildAccess }
