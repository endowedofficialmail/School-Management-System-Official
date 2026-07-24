'use client'

import { format, addDays } from 'date-fns'
import type { CSSProperties } from 'react'
import Barcode from '@/components/shared/Barcode'

export type FeeSummaryRow = {
  label: string
  labelLong?: string
  paid: number
  arrear: number
}

export type PakistaniVoucherData = {
  voucherNumber: string
  month: number
  year: number
  issueDate: Date | string
  dueDate: Date | string
  status: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  student: {
    firstName: string
    lastName: string
    registrationNumber: string
    guardianName: string
    guardianCNIC?: string | null
    class: { id: number; name: string; section: string }
  }
  items: { description: string; amount: number }[]
  school: {
    name: string
    address?: string | null
    phone?: string | null
    logoUrl?: string | null
  }
  previousFeeSummary: FeeSummaryRow[]
  lastFeeDep?: string
}

const FEE_LABELS = [
  { key: 'tuition', match: [/tuit/i, /fee\s*structure/i, /monthly/i], label: 'Tution Fee' },
  { key: 'books', match: [/book/i, /stationery/i, /st\.?\s*ch/i], label: 'Books+St.Ch.' },
  { key: 'reg', match: [/regist/i, /admission/i], label: 'Registration Fee' },
  { key: 'exam', match: [/exam/i], label: 'Exam Fee' },
  { key: 'labs', match: [/lab/i], label: 'Labs Fee' },
  { key: 'art', match: [/art/i, /craft/i], label: 'Art & Craft Fee' },
] as const

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function amt(n: number) {
  return Math.round(n).toLocaleString('en-PK')
}

function mapFeeBreakdown(items: { description: string; amount: number }[]) {
  const amounts: Record<string, number> = {
    tuition: 0, books: 0, reg: 0, exam: 0, labs: 0, art: 0, misc: 0, arrears: 0,
  }

  for (const item of items) {
    const desc = item.description || ''
    if (/arrear/i.test(desc)) {
      amounts.arrears += Number(item.amount)
      continue
    }
    let matched = false
    for (const row of FEE_LABELS) {
      if (row.match.some((re) => re.test(desc))) {
        amounts[row.key] += Number(item.amount)
        matched = true
        break
      }
    }
    if (!matched) amounts.misc += Number(item.amount)
  }

  return [
    { label: 'Tution Fee', amount: amounts.tuition },
    { label: 'Books+St.Ch.', amount: amounts.books },
    { label: 'Registration Fee', amount: amounts.reg },
    { label: 'Exam Fee', amount: amounts.exam },
    { label: 'Labs Fee', amount: amounts.labs },
    { label: 'Art & Craft Fee', amount: amounts.art },
    { label: 'Misc.', amount: amounts.misc },
    { label: 'Arrears', amount: amounts.arrears },
  ]
}

function SchoolHeader({ school, compact }: { school: PakistaniVoucherData['school']; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8, borderBottom: '2px solid #000', paddingBottom: 4, marginBottom: 4 }}>
      {school.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={school.logoUrl}
          alt="Logo"
          style={{ width: compact ? 28 : 36, height: compact ? 28 : 36, objectFit: 'contain' }}
        />
      ) : (
        <div style={{
          width: compact ? 28 : 36, height: compact ? 28 : 36, border: '1px solid #000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 'bold',
        }}>
          {school.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: compact ? 11 : 13, lineHeight: 1.15, textTransform: 'uppercase' }}>
          {school.name}
        </div>
        <div style={{ fontSize: compact ? 7 : 8, lineHeight: 1.2 }}>
          {[school.address, school.phone ? `Ph#: ${school.phone}` : null].filter(Boolean).join(', ')}
        </div>
      </div>
    </div>
  )
}

