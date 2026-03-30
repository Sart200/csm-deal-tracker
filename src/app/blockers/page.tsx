import { Badge } from '@/components/ui/badge'
import { BlockerTable } from '@/components/blockers/BlockerTable'
import { createClient } from '@/lib/supabase/server'
import { getAllOpenBlockers } from '@/lib/queries/blockers'
import { getTeamMembers } from '@/lib/queries/team'

export const metadata = {
  title: 'Open Blockers — CSM Tracker',
}

export default async function BlockersPage() {
  const supabase = await createClient()
  const [blockers, teamMembers] = await Promise.all([
    getAllOpenBlockers(supabase),
    getTeamMembers(supabase),
  ])

  const totalOpen = blockers.length
  const escalated = blockers.filter((b) => b.status === 'escalated').length
  const inResolution = blockers.filter((b) => b.status === 'in_resolution').length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Open Blockers</h1>
        <Badge
          variant="outline"
          className="text-sm font-semibold border-0 bg-orange-100 text-orange-700 px-2.5 py-0.5"
        >
          {totalOpen}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-orange-500">{totalOpen}</p>
          <p className="text-sm text-slate-500 mt-0.5">Total Open</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-red-600">{escalated}</p>
          <p className="text-sm text-slate-500 mt-0.5">Escalated</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-2xl font-bold text-yellow-600">{inResolution}</p>
          <p className="text-sm text-slate-500 mt-0.5">In Resolution</p>
        </div>
      </div>

      {/* Blocker table */}
      <BlockerTable blockers={blockers} teamMembers={teamMembers} />
    </div>
  )
}
