import { ScrollText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getActivityLog } from '@/lib/queries/activity'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'

export const metadata = { title: 'Activity Log — CSM Tracker' }

export default async function ActivityPage() {
  const supabase = await createClient()
  const logs = await getActivityLog(supabase, { limit: 100 })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
          <ScrollText className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
          <p className="text-sm text-slate-500">Full audit trail across all deals and projects</p>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <ScrollText className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No activity yet</p>
          <p className="text-sm text-slate-400 mt-1">Events will appear here as your team uses the tracker.</p>
        </div>
      ) : (
        <ActivityTimeline logs={logs} showFilters />
      )}
    </div>
  )
}