function SimpleCopy({
  data,
  copyLabel,
}: {
  data: PakistaniVoucherData
  copyLabel: string
}) {
  const breakdown = mapFeeBreakdown(data.items)
  const withinDue = Number(data.totalAmount)
  const afterDue = withinDue + 350
  const dueDate = new Date(data.dueDate)
  const feeMonth = `${MONTHS[data.month - 1]} ${data.year}`
  const familyNo = data.student.guardianCNIC
    ? data.student.guardianCNIC.replace(/[^0-9]/g, '').slice(-4)
    : ''

  return (
    <div style={{
      flex: 1, border: '1px solid #000', padding: 6, fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 8, lineHeight: 1.25, color: '#000', display: 'flex', flexDirection: 'column',
      minWidth: 0, height: '100%',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 2 }}>
        <Barcode value={data.voucherNumber} width={1.2} height={32} fontSize={9} />
      </div>
      <div style={{ borderTop: '2px solid #000', marginBottom: 4 }} />
      <SchoolHeader school={data.school} />

      <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
        <div style={{ flex: 1 }}>
          <div><b>Chalan No.</b> {data.voucherNumber}</div>
          <div><b>Student ID:</b> {data.student.registrationNumber}</div>
          <div><b>Name:</b> {data.student.firstName} {data.student.lastName}</div>
          <div><b>Father Name:</b> {data.student.guardianName}</div>
          <div><b>Class:</b> {data.student.class.name} - {data.student.class.section}</div>
          <div><b>Fee Category:</b> GEN &nbsp; <b>Family #:</b> {familyNo || '—'}</div>
          <div><b>Last Fee Dep:</b> {data.lastFeeDep || '—'}</div>
          <div><b>Conc:</b> {data.student.class.id}</div>
        </div>
        <div style={{
          border: '2px solid #000', padding: '4px 8px', textAlign: 'center',
          alignSelf: 'flex-start', minWidth: 72,
        }}>
          <div style={{ fontSize: 7, fontWeight: 700 }}>DUE DATE</div>
          <div style={{ fontSize: 12, fontWeight: 900 }}>{format(dueDate, 'dd/MM/yyyy')}</div>
        </div>
      </div>

      <div style={{ marginBottom: 4 }}>
        <b>FP:</b> {feeMonth} &nbsp; <b>Fee Month:</b> {feeMonth}
      </div>

      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        <div style={{ flex: 1.1 }}>
          <div style={{ fontWeight: 700, fontSize: 7, marginBottom: 2, textAlign: 'center', border: '1px solid #000', padding: 1 }}>
            PREVIOUS FEE SUMMARY
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 6.5 }}>
            <thead>
              <tr>
                <th style={th}>Month</th>
                <th style={th}>Paid</th>
                <th style={th}>Arrear</th>
              </tr>
            </thead>
            <tbody>
              {data.previousFeeSummary.map((row) => (
                <tr key={row.label}>
                  <td style={td}>{row.label}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{amt(row.paid)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>{amt(row.arrear)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 7 }}>
            <tbody>
              {breakdown.map((row) => (
                <tr key={row.label}>
                  <td style={tdLeft}>{row.label}</td>
                  <td style={{ ...td, textAlign: 'right', width: 48 }}>{amt(row.amount)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...tdLeft, fontWeight: 900, borderTop: '2px solid #000' }}>With in Due Date</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 900, borderTop: '2px solid #000' }}>{amt(withinDue)}</td>
              </tr>
              <tr>
                <td style={tdLeft}>Late Fee Fine</td>
                <td style={{ ...td, textAlign: 'right' }}>350</td>
              </tr>
              <tr>
                <td style={{ ...tdLeft, fontWeight: 900, borderTop: '2px solid #000' }}>After Due Date</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 900, borderTop: '2px solid #000' }}>{amt(afterDue)}</td>
              </tr>
              <tr>
                <td style={tdLeft}>Paid Amount</td>
                <td style={{ ...td, textAlign: 'right' }}>{amt(Number(data.paidAmount))}</td>
              </tr>
              <tr>
                <td style={tdLeft}>Balance</td>
                <td style={{ ...td, textAlign: 'right' }}>{amt(Number(data.remainingAmount))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 4, fontSize: 7, borderTop: '1px solid #000', paddingTop: 3 }}>
        Rs.350/- will be compulsory to pay in case of the late fee submission
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 7 }}>
        <div>
          <div>Issue Date: {format(new Date(data.issueDate), 'dd/MM/yyyy')}</div>
          <div>Slip #: {data.voucherNumber}</div>
        </div>
        <div style={{ fontWeight: 800, alignSelf: 'flex-end' }}>{copyLabel}</div>
      </div>
    </div>
  )
}

