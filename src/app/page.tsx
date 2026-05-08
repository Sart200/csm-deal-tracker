import Link from 'next/link'
import { Plus, AlertCircle, Clock, CheckCircle2, AlertTriangle, Users2 } from 'lucide-react'
import { buttonVariants } from '@/lib/button-variants'
import { ClientGanttRow, GANTT_GRID, TOTAL_ONBOARDING, TOTAL_PHASES } from '@/components/dashboard/ClientGanttRow'
import { ActivityTimeline } from '@/components/activity/ActivityTimeline'
import { createClient } from '@/lib/supabase/server'
import { getDealHealthDashboard, computeGlobalStats } from '@/lib/queries/dashboard'
import { getActivityLog } from '@/lib/queries/activity'
import { PHASE_NAMES } from '@/lib/utils'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Dashboard — CSM Tracker' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const [deals, recentActivity] = await Promise.all([
    getDealHealthDashboard(supabase),
    getActivityLog(supabase, { limit: 15 }),
  ])
  const stats = computeGlobalStats(deals)

  const criticalDeals = deals.filter(d => d.health === 'critical')
  const atRiskDeals   = deals.filter(d => d.health === 'at_risk')
  const onTrackDeals  = deals.filter(d => d.health === 'on_track')

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="shrink-0 px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Client Pipeline</h1>
          <Link href="/deals/new" className={buttonVariants({ variant: 'default', size: 'sm' })}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Deal
          </Link>
        </div>

        {/* KPI strip */}
        <div className="flex items-center gap-6 mt-3 flex-wrap">
          {[
            { label: 'Active',    value: stats.active_deals },
            { label: 'On Track',  value: stats.active_deals - stats.at_risk_deals - stats.critical_deals, color: 'text-emerald-600' },
            { label: 'At Risk',   value: stats.at_risk_deals,        color: stats.at_risk_deals > 0  ? 'text-amber-600' : undefined },
            { label: 'Critical',  value: stats.critical_deals,       color: stats.critical_deals > 0 ? 'text-red-600'   : undefined },
            { label: 'Overdue',   value: stats.total_overdue_tasks,  color: stats.total_overdue_tasks > 0 ? 'text-red-600' : undefined },
          ].map((kpi) => (
            <div key={kpi.label} className="flex items-baseline gap-1">
              <span className={cn('text-lg font-semibold text-gray-900', kpi.color)}>{kpi.value}</span>
              <span className="text-xs text-gray-400">{kpi.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Gantt panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-12">
              <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <Users2 className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-600">No active deals yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first deal to start tracking clients.</p>
              <Link href="/deals/new" className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'mt-4')}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Deal
              </Link>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Gantt header */}
              <div
                className="shrink-0 grid border-b border-gray-100 bg-gray-50/50 text-[10px] font-medium text-gray-400 uppercase tracking-wider"
                style={{ gridTemplateColumns: GANTT_GRID }}
              >
                <div className="px-3 py-2 border-r border-gray-100">Client</div>

                <div className="flex flex-col border-r border-gray-100">
                  <div className="px-2 py-1 border-b border-gray-100">Onboarding</div>
                  <div className="flex flex-1">
                    {Array.from({ length: TOTAL_ONBOARDING }, (_, i) => i + 1).map((n) => (
                      <div key={n} className="flex-1 px-0.5 py-1 text-center border-r border-gray-100 last:border-r-0">
                        T{n}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col border-r border-gray-100">
                  <div className="px-2 py-1 border-b border-gray-100">Phases</div>
                  <div className="flex flex-1">
                    {Array.from({ length: TOTAL_PHASES }, (_, i) => i + 1).map((num) => (
                      <div
                        key={num}
                        className="flex-1 px-0.5 py-1 text-center border-r border-gray-100 last:border-r-0 truncate"
                        title={PHASE_NAMES[num]}
                      >
                        P{num}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-3 py-2">Status</div>
              </div>

              {/* Scrollable rows — grouped by health */}
              <div className="flex-1 overflow-y-auto">

                {criticalDeals.length > 0 && (
                  <section>
                    <div className="sticky top-0 z-10 px-4 py-1.5 bg-white border-b border-gray-100">
                      <span className="text-[10px] font-medium text-red-500 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />
                        Critical · {criticalDeals.length} deal{criticalDeals.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {criticalDeals.map((deal, i) => (
                      <ClientGanttRow key={deal.id} deal={deal} index={i} />
                    ))}
                  </section>
                )}

                {atRiskDeals.length > 0 && (
                  <section>
                    <div className="sticky top-0 z-10 px-4 py-1.5 bg-white border-b border-gray-100">
                      <span className="text-[10px] font-medium text-amber-500 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                        At Risk · {atRiskDeals.length} deal{atRiskDeals.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {atRiskDeals.map((deal, i) => (
                      <ClientGanttRow key={deal.id} deal={deal} index={i} />
                    ))}
                  </section>
                )}

                {onTrackDeals.length > 0 && (
                  <section>
                    <div className="sticky top-0 z-10 px-4 py-1.5 bg-white border-b border-gray-100">
                      <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
                        On Track · {onTrackDeals.length} deal{onTrackDeals.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    {onTrackDeals.map((deal, i) => (
                      <ClientGanttRow key={deal.id} deal={deal} index={i} />
                    ))}
                  </section>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Activity sidebar */}
        <div className="w-64 shrink-0 border-l border-gray-100 bg-white flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <p className="text-xs font-medium text-gray-500">Recent Activity</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ActivityTimeline logs={recentActivity} />
          </div>
          <div className="px-4 py-2 border-t border-gray-100 shrink-0">
            <Link href="/activity" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              View all →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
