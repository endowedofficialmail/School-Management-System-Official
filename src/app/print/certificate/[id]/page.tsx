'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CertificateStatus, CertificateType } from '@prisma/client'
import { getCertificateById } from '@/lib/actions/certificates'
import Barcode from '@/components/shared/Barcode'
import { dateToWords, getDateWithDayName } from '@/lib/utils'

type CertRow = NonNullable<NonNullable<Awaited<ReturnType<typeof getCertificateById>>>['certificate']>
type SchoolRow = NonNullable<Awaited<ReturnType<typeof getCertificateById>>>['school']

type CertData = {
  certificate: CertRow
  school: SchoolRow
}

function underline(value?: string | null, blank = false, minWidth = 180) {
  if (blank || !value) {
    return (
      <span
        style={{
          display: 'inline-block',
          borderBottom: '1px solid #000',
          minWidth,
          height: 14,
          verticalAlign: 'bottom',
        }}
      />
    )
  }
  return (
    <span
      style={{
        display: 'inline-block',
        borderBottom: '1px solid #000',
        minWidth,
        padding: '0 4px',
        fontWeight: 700,
      }}
    >
      {value}
    </span>
  )
}

function Field({
  label,
  value,
  blank,
  suffix,
  wide,
  minWidth,
}: {
  label: string
  value?: string
  blank?: boolean
  suffix?: string
  wide?: boolean
  minWidth?: number
}) {
  return (
    <div style={{ marginBottom: 7, fontSize: 12 }}>
      <span style={{ fontWeight: 600 }}>{label}</span>{' '}
      {underline(value, blank, wide ? 320 : minWidth || 180)}
      {suffix}
    </div>
  )
}

function SchoolLeavingCertificate({
  data,
  style,
}: {
  data: CertData
  style: 'digital' | 'template'
}) {
  const certificate = data.certificate
  const school = data.school
  const student = certificate.student
  const isTemplate = style === 'template'
  const fullName = `${student.firstName} ${student.lastName}`.toUpperCase()
  const father = (certificate.fatherName || student.guardianName || '').toUpperCase()
  const dob = student.dateOfBirth ? new Date(student.dateOfBirth) : null
  const leaving = certificate.dateOfLeaving ? new Date(certificate.dateOfLeaving) : null
  const lastClass = certificate.lastClass || `${student.class.name} - ${student.class.section}`

  return (
    <div
      style={{
        fontFamily: 'Times New Roman, Times, serif',
        border: '2px solid #000',
        padding: '18px 22px',
        maxWidth: 780,
        margin: '0 auto',
        background: '#fff',
        color: '#000',
        fontSize: 13,
        lineHeight: 1.55,
        position: 'relative',
      }}
    >
      {certificate.status === CertificateStatus.REVOKED && (
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 40,
            right: 40,
            bottom: 40,
            transform: 'rotate(-25deg)',
            border: '4px solid #dc2626',
            color: '#dc2626',
            fontSize: 48,
            fontWeight: 900,
            opacity: 0.35,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          REVOKED
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 8 }}>
        <span>Serial No: {certificate.id}</span>
        <span>Reg No: {student.registrationNumber}</span>
        <span>HC-{certificate.id}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        {school?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={school.logoUrl} alt="Logo" style={{ width: 56, height: 56, objectFit: 'contain' }} />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              border: '1px solid #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {(school?.name || 'S')
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {school?.name}
          </div>
          <div style={{ fontSize: 11 }}>
            {school?.address}
            {school?.phone ? `, Ph#: ${school.phone}` : ''}
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: '2px solid #000',
          borderBottom: '2px solid #000',
          padding: '6px 0',
          textAlign: 'center',
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 2 }}>SCHOOL LEAVING CERTIFICATE</div>
        <div style={{ fontSize: 11 }}>(USE BLOCK LETTERS)</div>
      </div>

      <Field label="NAME OF STUDENT (IN ENGLISH)" value={fullName} />
      <Field label="(IN URDU)" value="" blank />
      <Field label="FATHER'S NAME (IN ENGLISH)" value={father} />
      <Field label="(IN URDU)" value="" blank />
      <Field label="ADMISSION NO" value={student.registrationNumber} />
      <Field
        label="ADMITTED IN CLASS"
        value={`${student.class.name} - ${student.class.section}`}
        suffix={` PLAY(F) ____ ON ${student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-GB') : '__________'}`}
      />
      <Field
        label="DATE OF LEAVING THE SCHOOL"
        value={leaving ? leaving.toLocaleDateString('en-GB') : ''}
        blank={isTemplate && !leaving}
      />
      <Field
        label="PASSED/FAILED/PROMOTED TO"
        value={isTemplate ? '' : certificate.conductDuringStay || ''}
        blank={isTemplate}
      />
      <Field label="CLASS IN WHICH STUDYING AT TIME OF LEAVING" value={lastClass} />
      <Field label="RESULT PERCENTAGE" value="" blank />
      <Field
        label="REASON FOR LEAVING"
        value={isTemplate ? '' : certificate.reasonForLeaving || ''}
        blank={isTemplate || !certificate.reasonForLeaving}
      />
      <Field label="DUES HAVE BEEN PAID UPTO" value="" blank />
      <Field
        label="DATE OF BIRTH (IN FIGURES)"
        value={dob ? dob.toLocaleDateString('en-GB') : ''}
        blank={!dob}
      />
      <Field
        label="(IN WORDS)"
        value={!isTemplate && dob ? dateToWords(dob) : ''}
        blank={isTemplate || !dob}
        wide
      />
      <Field label="LAST INSTITUTION ATTENDED" value="" blank />
      <Field label="CASTE" value="" blank minWidth={120} />
      <Field
        label="REMARKS"
        value={isTemplate ? '' : certificate.notes || ''}
        blank={isTemplate || !certificate.notes}
        wide
      />

      <div style={{ borderTop: '2px solid #000', marginTop: 16, paddingTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 28 }}>
          <div style={{ flex: 1 }}>PREPARED BY {underline(null, true, 140)}</div>
          <div style={{ flex: 1 }}>CHECKED BY {underline(null, true, 140)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40, marginTop: 36 }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: 4, marginTop: 28 }}>COUNTER SIGNATURE</div>
          </div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ borderTop: '1px solid #000', paddingTop: 4, marginTop: 28 }}>PRINCIPAL</div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          CERTIFICATE ISSUED ON:{' '}
          {underline(new Date(certificate.issueDate).toLocaleDateString('en-GB'), false, 140)}
        </div>
        <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, textAlign: 'center' }}>
          THIS CERTIFICATE IS ISSUED WITHOUT ALTERATION OR ERASURE
        </div>
      </div>
    </div>
  )
}

