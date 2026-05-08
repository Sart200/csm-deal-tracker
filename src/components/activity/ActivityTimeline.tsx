'use client'

import { cn, formatRelativeTime } from '@/lib/utils'
import { getActivityActionLabel } from '@/lib/queries/activity'
import type { ActivityLogWithActor } from '@/types'

interface ActivityTimelineProps {
  logs: ActivityLogWithActor[]
  showFilters?: boolean
}

const ACCENT_ACTIONS = new Set(['phase_skipped', 'blocker_escalated', 'blocker_raised'])
const SUCCESS_ACTIONS = new Set(['deal_created', 'project_created', 'task_completed', 'blocker_resolved'])

export function ActivityTimeline({ logs }: ActivityTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-400">
        No activity yet.
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {logs.map((log) => {
        const hasAccent = ACCENT_ACTIONS.has(log.action)
        const isSuccess = SUCCESS_ACTIONS.has(log.action)
        const label = getActivityActionLabel(log.action)
        const meta = (log.metadata ?? {}) as Record<string, string | number | undefined>

        const details: string[] = []
        if (meta.client_name) details.push(String(meta.client_name))
        if (meta.name) details.push(String(meta.name))
        if (meta.title) details.push(String(meta.title))
        if (meta.phase_name) details.push(`Phase: ${meta.phase_name}`)
        if (meta.task_number != null) details.push(`Task #${meta.task_number}`)
        if (meta.new_status) details.push(String(meta.new_status).replace(/_/g, ' '))
        if (meta.skip_reason) details.push(meta.skip_reason as string)
        if (meta.template_name) details.push(String(meta.template_name))

        return (
          <div
            key={log.id}
            className="px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className={cn(
                  'text-xs font-medium text-gray-700',
                  hasAccent && 'text-red-600',
                  isSuccess && !hasAccent && 'text-gray-900',
                )}>
                  {label}
                </p>

                {details.length > 0 && (
                  <p className="text-xs text-gray-400 truncate">{details.join(' · ')}</p>
                )}

                {log.actor_member && (
                  <p className="text-xs text-gray-400">{log.actor_member.name}</p>
                )}
              </div>

              <span className="text-[10px] text-gray-400 shrink-0 whitespace-nowrap mt-0.5">
                {formatRelativeTime(log.timestamp)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
