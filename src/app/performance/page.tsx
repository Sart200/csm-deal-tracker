import { CSMPerformanceCard } from '@/components/performance/CSMPerformanceCard'
import { WorkloadChart } from './WorkloadChart'
import { createClient } from '@/lib/supabase/server'
import { getCSMPerformance } from '@/lib/queries/analytics'

export const metadata = {
  title: 'CSM Performance — CSM Tracker',
}

export default async function PerformancePage() {
  const supabase = await createClient()
  const performanceData = await getCSMPerformance(supabase)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">CSM Performance</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Workload and performance overview across the team
        </p>
      </div>

      {/* Performance cards */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Team Overview
        </h2>
        {performanceData.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No team members found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {performanceData.map((member) => (
              <CSMPerformanceCard key={member.id} data={member} />
            ))}
          </div>
        )}
      </div>

      {/* Workload chart */}
      {performanceData.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Workload Distribution
          </h2>
          <WorkloadChart data={performanceData} />
        </div>
      )}
    </div>
  )
}
