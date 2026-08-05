'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CertificateType } from '@prisma/client'
import { getCertificateById } from '@/lib/actions/certificates'
import { formatDate } from '@/lib/utils'

type CertData = {
  certificate: NonNullable<Awaited<ReturnType<typeof getCertificateById>>['certificate']>
  school: NonNullable<Awaited<ReturnType<typeof getCertificateById>>['school']>
}

function LetterHeader({ data }: { data: CertData }) {
  const school = data.school
  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase' }}>{school?.name}</div>
      <div style={{ fontSize: 11, marginTop: 4 }}>
        {school?.address}{school?.phone ? ` | ${school.phone}` : ''}{school?.email ? ` | ${school.email}` : ''}
      </div>
      <div style={{ borderTop: '2px solid #000', marginTop: 10 }} />
    </div>
  )
}

function OfferLetter({ data }: { data: CertData }) {
  const c = data.certificate
  const teacher = c.teacher!
  const issueDate = formatDate(c.issueDate)
  const joining = c.joiningDate ? formatDate(c.joiningDate) : '—'

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 24, fontFamily: 'Times New Roman, serif', fontSize: 13, lineHeight: 1.6 }}>
      <LetterHeader data={data} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span>Letter Ref: <b>{c.certificateNumber}</b></span>
        <span>Date: {issueDate}</span>
      </div>
      <h2 style={{ textAlign: 'center', fontSize: 16, margin: '20px 0', textDecoration: 'underline' }}>OFFER LETTER</h2>
      <p>Dear {teacher.name},</p>
      <p style={{ marginTop: 12 }}>
        We are pleased to offer you the position of <b>{c.designation}</b> at {data.school?.name}, effective from {joining}.
      </p>
      <p style={{ marginTop: 16, fontWeight: 700 }}>TERMS OF EMPLOYMENT:</p>
      <table style={{ width: '100%', marginTop: 8, fontSize: 13 }}>
        <tbody>
          <tr><td style={{ width: 140, padding: '4px 0' }}>Position:</td><td>{c.designation}</td></tr>
          <tr><td style={{ padding: '4px 0' }}>Joining Date:</td><td>{joining}</td></tr>
          <tr><td style={{ padding: '4px 0' }}>Working Hours:</td><td>{c.workingHours || '—'}</td></tr>
          <tr><td style={{ padding: '4px 0' }}>Salary:</td><td>{c.salary || '___________________________'}</td></tr>
        </tbody>
      </table>
      {!c.salary && <p style={{ fontSize: 11, fontStyle: 'italic' }}>(To be discussed separately)</p>}
      {c.terms && (
        <>
          <p style={{ marginTop: 16, fontWeight: 700 }}>TERMS & CONDITIONS:</p>
          <p style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{c.terms}</p>
        </>
      )}
      <p style={{ marginTop: 16 }}>
        This offer is subject to the satisfactory completion of all required documentation and verification.
      </p>
      <p style={{ marginTop: 12 }}>Please sign and return one copy of this letter as confirmation of your acceptance.</p>
      <p style={{ marginTop: 12 }}>We look forward to welcoming you to our team.</p>
      <p style={{ marginTop: 32 }}>Yours Sincerely,</p>
      <div style={{ marginTop: 48, borderTop: '1px solid #000', width: 200, paddingTop: 4 }}>Principal<br />{data.school?.name}</div>
      <div style={{ marginTop: 32, borderTop: '2px solid #000', paddingTop: 12 }}>
        <p>I, {teacher.name}, accept the above offer of employment.</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <span>Signature: _______________</span>
          <span>Date: _______________</span>
        </div>
      </div>
    </div>
  )
}

