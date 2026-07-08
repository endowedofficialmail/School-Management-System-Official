'use client'

import { useEffect, useState } from 'react'
import { getSchoolProfile } from '@/lib/actions/settings'

interface PrintHeaderProps {
  title: string
  subtitle?: string
  /** Pass school name directly to skip the DB fetch (e.g. when the parent already has it). */
  schoolName?: string
}

/**
 * Visible ONLY when printing. Place at the top of every printable report page.
 * On screen it takes no space; in print it renders school name, report title, and today's date.
 */
export default function PrintHeader({ title, subtitle, schoolName: nameProp }: PrintHeaderProps) {
  const [schoolName, setSchoolName] = useState(nameProp ?? '')

  useEffect(() => {
    if (!nameProp) {
      getSchoolProfile().then((p) => {
        if (p?.name) setSchoolName(p.name)
      })
    }
  }, [nameProp])

  return (
    <div className="hidden print:block mb-6 pb-4 border-b border-slate-300">
      {schoolName && (
        <h1 className="text-2xl font-bold text-slate-900">{schoolName}</h1>
      )}
      <h2 className="text-xl font-semibold text-slate-800 mt-0.5">{title}</h2>
      {subtitle && <p className="text-slate-600 mt-0.5">{subtitle}</p>}
      <p className="text-sm text-slate-500 mt-1">
        Generated on {new Date().toLocaleDateString('en-PK', { dateStyle: 'long' })}
      </p>
    </div>
  )
}
