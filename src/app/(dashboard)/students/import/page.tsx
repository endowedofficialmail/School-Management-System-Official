'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertTriangle, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import Breadcrumb from '@/components/shared/Breadcrumb'
import BackButton from '@/components/shared/BackButton'
import {
  validateImportRows,
  bulkImportStudents,
  type ImportRow,
  type ImportError,
  type CredentialRow,
} from '@/lib/actions/bulk-import'

const MAX_BYTES = 5 * 1024 * 1024

async function parseFile(file: File): Promise<string[][]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (results) => resolve(results.data as string[][]),
        error: (err) => reject(err),
        skipEmptyLines: true,
      })
    })
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as string[][]
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function downloadExcelTemplate() {
  const rows = [
    ['First Name', 'Last Name', 'Gender', 'Class Name', 'Section', 'Guardian Name', 'Guardian Phone', 'Guardian CNIC', 'Date of Birth', 'Address', 'Admission Date', 'Status'],
    ['Muhammad', 'Ali', 'Male', 'Grade 1', 'A', 'Muhammad Khan', '0300-1234567', '37405-1234567-1', '2015-03-15', 'House 123 Street 4', '2024-04-01', 'Active'],
    ['Sara', 'Ahmed', 'Female', 'Grade 2', 'B', 'Ahmed Ali', '0311-9876543', '', '2014-07-22', '', '2024-04-01', 'Active'],
    ['Hassan', 'Raza', 'Male', 'Grade 1', 'A', 'Ali Raza', '0321-5556677', '', '', 'Street 9 Block B', '2024-04-01', 'Active'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Students')
  XLSX.writeFile(wb, 'student-import-template.xlsx')
}

export default function BulkImportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })

  const [validRows, setValidRows] = useState<ImportRow[]>([])
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([])
  const [validated, setValidated] = useState(false)

  const [result, setResult] = useState<{
    imported: number
    failed: number
    credentialsList: CredentialRow[]
    errors: { rowNumber: number; error: string }[]
  } | null>(null)

  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.replace('/students')
    }
  }, [status, isAdmin, router])

  const onFile = useCallback((f: File | null) => {
    if (!f) return
    const name = f.name.toLowerCase()
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      toast.error('Only CSV or Excel files are allowed')
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('File too large. Max size is 5MB')
      return
    }
    setFile(f)
    setValidated(false)
    setValidRows([])
    setValidationErrors([])
    setResult(null)
  }, [])

  async function handleValidate() {
    if (!file) return
    setValidating(true)
    setResult(null)
    try {
      const raw = await parseFile(file)
      const { valid, errors } = await validateImportRows(raw)
      setValidRows(valid)
      setValidationErrors(errors)
      setValidated(true)
      toast.success(`Validated: ${valid.length} ready, ${errors.length} with errors`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to validate file')
    } finally {
      setValidating(false)
    }
  }

  async function handleImport() {
    if (!validRows.length || !session?.user?.id) return
    setImporting(true)
    setImportProgress({ done: 0, total: validRows.length })

    // Simulate progress ticks while server processes (single request)
    const tick = setInterval(() => {
      setImportProgress((p) => ({
        ...p,
        done: Math.min(p.total - 1, p.done + 1),
      }))
    }, 120)

    try {
      const res = await bulkImportStudents(validRows, Number(session.user.id))
      clearInterval(tick)
      setImportProgress({ done: res.imported + res.failed, total: validRows.length })
      setResult(res)
      toast.success(`Imported ${res.imported} students`)
    } catch (e) {
      clearInterval(tick)
      toast.error(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const parentStats = useMemo(() => {
    if (!result) return { created: 0, linked: 0 }
    let created = 0
    let linked = 0
    for (const c of result.credentialsList) {
      if (c.parentAccountStatus.includes('New')) created++
      else if (c.parentEmail) linked++
    }
    return { created, linked }
  }, [result])

  function downloadErrorReport() {
    const rows = [
      ['Row', 'Errors', 'Raw Data'],
      ...validationErrors.map((e) => [String(e.rowNumber), e.errors.join('; '), e.rowData]),
    ]
    downloadCsv('import-errors.csv', rows)
  }

  function downloadCredentials() {
    if (!result) return
    const rows = [
      ['Student Name', 'Reg#', 'Class', 'Student Email', 'Student Password', 'Parent Email', 'Parent Password', 'Parent Account Status'],
      ...result.credentialsList.map((c) => [
        c.studentName,
        c.registrationNumber,
        c.className,
        c.studentEmail,
        c.studentPassword,
        c.parentEmail,
        c.parentPassword,
        c.parentAccountStatus,
      ]),
    ]
    downloadCsv('portal-credentials.csv', rows)
  }

  function printCredentials() {
    if (!result) return
    sessionStorage.setItem(
      'portal-credentials-print',
      JSON.stringify(
        result.credentialsList.map((c) => ({
          studentName: c.studentName,
          registrationNumber: c.registrationNumber,
          className: c.className,
          studentEmail: c.studentEmail,
          studentPassword: c.studentPassword,
          parentEmail: c.parentEmail,
          parentPassword: c.parentPassword,
        }))
      )
    )
    window.open('/print/credentials', '_blank')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Students', href: '/students' },
        { label: 'Bulk Import' },
      ]} />

      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bulk Student Import</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Import multiple students from a CSV or Excel file and auto-create portal accounts
          </p>
        </div>
      </div>

      {/* Step 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1: Download Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Required columns: First Name, Last Name, Gender, Class Name, Section, Guardian Name, Guardian Phone.
            Optional: Guardian CNIC, Date of Birth, Address, Admission Date, Status.
          </p>
          <div className="flex flex-wrap gap-2">
            <a href="/api/students/import-template" className={cn(buttonVariants({ variant: 'outline' }))}>
              <Download className="h-4 w-4 mr-2" /> Download CSV Template
            </a>
            <Button type="button" variant="outline" onClick={downloadExcelTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Download Excel Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 2: Upload Your File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center hover:bg-slate-100"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              onFile(e.dataTransfer.files?.[0] ?? null)
            }}
          >
            <Upload className="h-8 w-8 text-slate-400 mb-2" />
            <p className="font-medium text-slate-700">Drag and drop your CSV or Excel file here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse (.csv, .xlsx, .xls — max 5MB)</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {file && (
            <div className="flex items-center justify-between rounded-lg border bg-white p-3 text-sm">
              <span className="font-medium">{file.name}</span>
              <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          )}

          {file && (
            <Button onClick={handleValidate} disabled={validating}>
              {validating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking your file...</>
              ) : (
                'Validate File'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 3 */}
      {validated && (
        <div className="space-y-4">
          {validationErrors.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-semibold">
                  <AlertTriangle className="h-5 w-5" />
                  {validationErrors.length} rows have errors and will be skipped
                </div>
                <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {validationErrors.slice(0, 20).map((e) => (
                    <li key={e.rowNumber}>
                      Row {e.rowNumber}: {e.errors.join('; ')}
                    </li>
                  ))}
                </ul>
                <Button type="button" variant="outline" size="sm" onClick={downloadErrorReport}>
                  Download Error Report
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="border-emerald-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                {validRows.length} rows ready to import
              </div>
              {validRows.length > 0 && (
                <>
                  <p className="text-sm text-muted-foreground">Preview (first 5 rows):</p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Guardian</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRows.slice(0, 5).map((r) => (
                        <TableRow key={r.rowNumber}>
                          <TableCell>{r.firstName} {r.lastName}</TableCell>
                          <TableCell>{r.className}-{r.section}</TableCell>
                          <TableCell>{r.guardianName}</TableCell>
                          <TableCell>{r.guardianPhone}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleImport}
                    disabled={importing || validRows.length === 0}
                  >
                    {importing
                      ? `Importing students... (${importProgress.done} of ${importProgress.total} done)`
                      : `Import ${validRows.length} Students`}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4 */}
      {result && (
        <div className="space-y-4">
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-4 space-y-2">
              <p className="font-bold text-lg text-emerald-800">✓ Import Complete!</p>
              <p className="text-sm">✓ {result.imported} students imported successfully</p>
              {result.failed > 0 && (
                <p className="text-sm text-red-700">✗ {result.failed} students failed</p>
              )}
              <div className="text-sm pt-2 space-y-1">
                <p className="font-medium">Portal accounts created:</p>
                <p>• {result.credentialsList.filter((c) => c.studentEmail).length} student portal accounts</p>
                <p>• {parentStats.created} new parent accounts created</p>
                <p>• {parentStats.linked} parents linked to existing accounts (siblings — same phone number)</p>
              </div>
              {result.errors.length > 0 && (
                <ul className="text-xs text-red-700 mt-2 space-y-1">
                  {result.errors.map((e) => (
                    <li key={e.rowNumber}>Row {e.rowNumber}: {e.error}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">📋 Portal Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Download the credentials list to distribute to students and parents.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={downloadCredentials}>
                  <Download className="h-4 w-4 mr-2" /> Download Credentials CSV
                </Button>
                <Button variant="outline" onClick={printCredentials}>
                  Print Credentials Slips
                </Button>
                <Link href="/students" className={cn(buttonVariants({ variant: 'secondary' }))}>
                  Go to Students List
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
