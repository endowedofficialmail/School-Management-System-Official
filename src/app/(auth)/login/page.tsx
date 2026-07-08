import { prisma } from '@/lib/prisma'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const school = await prisma.school.findFirst({ select: { name: true, logoUrl: true } })
  const schoolName = school?.name ?? 'School Management System'
  return <LoginForm schoolName={schoolName} schoolLogoUrl={school?.logoUrl ?? null} />
}
