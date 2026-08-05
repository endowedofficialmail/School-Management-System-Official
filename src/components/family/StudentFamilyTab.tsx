import { getFamilyByStudentId } from '@/lib/actions/family'
import FamilyStudentGrid from '@/components/family/FamilyStudentGrid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'

export default async function StudentFamilyTab({
  studentId,
  guardianCNIC,
}: {
  studentId: number
  guardianCNIC?: string | null
}) {
  const { family, siblings } = await getFamilyByStudentId(studentId)

  if (!guardianCNIC) {
    return (
      <Card>
        <CardContent className="p-6 flex items-start gap-3 text-amber-800 bg-amber-50 rounded-lg">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Add Guardian CNIC to enable family linking</p>
            <p className="text-sm mt-1 text-amber-700">
              Guardian CNIC links siblings automatically when new students are added with the same CNIC.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {family && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-900">
              Family ID: {family.fid}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            Guardian CNIC: {family.guardianCNIC.replace(/(\d{5})(\d{7})(\d)/, '$1-$2-$3')}
          </CardContent>
        </Card>
      )}

      {siblings.length > 0 ? (
        <>
          <p className="text-sm text-muted-foreground">
            {siblings.length} sibling{siblings.length !== 1 ? 's' : ''} in this family
          </p>
          <FamilyStudentGrid students={siblings} />
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p className="font-medium text-slate-700">This student has no siblings in the system yet</p>
            <p className="text-sm mt-1">Guardian CNIC links siblings automatically when added</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
