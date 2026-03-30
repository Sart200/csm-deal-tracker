import { BarChart3, TrendingUp, SkipForward, GitBranch } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPipelineMetrics, getProjectMovementAnalytics } from '@/lib/queries/analytics'
import { AnalyticsCharts } from './AnalyticsCharts'
import { ProjectMovementTable } from './ProjectMovementTable'

export const metadata = { title: 'Analytics — CSM Tracker' }

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const [{ avgPhaseTime, skipRates }, projectMovement] = await Promise.all([
    getPipelineMetrics(supabase),
    getProjectMovementAnalytics(supabase),
  ])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500">Pipeline metrics, phase timing, and skip rate trends</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Avg phase duration */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-700">Avg. Phase Duration (days)</h2>
          </div>
          {avgPhaseTime.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No completed phases yet</p>
          ) : (
            <AnalyticsCharts
              avgPhaseTime={avgPhaseTime}
              skipRates={skipRates}
            />
          )}
        </div>

        {/* Skip rates */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <SkipForward className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-semibold text-slate-700">Phase Skip Rate (%)</h2>
          </div>
          {skipRates.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No phase data yet</p>
          ) : (
            <div className="space-y-3">
              {skipRates
                .sort((a, b) => a.phase_number - b.phase_number)
                .map((r) => (
                  <div key={r.phase_number} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500 w-24 shrink-0">
                      P{r.phase_number}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-orange-400"
                        style={{ width: `${r.skip_rate}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-10 text-right">
                      {r.skip_rate}%
                    </span>
                    <span className="text-xs text-slate-400 w-20 text-right">
                      {r.skipped}/{r.total}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Phase timing table */}
      {avgPhaseTime.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Phase Performance Summary</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left pb-2 font-medium">Phase</th>
                <th className="text-right pb-2 font-medium">Avg Duration</th>
                <th className="text-right pb-2 font-medium">Completed</th>
                <th className="text-right pb-2 font-medium">Skip Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {avgPhaseTime
                .sort((a, b) => a.phase_number - b.phase_number)
                .map((p) => {
                  const skipData = skipRates.find((s) => s.phase_number === p.phase_number)
                  return (
                    <tr key={p.phase_number} className="text-slate-700">
                      <td className="py-3">
                        <span className="font-medium text-xs text-slate-500 mr-2">P{p.phase_number}</span>
                        {p.name}
                      </td>
                      <td className="py-3 text-right font-semibold text-blue-600">
                        {p.avg_days}d
                      </td>
                      <td className="py-3 text-right text-slate-500">{p.count}</td>
                      <td className="py-3 text-right">
                        <span className={skipData && skipData.skip_rate > 20 ? 'text-orange-600 font-medium' : 'text-slate-500'}>
                          {skipData?.skip_rate ?? 0}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Project Phase Movement — per deal, per project */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-4 w-4 text-blue-600" />
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Project Phase Movement</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Days spent in each phase and transition time between stages, grouped by deal
            </p>
          </div>
        </div>
        <ProjectMovementTable projects={projectMovement} />
      </div>
    </div>
  )
}
