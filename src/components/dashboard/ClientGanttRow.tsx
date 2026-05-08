'use client'

import Link from 'next/link'
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { cn, getInitials, formatRelativeTime } from '@/lib/utils'
import { PHASE_NAMES } from '@/lib/utils'
import type { DealHealthData } from '@/lib/queries/dashboard'

// ─── constants ────────────────────────────────────────────────────────────────

export const TOTAL_ONBOARDING = 9
export const TOTAL_PHASES = 6

export const GANTT_GRID = '220px minmax(0,1fr) minmax(0,1fr) 130px'

// ─── colour maps ──────────────────────────────────────────────────────────────

const HEALTH_DOT: Record<string, string> = {
  on_track: 'bg-emerald-400',
  at_risk:  'bg-amber-400',
  critical: 'bg-red-400',
}

const HEALTH_LABEL: Record<string, { text: string; color: string }> = {
  on_track: { text: 'On Track', color: 'text-emerald-600' },
  at_risk:  { text: 'At Risk',  color: 'text-amber-600'  },
  critical: { text: 'Critical', color: 'text-red-500'    },
}

const PHASE_BAR: Record<string, { bar: string; label: string; textColor: string }> = {
  completed:   { bar: 'bg-blue-500',               label: '✓', textColor: 'text-white'     },
  in_progress: { bar: 'bg-blue-300 animate-pulse', label: '●', textColor: 'text-white'     },
  blocked:     { bar: 'bg-orange-400',             label: '!', textColor: 'text-white'     },
  skipped:     {
    bar: 'bg-gray-100 [background-size:8px_8px] [background-image:repeating-linear-gradient(135deg,transparent,transparent_2px,rgba(0,0,0,.06)_2px,rgba(0,0,0,.06)_4px)]',
    label: '/', textColor: 'text-gray-400',
  },
  not_started: { bar: 'bg-gray-50 border border-gray-100', label: '', textColor: 'text-gray-300' },
}

// ─── helper sub-components ────────────────────────────────────────────────────

function OBCell({ title, completedAt }: { title: string; completedAt: string | null | undefined }) {
  const done = !!completedAt
  const label = done ? '✓' : (title.length > 6 ? title.slice(0, 5) + '…' : title)
  return (
    <div
      className={cn(
        'flex-1 flex items-center justify-center border-r border-gray-100 last:border-r-0 transition-colors min-w-[28px]',
        done ? 'bg-emerald-400' : 'bg-gray-50',
      )}
      title={`${title} — ${done ? 'completed' : 'pending'}`}
    >
      <span className={cn('text-[9px] font-medium select-none truncate px-0.5', done ? 'text-white' : 'text-gray-400')}>
        {label}
      </span>
    </div>
  )
}

function PhaseCell({ phaseNum, status }: { phaseNum: number; status: string }) {
  const cfg = PHASE_BAR[status] ?? PHASE_BAR.not_started
  const phaseName = PHASE_NAMES[phaseNum] ?? `Phase ${phaseNum}`
  return (
    <div
      className={cn('flex-1 flex items-center justify-center border-r border-gray-100 last:border-r-0 relative', cfg.bar)}
      title={`P${phaseNum} · ${phaseName} · ${status.replace('_', ' ')}`}
    >
      <span className={cn('text-[9px] font-medium select-none z-10', cfg.textColor)}>
        {status === 'in_progress' ? `P${phaseNum}` : cfg.label || `P${phaseNum}`}
      </span>
    </div>
  )
}

function EmptySection() {
  return (
    <div className="flex items-center justify-center h-full bg-gray-50/30 border-r border-gray-100" />
  )
}

// ─── main export ──────────────────────────────────────────────────────────────

interface ClientGanttRowProps {
  deal: DealHealthData
  index: number
}

