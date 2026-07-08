'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { CertificateStatus, CertificateType } from '@prisma/client'
import { getCertificateById } from '@/lib/actions/certificates'
import PrintWrapper from '@/components/shared/PrintWrapper'

function Watermark({ text }: { text: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-5 print:opacity-10">
      <span className="select-none text-6xl font-bold uppercase tracking-[0.4em] rotate-[-30deg]">
        {text}
      </span>
    </div>
  )
}

export default function PrintCertificatePage() {
  const params = useParams()
  const id = Number(params.id)

  const [data, setData] = React.useState<Awaited<ReturnType<typeof getCertificateById>> | null>(null)

  useEffect(() => {
    getCertificateById(id).then(setData)
  }, [id])

  if (!data || !data.certificate) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>
  }

  const { certificate, school } = data
  const initials = (school?.name || 'School')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

  const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-slate-100 py-6 print:bg-white">
      <PrintWrapper>
        <div className="relative mx-auto max-w-3xl rounded-2xl border border-slate-300 bg-white px-10 py-8 shadow-sm print:shadow-none print:border">
          <Watermark text={school?.name ?? 'School'} />
          {certificate.status === CertificateStatus.REVOKED && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rotate-[-25deg] border-4 border-red-500 px-10 py-4 text-4xl font-extrabold uppercase text-red-500 opacity-40">
                REVOKED
              </div>
            </div>
          )}
          <div className="relative z-10 font-serif">
            {children}
          </div>
        </div>
      </PrintWrapper>
    </div>
  )

  const Header = () => (
    <header className="mb-4 flex items-center justify-between border-b border-slate-300 pb-3">
      <div className="flex items-center gap-3">
        {school?.logoUrl ? (
          <Image
            src={school.logoUrl}
            alt="Logo"
            width={48}
            height={48}
            className="h-12 w-12 rounded-full border border-slate-300 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initials}
          </div>
        )}
        <div>
          <h1 className="text-xl font-extrabold uppercase tracking-wide">{school?.name ?? 'School Name'}</h1>
          <p className="text-[11px] text-slate-600">
            {school?.address ?? 'Address'}{school?.phone ? ` | ${school.phone}` : ''}{school?.email ? ` | ${school.email}` : ''}
          </p>
        </div>
      </div>
      <div className="text-right text-[11px] text-slate-600">
        <div className="font-mono text-xs font-semibold">No: {certificate.certificateNumber}</div>
        <div>Date: {new Date(certificate.issueDate).toLocaleDateString()}</div>
      </div>
    </header>
  )

  const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="mb-3 text-center text-lg font-semibold uppercase tracking-[0.25em]">
      {children}
    </h2>
  )

  const student = certificate.student
  const fullName = `${student.firstName} ${student.lastName}`.toUpperCase()

  if (certificate.type === CertificateType.BIRTH) {
    return (
      <Frame>
        <Header />
        <SectionTitle>Birth Certificate</SectionTitle>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-800">
          <p>This is to certify that:</p>
          <p className="mt-1">
            <span className="font-semibold">Name of Child:</span>{' '}
            <span className="font-bold tracking-wide">{fullName}</span>
          </p>
          <p>
            <span className="font-semibold">Date of Birth:</span>{' '}
            {certificate.birthDate ? new Date(certificate.birthDate).toLocaleDateString() : '—'}
          </p>
          <p>
            <span className="font-semibold">Place of Birth:</span>{' '}
            {certificate.birthPlace || '—'}
          </p>
          <p>
            <span className="font-semibold">Gender:</span>{' '}
            {student.gender === 'MALE' ? 'Male' : 'Female'}
          </p>
          <p className="mt-3">
            <span className="font-semibold">Father&apos;s Name:</span> {certificate.fatherName || student.guardianName}
          </p>
          <p>
            <span className="font-semibold">Father&apos;s CNIC:</span> {certificate.fatherCNIC || '—'}
          </p>
          <p>
            <span className="font-semibold">Father&apos;s Occupation:</span> {certificate.fatherOccupation || '—'}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Mother&apos;s Name:</span> {certificate.motherName || '—'}
          </p>
          <p>
            <span className="font-semibold">Mother&apos;s CNIC:</span> {certificate.motherCNIC || '—'}
          </p>
          {certificate.notes && (
            <p className="mt-3 italic text-slate-700">{certificate.notes}</p>
          )}
          <p className="mt-4">
            The above information has been verified from the school records and is certified to be correct.
          </p>
        </div>
        <footer className="mt-10 grid grid-cols-2 gap-10 text-xs text-slate-700">
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2 font-medium">Class Teacher</div>
            <div className="text-[11px] text-slate-500">Signature &amp; Stamp</div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2 font-medium">Principal</div>
            <div className="text-[11px] text-slate-500">Signature &amp; Stamp</div>
          </div>
        </footer>
      </Frame>
    )
  }

  if (certificate.type === CertificateType.SCHOOL_LEAVING) {
    return (
      <Frame>
        <Header />
        <SectionTitle>School Leaving Certificate</SectionTitle>
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-slate-800">
          <p>This is to certify that:</p>
          <p>
            <span className="font-semibold">Name:</span>{' '}
            <span className="font-bold tracking-wide">{fullName}</span>
          </p>
          <p>
            <span className="font-semibold">Registration No:</span>{' '}
            {student.registrationNumber}
          </p>
          <p>
            <span className="font-semibold">Father&apos;s Name:</span> {certificate.fatherName || student.guardianName}
          </p>
          <p>
            <span className="font-semibold">Date of Birth:</span>{' '}
            {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'}
          </p>
          <p>
            <span className="font-semibold">Class Last Attended:</span>{' '}
            {certificate.lastClass || `${student.class.name} - ${student.class.section}`}
          </p>
          <p>
            <span className="font-semibold">Date of Leaving:</span>{' '}
            {certificate.dateOfLeaving ? new Date(certificate.dateOfLeaving).toLocaleDateString() : '—'}
          </p>
          <p className="mt-2">
            <span className="font-semibold">Reason for Leaving:</span>{' '}
            {certificate.reasonForLeaving || '—'}
          </p>
          <p className="mt-2">
            <span className="font-semibold">Conduct During Stay at School:</span>{' '}
            {certificate.conductDuringStay || '—'}
          </p>
          {certificate.notes && (
            <p className="mt-3 italic text-slate-700">{certificate.notes}</p>
          )}
          <p className="mt-4">
            We wish him/her all the best in future endeavors.
          </p>
        </div>
        <footer className="mt-10 grid grid-cols-2 gap-10 text-xs text-slate-700">
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2 font-medium">Class Teacher</div>
            <div className="text-[11px] text-slate-500">Signature &amp; Stamp</div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-400 pt-2 font-medium">Principal</div>
            <div className="text-[11px] text-slate-500">Signature &amp; Stamp</div>
          </div>
        </footer>
      </Frame>
    )
  }

  // CHARACTER
  return (
    <Frame>
      <Header />
      <SectionTitle>Character Certificate</SectionTitle>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-800">
        <p>To Whom It May Concern,</p>
        <p>
          This is to certify that <span className="font-semibold">{fullName}</span>, son/daughter of{' '}
          {certificate.fatherName || student.guardianName}, bearing Registration No.{' '}
          {student.registrationNumber}, was a student of this institution.
        </p>
        <p>
          During his/her stay at {school?.name ?? 'this institution'},{' '}
          {certificate.characterRemarks || 'he/she bore good moral character and was a disciplined student.'}
        </p>
        <p>
          This certificate is being issued on his/her request for{' '}
          {certificate.purpose || 'admission/employment purposes'}.
        </p>
        {certificate.notes && (
          <p className="mt-3 italic text-slate-700">{certificate.notes}</p>
        )}
        <p className="mt-4">
          We wish him/her every success in life.
        </p>
      </div>
      <footer className="mt-10 grid grid-cols-2 gap-10 text-xs text-slate-700">
        <div className="text-center">
          <div className="border-t border-slate-400 pt-2 font-medium">Class Teacher</div>
          <div className="text-[11px] text-slate-500">Signature &amp; Stamp</div>
        </div>
        <div className="text-center">
          <div className="border-t border-slate-400 pt-2 font-medium">Principal</div>
          <div className="text-[11px] text-slate-500">Signature &amp; Stamp</div>
        </div>
      </footer>
    </Frame>
  )
}

