import { NextResponse } from 'next/server'

const CSV_TEMPLATE = `# Student Import Template
# Required: First Name, Last Name, Gender (Male/Female), Class Name, Section, Guardian Name, Guardian Phone
# Optional: Guardian CNIC, Date of Birth (YYYY-MM-DD), Address, Admission Date (YYYY-MM-DD), Status (Active/Left/Graduated)
# Class Name and Section must match an existing class in the active academic year
First Name,Last Name,Gender,Class Name,Section,Guardian Name,Guardian Phone,Guardian CNIC,Date of Birth,Address,Admission Date,Status
Muhammad,Ali,Male,Grade 1,A,Muhammad Khan,0300-1234567,37405-1234567-1,2015-03-15,House 123 Street 4,2024-04-01,Active
Sara,Ahmed,Female,Grade 2,B,Ahmed Ali,0311-9876543,,2014-07-22,,2024-04-01,Active
Hassan,Raza,Male,Grade 1,A,Ali Raza,0321-5556677,,,Street 9 Block B,2024-04-01,Active
`

export async function GET() {
  return new NextResponse(CSV_TEMPLATE, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="student-import-template.csv"',
    },
  })
}
