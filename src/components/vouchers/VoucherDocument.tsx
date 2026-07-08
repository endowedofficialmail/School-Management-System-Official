import { format } from 'date-fns'
import { VoucherStatus } from '@prisma/client'

export type VoucherPrintShape = {
  voucherNumber: string
  month: number
  year: number
  issueDate: Date | string
  dueDate: Date | string
  status: VoucherStatus
  totalAmount: number | string
  originalAmount?: number | string
  appliedAdvance?: number | string
  paidAmount?: number | string
  advanceAmount?: number | string
  remainingAmount?: number | string
  paidDate?: Date | string | null
  receivedBy?: string | null
  notes?: string | null
  paymentMode?: string | null
  student: {
    firstName: string
    lastName: string
    registrationNumber: string
    guardianName: string
    class: { name: string; section: string }
  }
  items: { description: string; amount: number | string }[]
  school?: {
    name: string
    address?: string | null
    phone?: string | null
    email?: string | null
    logoUrl?: string | null
  } | null
  paymentHistory?: {
    amountPaid: number | string
    paymentDate: Date | string
    receivedBy: string
    paymentMode: string
  }[]
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatRs(amount: number | string) {
  return `Rs. ${Number(amount).toLocaleString('en-PK')}`
}

function schoolInitials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

function getWatermark(voucher: VoucherPrintShape) {
  const remaining =
    Number(voucher.remainingAmount) ||
    Math.max(0, Number(voucher.totalAmount) - Number(voucher.paidAmount ?? 0))
  const advance = Number(voucher.advanceAmount ?? 0)
  const appliedAdvance = Number(voucher.appliedAdvance ?? 0)
  const paidViaAdvance =
    appliedAdvance > 0 &&
    (voucher.status === 'PAID' || voucher.status === 'ADVANCE') &&
    (
      voucher.receivedBy === 'System (Advance Carry-Forward)' ||
      voucher.paymentHistory?.some((p) => p.paymentMode === 'Advance Adjustment')
    ) &&
    Number(voucher.paidAmount ?? 0) <= appliedAdvance + 0.001

  if (paidViaAdvance) {
    return { label: 'PAID VIA ADVANCE CREDIT', color: '#2563eb', subtitle: null as string | null }
  }
  if (voucher.status === 'PAID') {
    return { label: 'PAID', color: '#16a34a', subtitle: null as string | null }
  }
  if (voucher.status === 'CANCELLED') {
    return { label: 'CANCELLED', color: '#dc2626', subtitle: null }
  }
  if (voucher.status === 'PARTIAL') {
    return {
      label: 'PARTIAL PAID',
      color: '#ea580c',
      subtitle: `PARTIAL — ${formatRs(remaining)} DUE`,
    }
  }
  if (voucher.status === 'ADVANCE') {
    return {
      label: 'ADVANCE PAID',
      color: '#2563eb',
      subtitle: `ADVANCE — ${formatRs(advance)} CREDIT`,
    }
  }
  return null
}

export function VoucherDocument({
  voucher,
  copyLabel,
  compact = false,
}: {
  voucher: VoucherPrintShape
  copyLabel?: string
  compact?: boolean
}) {
  const total = Number(voucher.totalAmount)
  const originalAmount = Number(voucher.originalAmount ?? 0) || total
  const appliedAdvance = Number(voucher.appliedAdvance ?? 0)
  const netDue = Math.max(0, originalAmount - appliedAdvance)
  const paid = Number(voucher.paidAmount ?? 0)
  const remaining =
    Number(voucher.remainingAmount) || Math.max(0, total - paid)
  const advance = Number(voucher.advanceAmount ?? 0)
  const school = voucher.school
  const initials = schoolInitials(school?.name ?? 'School')
  const monthName = MONTHS[voucher.month - 1] ?? String(voucher.month)
  const watermark = getWatermark(voucher)
  const lastPayment = voucher.paymentHistory?.[voucher.paymentHistory.length - 1]
  const paymentMode = voucher.paymentMode ?? lastPayment?.paymentMode ?? null
  const paidViaAdvance =
    appliedAdvance > 0 &&
    (voucher.receivedBy === 'System (Advance Carry-Forward)' ||
      paymentMode === 'Advance Adjustment') &&
    (voucher.status === 'PAID' || voucher.status === 'ADVANCE') &&
    paid <= appliedAdvance + 0.001

  return (
    <div style={{
      position: 'relative',
      border: '2px solid #1e3a5f',
      borderRadius: 6,
      padding: compact ? 12 : 16,
      fontFamily: 'Arial, sans-serif',
      fontSize: compact ? 10 : 11,
      color: '#1a1a1a',
      background: '#fff',
      overflow: 'hidden',
    }}>
      {watermark && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1,
          gap: 8,
        }}>
          <span style={{
            fontSize: compact ? 40 : 56,
            fontWeight: 'bold',
            color: watermark.color,
            opacity: 0.15,
            transform: 'rotate(-35deg)',
            letterSpacing: 6,
            border: `4px solid ${watermark.color}`,
            padding: '8px 20px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
          }}>
            {watermark.label}
          </span>
          {watermark.subtitle && (
            <span style={{
              fontSize: compact ? 11 : 13,
              fontWeight: 'bold',
              color: watermark.color,
              opacity: 0.25,
              transform: 'rotate(-35deg)',
              letterSpacing: 1,
            }}>
              {watermark.subtitle}
            </span>
          )}
        </div>
      )}

      {copyLabel && (
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 9, color: '#64748b', marginBottom: 6, letterSpacing: 1 }}>
          {copyLabel}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #cbd5e1', paddingBottom: 8, marginBottom: 8, position: 'relative', zIndex: 2 }}>
        {school?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={school.logoUrl} alt="logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1e3a5f', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14, flexShrink: 0 }}>
            {initials}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: compact ? 13 : 15, fontWeight: 'bold', color: '#1e3a5f' }}>{school?.name ?? 'School Name'}</div>
          <div style={{ fontSize: 9, color: '#64748b' }}>
            {[school?.address, school?.phone && `Tel: ${school.phone}`, school?.email].filter(Boolean).join(' | ')}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', background: '#1e3a5f', color: 'white', padding: '5px 0', marginBottom: 8, borderRadius: 3, fontWeight: 'bold', letterSpacing: 2, fontSize: compact ? 10 : 11, position: 'relative', zIndex: 2 }}>
        FEE VOUCHER
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8, fontSize: compact ? 9.5 : 10.5, position: 'relative', zIndex: 2 }}>
        <div><b>Voucher #:</b> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{voucher.voucherNumber}</span></div>
        <div><b>Due Date:</b> {format(new Date(voucher.dueDate), 'dd MMM yyyy')}</div>
        <div><b>Month:</b> {monthName} {voucher.year}</div>
        <div><b>Issue Date:</b> {format(new Date(voucher.issueDate), 'dd MMM yyyy')}</div>
      </div>

      <div style={{ borderTop: '1px dashed #cbd5e1', marginBottom: 8, position: 'relative', zIndex: 2 }} />

      <div style={{ marginBottom: 8, fontSize: compact ? 9.5 : 10.5, position: 'relative', zIndex: 2 }}>
        <div><b>Student Name:</b> {voucher.student.firstName} {voucher.student.lastName}</div>
        <div><b>Registration #:</b> <span style={{ fontFamily: 'monospace' }}>{voucher.student.registrationNumber}</span></div>
        <div><b>Class:</b> {voucher.student.class.name} – {voucher.student.class.section}</div>
        <div><b>Guardian:</b> {voucher.student.guardianName}</div>
      </div>

      <div style={{ borderTop: '1px dashed #cbd5e1', marginBottom: 8, position: 'relative', zIndex: 2 }} />

      <div style={{ marginBottom: 8, position: 'relative', zIndex: 2 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 10 }}>FEE DETAILS:</div>
        {voucher.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: compact ? 9.5 : 10.5 }}>
            <span>{item.description}</span>
            <span style={{ fontWeight: 500 }}>{formatRs(item.amount)}</span>
          </div>
        ))}
        {appliedAdvance > 0 ? (
          <>
            <div style={{ borderTop: '1px solid #cbd5e1', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: compact ? 10 : 11 }}>
              <span>Gross Total:</span>
              <span>{formatRs(originalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#16a34a', fontWeight: 600, fontSize: compact ? 10 : 11 }}>
              <span>Advance Credit Applied:</span>
              <span>-{formatRs(appliedAdvance)}</span>
            </div>
            <div style={{ borderTop: '1px solid #1e3a5f', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: compact ? 11 : 12 }}>
              <span>NET AMOUNT DUE</span>
              <span style={{ color: '#1e3a5f' }}>{formatRs(netDue)}</span>
            </div>
          </>
        ) : (
          <div style={{ borderTop: '1px solid #1e3a5f', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: compact ? 11 : 12 }}>
            <span>TOTAL AMOUNT</span>
            <span style={{ color: '#1e3a5f' }}>{formatRs(total)}</span>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #cbd5e1', marginBottom: 8, position: 'relative', zIndex: 2 }} />

      <div style={{ fontSize: 9, color: '#64748b', marginBottom: 8, position: 'relative', zIndex: 2 }}>
        <div style={{ fontWeight: 'bold', color: '#374151', marginBottom: 2 }}>Instructions:</div>
        <div>• Please pay before the due date</div>
        <div>• Bring this voucher when making payment</div>
        <div>• After due date a late fee may apply</div>
      </div>

      {paid > 0 && (
        <div style={{
          border: '1px solid #94a3b8',
          borderRadius: 4,
          padding: 8,
          fontSize: 9.5,
          marginBottom: 8,
          position: 'relative',
          zIndex: 2,
          background: '#f8fafc',
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>PAYMENT RECORD:</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
            <span>Total Amount:</span><span>{formatRs(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
            <span>Amount Paid:</span><span>{formatRs(paid)}</span>
          </div>
          {voucher.status === 'PARTIAL' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#ea580c', fontWeight: 'bold' }}>
              <span>Remaining:</span><span>{formatRs(remaining)}</span>
            </div>
          )}
          {voucher.status === 'ADVANCE' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#2563eb', fontWeight: 'bold' }}>
              <span>Advance Credit:</span><span>{formatRs(advance)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
            <span>Payment Date:</span>
            <span>{voucher.paidDate ? format(new Date(voucher.paidDate), 'dd MMM yyyy') : '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
            <span>Received By:</span>
            <span>{paidViaAdvance ? 'Advance Credit Carry-Forward' : (voucher.receivedBy ?? '—')}</span>
          </div>
          {paidViaAdvance && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#2563eb', fontWeight: 'bold' }}>
              <span>Paid By:</span><span>Advance Credit Carry-Forward</span>
            </div>
          )}
          {paymentMode && !paidViaAdvance && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span>Payment Mode:</span><span>{paymentMode}</span>
            </div>
          )}
          {paymentMode && paidViaAdvance && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
              <span>Payment Mode:</span><span>Advance Adjustment</span>
            </div>
          )}
        </div>
      )}

      <div style={{ border: '1px dashed #94a3b8', borderRadius: 4, padding: 8, fontSize: 9, position: 'relative', zIndex: 2 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>FOR OFFICE USE ONLY:</div>
        <div>Received: Rs.___________ &nbsp; Date:___________ &nbsp; Sign:___________</div>
      </div>
    </div>
  )
}

export function ReceiptDocument({ voucher }: { voucher: VoucherPrintShape }) {
  const total = Number(voucher.totalAmount)
  const paid = Number(voucher.paidAmount ?? 0)
  const remaining =
    Number(voucher.remainingAmount) || Math.max(0, total - paid)
  const advance = Number(voucher.advanceAmount ?? 0)
  const school = voucher.school
  const lastPayment = voucher.paymentHistory?.[voucher.paymentHistory.length - 1]
  const paymentMode = voucher.paymentMode ?? lastPayment?.paymentMode ?? null

  const heading =
    voucher.status === 'PARTIAL' ? 'PARTIAL PAYMENT'
    : voucher.status === 'ADVANCE' ? 'ADVANCE PAYMENT'
    : 'FULL PAYMENT'

  const headingColor =
    voucher.status === 'PARTIAL' ? '#ea580c'
    : voucher.status === 'ADVANCE' ? '#2563eb'
    : '#16a34a'

  return (
    <div style={{
      border: '2px solid #1e3a5f',
      borderRadius: 6,
      padding: 20,
      fontFamily: 'Arial, sans-serif',
      fontSize: 11,
      color: '#1a1a1a',
      maxWidth: 600,
      margin: '0 auto',
    }}>
      <div style={{ textAlign: 'center', borderBottom: '2px solid #1e3a5f', paddingBottom: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1e3a5f' }}>{school?.name ?? 'School Name'}</div>
        <div style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: 2, marginTop: 6, textTransform: 'uppercase' }}>Payment Receipt</div>
        <div style={{ fontSize: 12, fontWeight: 'bold', marginTop: 8, color: headingColor }}>{heading}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14, fontSize: 10.5 }}>
        <div><b>Receipt Date:</b> {voucher.paidDate ? format(new Date(voucher.paidDate), 'dd MMM yyyy') : '—'}</div>
        <div><b>Voucher #:</b> <span style={{ fontFamily: 'monospace' }}>{voucher.voucherNumber}</span></div>
        <div><b>Received From:</b> {voucher.student.guardianName}</div>
        <div><b>Student:</b> {voucher.student.firstName} {voucher.student.lastName}</div>
        <div style={{ gridColumn: '1 / -1' }}><b>Class:</b> {voucher.student.class.name} – {voucher.student.class.section}</div>
        {paymentMode && (
          <div style={{ gridColumn: '1 / -1' }}><b>Payment Mode:</b> {paymentMode}</div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Payment Details:</div>
        {voucher.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
            <span>{item.description}</span>
            <span>{formatRs(item.amount)}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #1e3a5f', marginTop: 6, paddingTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span>Total Voucher Amount:</span><span>{formatRs(total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontWeight: 'bold', color: '#16a34a' }}>
            <span>Amount Received:</span><span>{formatRs(paid)}</span>
          </div>
          {voucher.status === 'PARTIAL' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#dc2626', marginTop: 4 }}>
              <span>Balance Remaining:</span><span>{formatRs(remaining)}</span>
            </div>
          )}
          {voucher.status === 'ADVANCE' && (
            <div style={{ marginTop: 6, fontWeight: 'bold', color: '#2563eb' }}>
              Advance Credit: {formatRs(advance)} (will be adjusted in next month&apos;s fee)
            </div>
          )}
          {voucher.status === 'PAID' && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Balance:</span><span>{formatRs(0)}</span>
            </div>
          )}
        </div>
      </div>

      {voucher.receivedBy && (
        <div style={{ marginBottom: 6, fontSize: 10.5 }}><b>Received By:</b> {voucher.receivedBy}</div>
      )}
      {voucher.notes && (
        <div style={{ marginBottom: 10, fontSize: 10.5, fontStyle: 'italic' }}><b>Notes:</b> {voucher.notes}</div>
      )}

      <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: 20, marginTop: 14, textAlign: 'center' }}>
        <div style={{ borderBottom: '1px solid #333', width: 200, margin: '0 auto 6px' }} />
        <div style={{ fontSize: 10, color: '#555' }}>Authorized Signature</div>
        <div style={{ marginTop: 14, fontSize: 11, color: '#16a34a', fontWeight: 'bold' }}>Thank you for your payment!</div>
      </div>
    </div>
  )
}