function BirthCopy({ data }: { data: CertData }) {
  const certificate = data.certificate
  const school = data.school
  const student = certificate.student
  const fullName = `${student.firstName} ${student.lastName}`.toUpperCase()
  const father = certificate.fatherName || student.guardianName
  const dob = certificate.birthDate
    ? new Date(certificate.birthDate)
    : student.dateOfBirth
      ? new Date(student.dateOfBirth)
      : null
  const genderWord = student.gender === 'MALE' ? 'Son' : 'Daughter'
  const pronoun = student.gender === 'MALE' ? 'His' : 'Her'
  const heShe = student.gender === 'MALE' ? 'He' : 'She'

  return (
    <div
      style={{
        position: 'relative',
        border: '3px double #000',
        outline: '1px solid #000',
        outlineOffset: -8,
        padding: '14px 18px',
        fontFamily: 'Times New Roman, Times, serif',
        fontSize: 12,
        lineHeight: 1.5,
        color: '#000',
        background: '#fff',
        height: '48%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 8, left: 12, fontSize: 16 }}>╔</div>
      <div style={{ position: 'absolute', top: 8, right: 12, fontSize: 16 }}>╗</div>
      <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 16 }}>╚</div>
      <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 16 }}>╝</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div style={{ fontSize: 10 }}>
          <div>Admission No: {student.registrationNumber}</div>
          <div>Student ID: {student.registrationNumber}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700 }}>
            {certificate.certificateNumber}
          </div>
          <Barcode value={certificate.certificateNumber} width={1.1} height={28} fontSize={8} />
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 6 }}>
        {school?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={school.logoUrl}
            alt="Logo"
            style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto' }}
          />
        ) : (
          <div
            style={{
              width: 52,
              height: 52,
              border: '1px solid #000',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
            }}
          >
            {(school?.name || 'S')
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', marginTop: 4 }}>
          {school?.name}
        </div>
        <div style={{ fontSize: 10 }}>{school?.address}</div>
        <div style={{ fontSize: 10 }}>{school?.phone ? `Ph#: ${school.phone}` : ''}</div>
      </div>

      <div
        style={{
          borderTop: '2px solid #000',
          borderBottom: '2px solid #000',
          textAlign: 'center',
          fontWeight: 900,
          letterSpacing: 2,
          padding: '3px 0',
          marginBottom: 8,
        }}
      >
        BIRTH CERTIFICATE
      </div>

      <div style={{ fontSize: 12 }}>
        <p>
          This is to certify that <b>{fullName}</b>
        </p>
        <p>
          {genderWord} of <b>{father}</b>
        </p>
        <p>
          Date of Birth (in figure) <b>{dob ? dob.toLocaleDateString('en-GB') : '—'}</b>
        </p>
        <p>
          (in words) <b>{dob ? dateToWords(dob) : '—'}</b>
        </p>
        <p>
          was admitted into this school on{' '}
          <b>{student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-GB') : '—'}</b>
        </p>
        <p>
          in class{' '}
          <b>
            {student.class.name} - {student.class.section}
          </b>{' '}
          PLAY(F) ______
        </p>
        <p>
          {pronoun} conduct and character{' '}
          {underline(certificate.characterRemarks || null, !certificate.characterRemarks, 200)}
        </p>
        <p>
          {heShe} is studying in Class{' '}
          <b>
            {student.class.name} - {student.class.section}
          </b>
        </p>
        <p style={{ marginTop: 6 }}>
          The above particulars are certified to be correct, according to the register of this school and
          the certificate produced from previous school attended during the school year.
        </p>
        <p style={{ marginTop: 8 }}>
          Dated: <b>{getDateWithDayName(new Date(certificate.issueDate))}</b>
        </p>
        <div style={{ marginTop: 28, width: 160, textAlign: 'center' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: 3 }}>Principal</div>
        </div>
      </div>
    </div>
  )
}

function CharacterCertificate({ data }: { data: CertData }) {
  const certificate = data.certificate
  const school = data.school
  const student = certificate.student
  const fullName = `${student.firstName} ${student.lastName}`.toUpperCase()

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        border: '2px solid #000',
        padding: 24,
        fontFamily: 'Times New Roman, Times, serif',
        background: '#fff',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase' }}>{school?.name}</div>
        <div style={{ fontSize: 11 }}>
          {school?.address}
          {school?.phone ? ` | ${school.phone}` : ''}
        </div>
        <div
          style={{
            marginTop: 8,
            fontWeight: 800,
            letterSpacing: 2,
            borderTop: '2px solid #000',
            borderBottom: '2px solid #000',
            padding: '4px 0',
          }}
        >
          CHARACTER CERTIFICATE
        </div>
        <div style={{ fontSize: 11, marginTop: 4 }}>No: {certificate.certificateNumber}</div>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7 }}>
        <p>To Whom It May Concern,</p>
        <p style={{ marginTop: 10 }}>
          This is to certify that <b>{fullName}</b>, son/daughter of{' '}
          {certificate.fatherName || student.guardianName}, bearing Registration No.{' '}
          {student.registrationNumber}, was a student of this institution.
        </p>
        <p style={{ marginTop: 8 }}>
          During his/her stay at {school?.name},{' '}
          {certificate.characterRemarks ||
            'he/she bore good moral character and was a disciplined student.'}
        </p>
        <p style={{ marginTop: 8 }}>
          This certificate is being issued on his/her request for{' '}
          {certificate.purpose || 'admission/employment purposes'}.
        </p>
        <p style={{ marginTop: 8 }}>We wish him/her every success in life.</p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48 }}>
        <div style={{ textAlign: 'center', width: 180, borderTop: '1px solid #000', paddingTop: 4 }}>
          Class Teacher
        </div>
        <div style={{ textAlign: 'center', width: 180, borderTop: '1px solid #000', paddingTop: 4 }}>
          Principal
        </div>
      </div>
    </div>
  )
}

function CertificateInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = Number(params.id)
  const style = searchParams.get('style') === 'template' ? 'template' : 'digital'

  const [data, setData] = useState<CertData | null>(null)

  useEffect(() => {
    getCertificateById(id).then((d) => {
      if (d.certificate) {
        setData({ certificate: d.certificate, school: d.school })
      }
    })
  }, [id])

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [data])

  if (!data) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        Loading…
      </div>
    )
  }

  if (!data.school?.name) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#b45309',
        }}
      >
        School name not configured. Please update school profile before printing.
      </div>
    )
  }

  const type = data.certificate.type

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: #fff; }
        .no-print { background: #fffbeb; border: 1px solid #fbbf24; padding: 10px 14px; margin: 10px; font-size: 13px; font-family: Arial; }
        .page { padding: 10mm; }
        .birth-page { height: 297mm; display: flex; flex-direction: column; gap: 6mm; padding: 8mm; }
        .cut-line { text-align: center; font-size: 10px; letter-spacing: 2px; color: #64748b; border-top: 1px dashed #64748b; border-bottom: 1px dashed #64748b; padding: 2px 0; }
        @media print {
          @page { size: A4 portrait; margin: 0.5cm; }
          .no-print { display: none !important; }
          .page, .birth-page { padding: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print">
        Print dialog will open automatically.{' '}
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            color: '#2563eb',
            background: 'none',
            border: 'none',
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Click here to print
        </button>
      </div>

      {type === CertificateType.BIRTH && (
        <div className="birth-page">
          <BirthCopy data={data} />
          <div className="cut-line">- - - - - - - - - - CUT HERE - - - - - - - - - - ✂</div>
          <BirthCopy data={data} />
        </div>
      )}

      {type === CertificateType.SCHOOL_LEAVING && (
        <div className="page">
          <SchoolLeavingCertificate data={data} style={style} />
        </div>
      )}

      {type === CertificateType.CHARACTER && (
        <div className="page">
          <CharacterCertificate data={data} />
        </div>
      )}
    </>
  )
}

export default function PrintCertificatePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
      <CertificateInner />
    </Suspense>
  )
}