function BankCopy({
  data,
  copyLabel,
  showBanksLabel,
}: {
  data: PakistaniVoucherData
  copyLabel: string
  showBanksLabel?: boolean
}) {
  const breakdown = mapFeeBreakdown(data.items)
  const withinDue = Number(data.totalAmount)
  const afterDue = withinDue + 350
  const dueDate = new Date(data.dueDate)
  const bankCutoff = addDays(dueDate, 15)
  const feeMonth = `${MONTHS[data.month - 1]} ${data.year}`

  return (
    <div style={{
      flex: 1, border: '1px solid #000', padding: 4, fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: 6.5, lineHeight: 1.2, color: '#000', display: 'flex', position: 'relative',
      minWidth: 0, height: '100%',
    }}>
      {showBanksLabel && (
        <div style={{
          writingMode: 'vertical-rl', transform: 'rotate(180deg)',
          fontWeight: 900, fontSize: 11, letterSpacing: 3, paddingRight: 3,
          borderRight: '1px solid #000', marginRight: 3,
        }}>
          BANKS
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <Barcode value={data.voucherNumber} width={0.9} height={26} fontSize={7} />
        </div>
        <div style={{ borderTop: '2px solid #000', margin: '2px 0' }} />
        <SchoolHeader school={data.school} compact />

        <div style={{ marginBottom: 2 }}>
          <div><b>Chalan No:</b> {data.voucherNumber} &nbsp; <b>Adm#:</b> {data.student.registrationNumber}</div>
          <div><b>Name:</b> {data.student.firstName} {data.student.lastName}</div>
          <div><b>Father Name:</b> {data.student.guardianName}</div>
          <div>
            <b>Class:</b> {data.student.class.name}-{data.student.class.section}
            &nbsp; <b>Fee Category:</b> GEN
          </div>
          <div><b>Last Fee Dep:</b> {data.lastFeeDep || '—'}</div>
          <div><b>FP:</b> {feeMonth} &nbsp; <b>Fee Month:</b> {feeMonth}</div>
          <div><b>Conc:</b> {data.student.class.id} &nbsp; Day Scholar &nbsp; <b>Status:</b> {data.status}</div>
          <div><b>Due Date:</b> {format(dueDate, 'dd/MM/yyyy')}</div>
        </div>

        <div style={{ fontWeight: 700, fontSize: 6, marginBottom: 1 }}>PREVIOUS FEE SUMMARY:</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 5.5, marginBottom: 3 }}>
          <thead>
            <tr>
              <th style={th}>Month</th>
              <th style={th}>Paid</th>
              <th style={th}>Arrear</th>
            </tr>
          </thead>
          <tbody>
            {data.previousFeeSummary.map((row) => (
              <tr key={row.label}>
                <td style={td}>{row.labelLong || row.label}</td>
                <td style={{ ...td, textAlign: 'right' }}>{amt(row.paid)}</td>
                <td style={{ ...td, textAlign: 'right' }}>{amt(row.arrear)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 6.5, marginBottom: 3 }}>
          <tbody>
            {breakdown.map((row) => (
              <tr key={row.label}>
                <td style={tdLeft}>{row.label}</td>
                <td style={{ ...td, textAlign: 'right', width: 40 }}>{amt(row.amount)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...tdLeft, fontWeight: 900, borderTop: '2px solid #000' }}>With in Due Date</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 900, borderTop: '2px solid #000' }}>{amt(withinDue)}</td>
            </tr>
            <tr>
              <td style={tdLeft}>Late Fee Fine</td>
              <td style={{ ...td, textAlign: 'right' }}>0</td>
            </tr>
            <tr>
              <td style={{ ...tdLeft, fontWeight: 900, borderTop: '2px solid #000' }}>After Due Date</td>
              <td style={{ ...td, textAlign: 'right', fontWeight: 900, borderTop: '2px solid #000' }}>{amt(afterDue)}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ fontSize: 5.5, marginTop: 'auto' }}>
          <div style={{ marginBottom: 2 }}>
            Rs.350/- will be compulsory to pay in case of late fee submission
          </div>
          <ol style={{ margin: 0, paddingLeft: 12 }}>
            <li>The Chalan must be deposited with in due date to avoid late payment Fine.</li>
            <li>The fee may only be deposited in Designated Banks</li>
            <li>BANK will not entertain this voucher after {format(bankCutoff, 'dd/MM/yyyy')}</li>
          </ol>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontWeight: 800 }}>
            <span>Print Date: {format(new Date(), 'dd/MM/yyyy')}</span>
            <span>{copyLabel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const th: CSSProperties = {
  border: '1px solid #000', padding: '1px 2px', textAlign: 'left', fontWeight: 700, background: '#f1f5f9',
}
const td: CSSProperties = {
  border: '1px solid #000', padding: '1px 2px',
}
const tdLeft: CSSProperties = {
  border: '1px solid #000', padding: '1px 3px',
}

export function SimpleVoucherSheet({ data }: { data: PakistaniVoucherData }) {
  return (
    <div style={{ display: 'flex', gap: 0, width: '100%', minHeight: '190mm', alignItems: 'stretch' }}>
      <SimpleCopy data={data} copyLabel="School Copy" />
      <div style={{
        width: 14, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'flex-start', borderLeft: '1px dashed #64748b', borderRight: '1px dashed #64748b',
        margin: '0 2px',
      }}>
        <span style={{ fontSize: 12, lineHeight: 1 }}>✂</span>
        <div style={{
          writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 7,
          color: '#64748b', letterSpacing: 1, marginTop: 4,
        }}>
          CUT
        </div>
      </div>
      <SimpleCopy data={data} copyLabel="Student Copy" />
    </div>
  )
}

export function BankVoucherSheet({ data }: { data: PakistaniVoucherData }) {
  return (
    <div style={{ display: 'flex', gap: 0, width: '100%', minHeight: '190mm', alignItems: 'stretch' }}>
      <BankCopy data={data} copyLabel="Bank Copy" showBanksLabel />
      <div style={{ width: 10, borderLeft: '1px dashed #64748b', borderRight: '1px dashed #64748b', margin: '0 1px', textAlign: 'center', fontSize: 10 }}>✂</div>
      <BankCopy data={data} copyLabel="Office Copy" />
      <div style={{ width: 10, borderLeft: '1px dashed #64748b', borderRight: '1px dashed #64748b', margin: '0 1px', textAlign: 'center', fontSize: 10 }}>✂</div>
      <BankCopy data={data} copyLabel="Student Copy" />
    </div>
  )
}

export function toPakistaniVoucherData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any,
  school: PakistaniVoucherData['school']
): PakistaniVoucherData {
  const summary = (raw.previousFeeSummary || []) as FeeSummaryRow[]
  const lastPaid = [...summary].reverse().find((r) => r.paid > 0)
  return {
    voucherNumber: raw.voucherNumber,
    month: raw.month,
    year: raw.year,
    issueDate: raw.issueDate,
    dueDate: raw.dueDate,
    status: raw.status,
    totalAmount: Number(raw.totalAmount),
    paidAmount: Number(raw.paidAmount),
    remainingAmount: Number(raw.remainingAmount),
    student: {
      firstName: raw.student.firstName,
      lastName: raw.student.lastName,
      registrationNumber: raw.student.registrationNumber,
      guardianName: raw.student.guardianName,
      guardianCNIC: raw.student.guardianCNIC,
      class: raw.student.class,
    },
    items: (raw.items || []).map((i: { description: string; amount: number | string }) => ({
      description: i.description,
      amount: Number(i.amount),
    })),
    school: {
      name: school.name,
      address: school.address,
      phone: school.phone,
      logoUrl: school.logoUrl,
    },
    previousFeeSummary: summary,
    lastFeeDep: lastPaid?.label,
  }
}
