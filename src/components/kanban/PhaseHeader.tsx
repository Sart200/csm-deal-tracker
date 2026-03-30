'use client'

import { SkipForward, RotateCcw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, getPhaseStatusClasses, getPhaseStatusLabel, getTimeInPhase } from '@/lib/utils'
import type { PhaseWithTasks } from '@/types'

interface PhaseHeaderProps {
  phase: PhaseWithTasks
  onSkip: () => void
  onReopen: () => void
}

export function PhaseHeader({ phase, onSkip, onReopen }: PhaseHeaderProps) {
  const openBlockerCount = phase.blockers.filter((b) => b.status !== 'resolved').length
  const isSkipped = phase.status === 'skipped'
  const isCompleted = phase.status === 'completed'
  const canSkip = !isSkipped && !isCompleted
  const canReopen = isSkipped

  return (
    <div className="space-y-1.5 pb-3 border-b border-slate-200">
      {/* Phase number + name row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 inline-flex h-6 w-8 items-center justify-center rounded-md bg-slate-700 text-[11px] font-bold text-white">
            P{phase.phase_number}
          </span>
          <h3 className="text-sm font-semibold text-slate-800 leading-snug truncate">
            {phase.name}
          </h3>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {canSkip && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-slate-400 hover:text-orange-600"
              title="Skip phase"
              onClick={onSkip}
            >
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
          )}
          {canReopen && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-slate-400 hover:text-blue-600"
              title="Re-open phase"
              onClick={onReopen}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Status + meta row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn('text-xs border-0 px-1.5 py-0', getPhaseStatusClasses(phase.status))}
        >
          {getPhaseStatusLabel(phase.status)}
        </Badge>

        {phase.started_at && !isSkipped && (
          <span className="text-xs text-slate-400">
            {getTimeInPhase(phase.started_at)}
          </span>
        )}

        {openBlockerCount > 0 && (
          <div className="flex items-center gap-0.5 text-orange-500 ml-auto">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-xs font-medium">{openBlockerCount}</span>
          </div>
        )}
      </div>
    </div>
  )
}
