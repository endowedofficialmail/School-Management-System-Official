import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create default school
  const school = await prisma.school.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'My School',
      address: 'School Address, City',
      phone: '0300-0000000',
      email: 'school@example.com',
    },
  })
  console.log('School created:', school.name)

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@school.com',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log('Admin created:', admin.email)

  // Create a default academic year
  const academicYear = await prisma.academicYear.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: '2024-2025',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2025-03-31'),
      isActive: true,
    },
  })
  console.log('Academic year created:', academicYear.name)

  // Create sample classes
  const classNames = [
    { name: 'Grade 1', section: 'A' },
    { name: 'Grade 2', section: 'A' },
    { name: 'Grade 3', section: 'A' },
  ]

  for (const c of classNames) {
    await prisma.class.upsert({
      where: {
        name_section_academicYearId: {
          name: c.name,
          section: c.section,
          academicYearId: academicYear.id,
        },
      },
      update: {},
      create: {
        name: c.name,
        section: c.section,
        academicYearId: academicYear.id,
      },
    })
  }
  console.log('Sample classes created')

  console.log('Seeding complete.')
  console.log('---')
  console.log('Login with: admin@school.com / admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
