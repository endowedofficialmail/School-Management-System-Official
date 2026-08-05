'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { GitBranch, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import Breadcrumb from '@/components/shared/Breadcrumb'
import BackButton from '@/components/shared/BackButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import FamilyStudentGrid from '@/components/family/FamilyStudentGrid'
import {
  searchFamilies,
  getFamilyByFID,
  getFamilyByCNIC,
  retroactivelyLinkFamilies,
} from '@/lib/actions/family'
import { formatCNIC } from '@/lib/utils'

type FamilyResult = Awaited<ReturnType<typeof searchFamilies>>[number]

export default function FamilyTreePage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<FamilyResult[]>([])
  const [selectedFamily, setSelectedFamily] = useState<FamilyResult | null>(null)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linking, setLinking] = useState(false)
  const [linkResult, setLinkResult] = useState<{ familiesCreated: number; studentsLinked: number } | null>(null)

  async function handleSearch() {
    const q = query.trim()
    if (!q) { toast.error('Enter a Family ID or Guardian CNIC'); return }
    setLoading(true)
    try {
      if (/^FAM-/i.test(q)) {
        const family = await getFamilyByFID(q)
        setSelectedFamily(family as FamilyResult)
        setResults([])
      } else if (/^\d/.test(q.replace(/[-\s]/g, ''))) {
        const family = await getFamilyByCNIC(q)
        setSelectedFamily(family as FamilyResult)
        setResults([])
      } else {
        const list = await searchFamilies(q)
        setResults(list)
        setSelectedFamily(list.length === 1 ? list[0] : null)
      }
    } catch {
      setResults([])
      setSelectedFamily(null)
      toast.error('No family found for this search')
    } finally {
      setLoading(false)
    }
  }

  async function handleRetroLink() {
    setLinking(true)
    try {
      const result = await retroactivelyLinkFamilies()
      setLinkResult(result)
      toast.success(`${result.familiesCreated} families created, ${result.studentsLinked} students linked`)
      setLinkDialogOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to link families')
    } finally {
      setLinking(false)
    }
  }

  const displayFamily = selectedFamily

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Students', href: '/students' },
        { label: 'Family Tree' },
      ]} />

      <div className="flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            Family Tree
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Search families by Family ID or Guardian CNIC
          </p>
        </div>
      </div>

      <div className="flex gap-2 max-w-xl">
        <Input
          placeholder="Search by Family ID (FAM-XXXX) or Guardian CNIC"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="h-10"
        />
        <Button onClick={handleSearch} disabled={loading} className="gap-2 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </Button>
      </div>

      {results.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{results.length} families found — select one:</p>
          {results.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={async () => {
                try {
                  const full = await getFamilyByFID(f.fid)
                  setSelectedFamily(full as FamilyResult)
                } catch {
                  setSelectedFamily(f)
                }
              }}
              className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors"
            >
              <span className="font-mono font-semibold">{f.fid}</span>
              <span className="text-muted-foreground ml-2">— {f.guardianName} ({f._count.students} students)</span>
            </button>
          ))}
        </div>
      )}

      {displayFamily && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Family ID: {displayFamily.fid}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Guardian CNIC</span>
                <span className="font-mono">{formatCNIC(displayFamily.guardianCNIC)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Guardian</span>
                <span>{displayFamily.students[0]?.guardianName ?? '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs uppercase">Total Siblings</span>
                <span className="font-semibold">{displayFamily.students.length}</span>
              </div>
            </div>
            <FamilyStudentGrid students={displayFamily.students} />
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-sm">Link Existing Students by CNIC</p>
              <p className="text-xs text-muted-foreground">
                Scan all students and automatically link siblings based on guardian CNIC.
              </p>
              {linkResult && (
                <p className="text-xs text-emerald-700 mt-1">
                  Last run: {linkResult.familiesCreated} families created, {linkResult.studentsLinked} students linked
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => setLinkDialogOpen(true)}>
              Run Family Linking
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Existing Students by CNIC</DialogTitle>
            <DialogDescription>
              This will scan all existing students and automatically link siblings based on guardian CNIC.
              This runs once and is safe to run.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRetroLink} disabled={linking}>
              {linking ? 'Linking…' : 'Confirm & Run'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
