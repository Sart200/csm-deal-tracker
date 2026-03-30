import Link from 'next/link'
import { Plus, AlertCircle, Clock, TrendingUp, Users2, CheckCircle2, AlertTriangle } from 'lucide-react'
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
      <div className="shrink-0 px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Client Pipeline</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Live view of every client&apos;s journey across phases
            </p>
          </div>
          <Link href="/deals/new" className={buttonVariants({ variant: 'default', size: 'sm' })}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Deal
          </Link>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          {[
            { label: 'Active Deals',   value: stats.active_deals,                                              icon: TrendingUp,  color: 'text-blue-600',    bg: 'bg-blue-50'    },
            { label: 'On Track',       value: stats.active_deals - stats.at_risk_deals - stats.critical_deals, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'At Risk',        value: stats.at_risk_deals,                                             icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50'   },
            { label: 'Critical',       value: stats.critical_deals,                                            icon: AlertCircle, color: 'text-red-600',      bg: 'bg-red-50'     },
            { label: 'Overdue Tasks',  value: stats.total_overdue_tasks,                                       icon: Clock,       color: 'text-orange-600',   bg: 'bg-orange-50'  },
          ].map((kpi) => (
            <div key={kpi.label} className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2', kpi.bg)}>
              <kpi.icon className={cn('h-4 w-4 shrink-0', kpi.color)} />
              <div>
                <p className={cn('text-lg font-bold leading-none', kpi.color)}>{kpi.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{kpi.label}</p>
              </div>
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
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users2 className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No active deals yet</p>
              <p className="text-sm text-slate-400 mt-1">Create your first deal to start tracking clients.</p>
              <Link href="/deals/new" className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'mt-4')}>
                <Plus className="h-4 w-4 mr-1.5" />
                Create First Deal
              </Link>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Gantt header */}
              <div
                className="shrink-0 grid border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
                style={{ gridTemplateColumns: GANTT_GRID }}
              >
                {/* Col 1 */}
                <div className="px-3 py-2 border-r border-slate-200">Client</div>

                {/* Col 2: Onboarding T1–T9 */}
                <div className="flex flex-col border-r border-slate-200">
                  <div className="px-2 py-1 border-b border-slate-200 text-emerald-600">Onboarding</div>
                  <div className="flex flex-1">
                    {Array.from({ length: TOTAL_ONBOARDING }, (_, i) => i + 1).map((n) => (
                      <div key={n} className="flex-1 px-0.5 py-1 text-center border-r border-slate-200 last:border-r-0 text-slate-400">
                        T{n}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Col 3: Phases P1–P6 */}
                <div className="flex flex-col border-r border-slate-200">
                  <div className="px-2 py-1 border-b border-slate-200 text-blue-600">Phases</div>
                  <div className="flex flex-1">
                    {Array.from({ length: TOTAL_PHASES }, (_, i) => i + 1).map((num) => (
                      <div
                        key={num}
                        className="flex-1 px-0.5 py-1 text-center border-r border-slate-200 last:border-r-0 truncate text-slate-400"
                        title={PHASE_NAMES[num]}
                      >
                        P{num}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Col 4 */}
                <div className="px-3 py-2">Status</div>
              </div>

              {/* Scrollable rows — grouped by health */}
              <div className="flex-1 overflow-y-auto">

                {criticalDeals.length > 0 && (
                  <section>
                    <div className="sticky top-0 z-10 px-4 py-1.5 bg-red-50 border-b border-red-100">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3" />
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
                    <div className="sticky top-0 z-10 px-4 py-1.5 bg-amber-50 border-b border-amber-100">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" />
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
                    <div className="sticky top-0 z-10 px-4 py-1.5 bg-emerald-50 border-b border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" />
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
        <div className="w-72 shrink-0 border-l border-slate-200 bg-white flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 shrink-0">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Recent Activity</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <ActivityTimeline logs={recentActivity} />
          </div>
          <div className="px-4 py-2 border-t border-slate-100 shrink-0">
            <Link href="/activity" className="text-xs text-blue-600 hover:underline">
              View full log →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
