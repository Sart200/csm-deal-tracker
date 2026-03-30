'use client'

import { cn, formatRelativeTime, getUserRoleLabel } from '@/lib/utils'
import { getActivityActionIcon, getActivityActionLabel } from '@/lib/queries/activity'
import type { ActivityLogWithActor } from '@/types'

interface ActivityTimelineProps {
  logs: ActivityLogWithActor[]
  showFilters?: boolean
}

const ACCENT_ACTIONS = new Set(['phase_skipped', 'blocker_escalated', 'blocker_raised'])
const SUCCESS_ACTIONS = new Set(['deal_created', 'project_created', 'task_completed', 'blocker_resolved'])
const MUTED_ACTIONS = new Set(['task_updated', 'deal_updated', 'project_updated', 'blocker_updated'])

export function ActivityTimeline({ logs }: ActivityTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-400">
        No activity recorded yet.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

      <div className="space-y-1">
        {logs.map((log) => {
          const hasAccent = ACCENT_ACTIONS.has(log.action)
          const isSuccess = SUCCESS_ACTIONS.has(log.action)
          const isMuted = MUTED_ACTIONS.has(log.action)
          const icon = getActivityActionIcon(log.action)
          const label = getActivityActionLabel(log.action)
          const meta = (log.metadata ?? {}) as Record<string, string | number | undefined>

          // Build a human-readable detail line from metadata
          const details: string[] = []
          if (meta.client_name) details.push(String(meta.client_name))
          if (meta.name) details.push(String(meta.name))
          if (meta.title) details.push(String(meta.title))
          if (meta.phase_name) details.push(`Phase: ${meta.phase_name}`)
          if (meta.task_number != null) details.push(`Task #${meta.task_number}`)
          if (meta.new_status) details.push(`→ ${String(meta.new_status).replace(/_/g, ' ')}`)
          if (meta.skip_reason) details.push(`Reason: ${meta.skip_reason}`)
          if (meta.priority) details.push(`Priority: ${meta.priority}`)
          if (meta.category) details.push(`Category: ${meta.category}`)
          if (meta.template_name) details.push(`Template: ${meta.template_name}`)
          if (meta.deal_value != null) details.push(`$${Number(meta.deal_value).toLocaleString()}`)

          return (
            <div
              key={log.id}
              className={cn(
                'relative pl-12 pr-4 py-3 rounded-lg transition-colors hover:bg-slate-50',
                hasAccent && 'border-l-4 border-l-orange-400 pl-10 ml-1 bg-orange-50/30 hover:bg-orange-50/50',
                isSuccess && !hasAccent && 'hover:bg-green-50/30',
                isMuted && 'opacity-70'
              )}
            >
              {/* Icon bubble */}
              <div
                className={cn(
                  'absolute left-2.5 top-3 h-5 w-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[11px]',
                  hasAccent && 'border-orange-300 bg-orange-50',
                  isSuccess && !hasAccent && 'border-green-300 bg-green-50'
                )}
              >
                {icon}
              </div>

              {/* Content */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className={cn(
                    'text-sm font-medium',
                    hasAccent ? 'text-orange-800' : isSuccess ? 'text-slate-800' : 'text-slate-700'
                  )}>
                    {label}
                  </p>

                  {/* Detail line */}
                  {details.length > 0 && (
                    <p className="text-xs text-slate-500 truncate max-w-[360px]">
                      {details.join(' · ')}
                    </p>
                  )}

                  {/* Actor */}
                  {log.actor_member && (
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <span className="font-medium text-slate-500">{log.actor_member.name}</span>
                      <span>·</span>
                      <span>{getUserRoleLabel(log.actor_member.role)}</span>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                  {formatRelativeTime(log.timestamp)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