export function ClientGanttRow({ deal, index }: ClientGanttRowProps) {
  const health = HEALTH_LABEL[deal.health] ?? HEALTH_LABEL.on_track

  const onboardingPct = deal.onboarding_total > 0
    ? Math.round((deal.onboarding_done / deal.onboarding_total) * 100)
    : 0

  return (
    <div className="border-b border-gray-100 last:border-b-0">

      {/* ── Deal group header ───────────────────────────────────────────── */}
      <Link href={`/deals/${deal.id}`}>
        <div
          className="grid items-center hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100"
          style={{ gridTemplateColumns: GANTT_GRID }}
        >
          {/* Col 1: client name + CSM */}
          <div className="flex items-center gap-2 px-3 py-2 border-r border-gray-100">
            <div className={cn('h-2 w-2 rounded-full shrink-0', HEALTH_DOT[deal.health])} />
            {deal.csm ? (
              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-semibold text-gray-600">{getInitials(deal.csm.name)}</span>
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full bg-gray-100 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate leading-tight">{deal.client_name}</p>
              <p className="text-[10px] text-gray-400 truncate">
                {deal.csm?.name ?? 'Unassigned'}
                {deal.status === 'on_hold' && <span className="ml-1 text-amber-500">· On Hold</span>}
              </p>
            </div>
          </div>

          {/* Col 2: onboarding summary */}
          <div className="flex flex-col justify-center px-3 py-1.5 border-r border-gray-100 gap-0.5">
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>Onboarding</span>
              <span className={onboardingPct === 100 ? 'text-emerald-600' : ''}>
                {deal.onboarding_done}/{deal.onboarding_total}
              </span>
            </div>
            <div className="h-0.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', onboardingPct === 100 ? 'bg-emerald-400' : 'bg-blue-400')}
                style={{ width: `${onboardingPct}%` }}
              />
            </div>
          </div>

          {/* Col 3: phases summary */}
          <div className="flex flex-col justify-center px-3 py-1.5 border-r border-gray-100 gap-0.5">
            <div className="flex items-center justify-between text-[10px] text-gray-400">
              <span>{deal.projects.length} project{deal.projects.length !== 1 ? 's' : ''}</span>
              <span className={cn(health.color)}>{health.text}</span>
            </div>
            {deal.deal_value != null && (
              <p className="text-[10px] text-gray-400">
                ₹{(deal.deal_value / 100000).toFixed(1)}L
              </p>
            )}
          </div>

          {/* Col 4: indicators */}
          <div className="flex items-center justify-end px-3 py-2 gap-2 flex-wrap">
            {deal.total_open_blockers > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-red-500">
                <AlertCircle className="h-2.5 w-2.5" />{deal.total_open_blockers}
              </span>
            )}
            {deal.total_overdue_tasks > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                <Clock className="h-2.5 w-2.5" />{deal.total_overdue_tasks}
              </span>
            )}
            {deal.last_activity_at && (
              <span className="text-[10px] text-gray-400">{formatRelativeTime(deal.last_activity_at)}</span>
            )}
          </div>
        </div>
      </Link>

      {/* ── Onboarding sub-row ──────────────────────────────────────────── */}
      <div
        className="grid items-stretch border-b border-gray-100 last:border-b-0"
        style={{ gridTemplateColumns: GANTT_GRID }}
      >
        <div className="flex items-center gap-1.5 pl-8 pr-3 py-1.5 border-r border-gray-100">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-300 shrink-0" />
          <span className="text-[11px] text-gray-400">Onboarding</span>
        </div>

        <div className="flex h-7 border-r border-gray-100">
          {deal.onboarding_tasks.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[9px] text-gray-300 italic">No tasks</span>
            </div>
          ) : (
            deal.onboarding_tasks.map((t) => (
              <OBCell key={t.task_number} title={t.title} completedAt={t.completed_at} />
            ))
          )}
        </div>

        <EmptySection />

        <div className="px-3 py-1.5 flex items-center justify-end">
          {onboardingPct === 100 ? (
            <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
              <CheckCircle2 className="h-2.5 w-2.5" /> Done
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">{onboardingPct}%</span>
          )}
        </div>
      </div>

      {/* ── Project sub-rows ────────────────────────────────────────────── */}
      {deal.projects.length === 0 ? (
        <div
          className="grid items-center border-b border-gray-100 last:border-b-0"
          style={{ gridTemplateColumns: GANTT_GRID }}
        >
          <div className="pl-8 pr-3 py-1.5 border-r border-gray-100">
            <span className="text-[11px] text-gray-300 italic">No projects</span>
          </div>
          <EmptySection />
          <EmptySection />
          <div />
        </div>
      ) : (
        deal.projects.map((proj) => {
          const phaseMap: Record<number, string> = {}
          proj.phases.forEach((ph) => { phaseMap[ph.phase_number] = ph.status })

          return (
            <Link key={proj.id} href={`/deals/${deal.id}`}>
              <div
                className="grid items-stretch border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ gridTemplateColumns: GANTT_GRID }}
              >
                <div className="flex items-center gap-1.5 pl-8 pr-3 py-1.5 border-r border-gray-100 min-w-0">
                  <div className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    proj.status === 'active'    ? 'bg-blue-400'    :
                    proj.status === 'completed' ? 'bg-emerald-400' :
                    proj.status === 'on_hold'   ? 'bg-amber-400'   : 'bg-gray-300'
                  )} />
                  <span className="text-[11px] text-gray-600 truncate">{proj.name}</span>
                </div>

                <EmptySection />

                <div className="flex h-7 border-r border-gray-100">
                  {Array.from({ length: TOTAL_PHASES }, (_, i) => i + 1).map((phaseNum) => (
                    <PhaseCell key={phaseNum} phaseNum={phaseNum} status={phaseMap[phaseNum] ?? 'not_started'} />
                  ))}
                </div>

                <div className="px-3 py-1.5 flex items-center justify-end gap-1.5 flex-wrap">
                  {proj.open_blockers > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-red-500">
                      <AlertCircle className="h-2.5 w-2.5" />{proj.open_blockers}
                    </span>
                  )}
                  {proj.overdue_tasks > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                      <Clock className="h-2.5 w-2.5" />{proj.overdue_tasks}
                    </span>
                  )}
                  {proj.total_tasks > 0 && (
                    <span className="text-[10px] text-gray-400">
                      {proj.done_tasks}/{proj.total_tasks}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })
      )}
    </div>
  )
}
