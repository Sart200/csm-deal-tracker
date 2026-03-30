import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BlockerStatusBadge } from '@/components/blockers/BlockerStatusBadge'
import {
  cn,
  getBlockerCategoryClasses,
  getBlockerCategoryLabel,
  getDaysOpen,
  getInitials,
} from '@/lib/utils'
import type { BlockerSummary } from '@/types'

interface BlockerCardProps {
  blocker: BlockerSummary
  onClick: () => void
}

export function BlockerCard({ blocker, onClick }: BlockerCardProps) {
  const isEscalated = blocker.status === 'escalated'
  const daysOpen = getDaysOpen(blocker.raised_at)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-md border bg-white px-3 py-2 text-sm',
        'hover:shadow-sm transition-shadow space-y-1.5',
        isEscalated
          ? 'border-orange-300 border-l-4 border-l-orange-500'
          : 'border-slate-200'
      )}
    >
      {/* Title row */}
      <div className="flex items-start gap-1.5">
        {isEscalated && (
          <AlertTriangle className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
        )}
        <p className="font-medium text-slate-800 leading-snug line-clamp-2 flex-1">
          {blocker.title}
        </p>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] border-0 px-1.5 py-0',
            getBlockerCategoryClasses(blocker.category)
          )}
        >
          {getBlockerCategoryLabel(blocker.category)}
        </Badge>

        <BlockerStatusBadge status={blocker.status} />

        <span className="text-xs text-slate-400 ml-auto shrink-0">
          {daysOpen}d open
        </span>

        {blocker.owner_member && (
          <div
            className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0"
            title={blocker.owner_member.name}
          >
            <span className="text-[9px] font-semibold text-slate-600">
              {getInitials(blocker.owner_member.name)}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
