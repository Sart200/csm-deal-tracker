'use client'

import Link from 'next/link'
import { AlertTriangle, AlertCircle, CheckCircle2, Clock, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, getInitials, formatRelativeTime } from '@/lib/utils'
import { PHASE_NAMES } from '@/lib/utils'
import type { DealHealthData } from '@/lib/queries/dashboard'

const HEALTH_CONFIG = {
  on_track: {
    label: 'On Track',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-100',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  at_risk: {
    label: 'At Risk',
    icon: AlertTriangle,
    dot: 'bg-amber-400',
    ring: 'ring-amber-100',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  critical: {
    label: 'Critical',
    icon: AlertCircle,
    dot: 'bg-red-500',
    ring: 'ring-red-100',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
}

const PHASE_STATUS_STYLE = {
  completed:   { dot: 'bg-blue-600 border-blue-600',      text: 'text-blue-700',   label: 'Done' },
  in_progress: { dot: 'bg-blue-500 border-blue-500 animate-pulse', text: 'text-blue-600 font-semibold', label: 'Active' },
  skipped:     { dot: 'bg-slate-200 border-slate-300',     text: 'text-slate-400',  label: 'Skip' },
  not_started: { dot: 'bg-white border-slate-300',         text: 'text-slate-400',  label: '' },
}

interface ClientHealthCardProps {
  deal: DealHealthData
}

export function ClientHealthCard({ deal }: ClientHealthCardProps) {
  const health = HEALTH_CONFIG[deal.health]
  const HealthIcon = health.icon

  const onboardingPct = deal.onboarding_total > 0
    ? Math.round((deal.onboarding_done / deal.onboarding_total) * 100)
    : 0

  // Show first active project, fall back to first project
  const primaryProject = deal.projects.find(p => p.status === 'active') ?? deal.projects[0]

  return (
    <Link href={`/deals/${deal.id}`} className="block group">
      <div className={cn(
        'rounded-xl border bg-white transition-all duration-150',
        'hover:shadow-md hover:-translate-y-0.5',
        deal.health === 'critical' ? 'border-red-200' : deal.health === 'at_risk' ? 'border-amber-200' : 'border-slate-200'
      )}>
        {/* Card header */}
        <div className="px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 truncate">
                  {deal.client_name}
                </h3>
                {deal.status === 'on_hold' && (
                  <Badge variant="outline" className="text-[10px] border-0 bg-slate-100 text-slate-500 px-1.5 py-0">
                    On Hold
                  </Badge>
                )}
              </div>
              {deal.csm && (
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="h-4 w-4 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-[8px] font-bold text-white">{getInitials(deal.csm.name)}</span>
                  </div>
                  <span className="text-xs text-slate-500">{deal.csm.name}</span>
                </div>
              )}
            </div>

            {/* Health badge */}
            <div className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0',
              health.bg, health.text, health.border, 'border'
            )}>
              <div className={cn('h-1.5 w-1.5 rounded-full', health.dot)} />
              {health.label}
            </div>
          </div>
        </div>

        {/* Phase progress */}
        <div className="px-4 py-3 space-y-2.5">
          {deal.projects.length === 0 ? (
            <div className="flex items-center gap-2 py-1">
              <Layers className="h-3.5 w-3.5 text-slate-300 shrink-0" />
              <span className="text-xs text-slate-400">No projects yet</span>
            </div>
          ) : (
            (primaryProject ? [primaryProject] : []).map((proj) => (
              <div key={proj.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600 truncate">{proj.name}</span>
                  {proj.total_tasks > 0 && (
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {proj.done_tasks}/{proj.total_tasks} tasks
                    </span>
                  )}
                </div>

                {/* Phase steps */}
                <div className="flex items-center gap-0">
                  {proj.phases.map((phase, idx) => {
                    const style = PHASE_STATUS_STYLE[phase.status as keyof typeof PHASE_STATUS_STYLE] ?? PHASE_STATUS_STYLE.not_started
                    const isLast = idx === proj.phases.length - 1
                    return (
                      <div key={phase.phase_number} className="flex items-center flex-1">
                        {/* Node */}
                        <div
                          className="relative flex flex-col items-center"
                          title={`Phase ${phase.phase_number}: ${PHASE_NAMES[phase.phase_number] ?? phase.name} — ${phase.status.replace('_', ' ')}`}
                        >
                          <div className={cn(
                            'h-3 w-3 rounded-full border-2 transition-all',
                            style.dot,
                            phase.status === 'in_progress' && 'h-4 w-4 shadow-md shadow-blue-200'
                          )} />
                          <span className={cn('text-[9px] mt-0.5 whitespace-nowrap', style.text)}>
                            P{phase.phase_number}
                          </span>
                        </div>
                        {/* Connector */}
                        {!isLast && (
                          <div className={cn(
                            'h-0.5 flex-1 mx-0.5 mb-3',
                            phase.status === 'completed' ? 'bg-blue-400' : 'bg-slate-200'
                          )} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          {/* Secondary projects count */}
          {deal.projects.length > 1 && (
            <p className="text-[10px] text-slate-400">
              +{deal.projects.length - 1} more project{deal.projects.length - 1 > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Onboarding progress */}
        <div className="px-4 pb-3 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Onboarding</span>
            <span className={cn(
              'font-medium',
              onboardingPct === 100 ? 'text-emerald-600' : 'text-slate-600'
            )}>
              {deal.onboarding_done}/{deal.onboarding_total}
            </span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                onboardingPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'
              )}
              style={{ width: `${onboardingPct}%` }}
            />
          </div>
        </div>

        {/* Footer stats */}
        <div className="px-4 pb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {deal.total_open_blockers > 0 && (
              <div className={cn(
                'flex items-center gap-1 text-[11px] font-medium',
                deal.total_open_blockers > 0 ? 'text-red-600' : 'text-slate-400'
              )}>
                <AlertCircle className="h-3 w-3" />
                {deal.total_open_blockers} blocker{deal.total_open_blockers !== 1 ? 's' : ''}
              </div>
            )}
            {deal.total_overdue_tasks > 0 && (
              <div className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                <Clock className="h-3 w-3" />
                {deal.total_overdue_tasks} overdue
              </div>
            )}
            {deal.total_open_blockers === 0 && deal.total_overdue_tasks === 0 && (
              <span className="text-[11px] text-slate-400">No issues</span>
            )}
          </div>

          {deal.last_activity_at && (
            <span className="text-[10px] text-slate-400 shrink-0">
              {formatRelativeTime(deal.last_activity_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
