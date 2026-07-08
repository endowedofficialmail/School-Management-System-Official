export type UserRole = 'ADMIN' | 'TEACHER' | 'RECEPTIONIST' | 'PARENT' | 'STUDENT'

export type StudentStatus = 'ACTIVE' | 'LEFT' | 'GRADUATED'

export type FeeFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ONETIME'

export type InvoiceStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'WAIVED'

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE'

export type Gender = 'MALE' | 'FEMALE'

export interface NavItem {
  title: string
  href: string
  icon: string
  roles: UserRole[]
}
