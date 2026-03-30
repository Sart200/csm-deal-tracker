import { Users, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getTeamMembers } from '@/lib/queries/team'
import { TeamPageClient, AddButton } from './TeamPageClient'

export const metadata = { title: 'Team — CSM Tracker' }

export default async function TeamPage() {
  const supabase = await createClient()
  const members = await getTeamMembers(supabase)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Users className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Team</h1>
            <p className="text-sm text-slate-500">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <AddButton />
      </div>

      <TeamPageClient members={members} />
    </div>
  )
}