function ExperienceLetter({ data }: { data: CertData }) {
  const c = data.certificate
  const teacher = c.teacher!
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 24, fontFamily: 'Times New Roman, serif', fontSize: 13, lineHeight: 1.6 }}>
      <LetterHeader data={data} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span>Letter Ref: <b>{c.certificateNumber}</b></span>
        <span>Date: {formatDate(c.issueDate)}</span>
      </div>
      <h2 style={{ textAlign: 'center', fontSize: 16, margin: '20px 0', textDecoration: 'underline' }}>EXPERIENCE LETTER</h2>
      <p>To Whom It May Concern,</p>
      <p style={{ marginTop: 12 }}>
        This is to certify that <b>{teacher.name}</b> has served as <b>{c.designation}</b> at {data.school?.name}{' '}
        from {c.joiningDate ? formatDate(c.joiningDate) : '—'} to {c.leavingDate ? formatDate(c.leavingDate) : '—'}.
      </p>
      <p style={{ marginTop: 12 }}>
        During his/her tenure with us, he/she demonstrated professionalism, dedication, and commitment to his/her
        responsibilities. His/Her conduct and performance were found to be satisfactory.
      </p>
      {c.reasonForLeaving && (
        <p style={{ marginTop: 12 }}>He/She is leaving the organization due to {c.reasonForLeaving}.</p>
      )}
      <p style={{ marginTop: 12 }}>We wish him/her all the best in future endeavors.</p>
      <p style={{ marginTop: 12 }}>This letter is issued on his/her request without any obligation.</p>
      <div style={{ marginTop: 48, borderTop: '1px solid #000', width: 200, paddingTop: 4 }}>Principal<br />{data.school?.name}</div>
    </div>
  )
}

function ResignationLetter({ data }: { data: CertData }) {
  const c = data.certificate
  const teacher = c.teacher!
  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 24, fontFamily: 'Times New Roman, serif', fontSize: 13, lineHeight: 1.6 }}>
      <LetterHeader data={data} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span>Letter Ref: <b>{c.certificateNumber}</b></span>
        <span>Date: {formatDate(c.issueDate)}</span>
      </div>
      <h2 style={{ textAlign: 'center', fontSize: 16, margin: '20px 0', textDecoration: 'underline' }}>RESIGNATION LETTER</h2>
      <p><b>From:</b> {teacher.name}<br />{c.designation}</p>
      <p style={{ marginTop: 12 }}><b>To:</b> The Principal<br />{data.school?.name}</p>
      <p style={{ marginTop: 16 }}><b>Subject:</b> Resignation from the post of {c.designation}</p>
      <p style={{ marginTop: 16 }}>Respected Sir/Madam,</p>
      <p style={{ marginTop: 12 }}>
        I, {teacher.name}, hereby tender my resignation from the post of {c.designation} at {data.school?.name},
        effective from {c.resignationDate ? formatDate(c.resignationDate) : '—'}.
      </p>
      <p style={{ marginTop: 12 }}>
        I am serving a notice period of {c.noticePeriod || '30 days'} and my last working day will be{' '}
        {c.lastWorkingDate ? formatDate(c.lastWorkingDate) : '—'}.
      </p>
      <p style={{ marginTop: 12 }}>
        I am grateful for the opportunity to have worked with this institution and wish the school continued success.
      </p>
      <p style={{ marginTop: 12 }}>I will ensure a smooth handover of all responsibilities before my departure.</p>
      <p style={{ marginTop: 24 }}>Yours Sincerely,</p>
      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
        <div><div style={{ borderTop: '1px solid #000', width: 180, paddingTop: 4 }}>{teacher.name}<br />{c.designation}</div></div>
        <span>Date: _______________</span>
      </div>
      <div style={{ marginTop: 32, borderTop: '2px solid #000', paddingTop: 12 }}>
        <p><b>Accepted by:</b></p>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ borderTop: '1px solid #000', width: 180, paddingTop: 4 }}>Principal, {data.school?.name}</div>
          <span>Date: _______________</span>
        </div>
      </div>
    </div>
  )
}

function LetterInner() {
  const params = useParams()
  const id = Number(params.id)
  const [data, setData] = useState<CertData | null>(null)

  useEffect(() => {
    getCertificateById(id).then((d) => {
      if (d.certificate && d.school) setData({ certificate: d.certificate, school: d.school })
    })
  }, [id])

  useEffect(() => {
    if (data) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [data])

  if (!data) return <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>

  const type = data.certificate.type

  return (
    <>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div className="no-print" style={{ padding: 10, background: '#fffbeb', margin: 10, fontSize: 13 }}>
        Print dialog will open automatically.{' '}
        <button type="button" onClick={() => window.print()} style={{ color: '#2563eb', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>Print</button>
      </div>
      {type === CertificateType.OFFER_LETTER && <OfferLetter data={data} />}
      {type === CertificateType.EXPERIENCE_LETTER && <ExperienceLetter data={data} />}
      {type === CertificateType.RESIGNATION_LETTER && <ResignationLetter data={data} />}
    </>
  )
}

export default function PrintLetterPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>}>
      <LetterInner />
    </Suspense>
  )
}
