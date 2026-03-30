'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BlockerCard } from './BlockerCard'
import { cn } from '@/lib/utils'
import type { BlockerSummary, PhaseStatus } from '@/types'

interface BlockersSectionProps {
  blockers: BlockerSummary[]
  phaseId: string
  phaseStatus: PhaseStatus
  onBlockerClick: (b: BlockerSummary) => void
  onAddBlocker: () => void
}

export function BlockersSection({
  blockers,
  phaseId,
  phaseStatus,
  onBlockerClick,
  onAddBlocker,
}: BlockersSectionProps) {
  const [isOpen, setIsOpen] = useState(blockers.length > 0)

  const openBlockers = blockers.filter((b) => b.status !== 'resolved')
  const hasOpenBlockers = openBlockers.length > 0
  const isSkipped = phaseStatus === 'skipped'

  return (
    <div className="border-t border-slate-100 pt-2">
      {/* Header toggle */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          {hasOpenBlockers && !isOpen && (
            <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0" />
          )}
          <span>Blockers</span>
          {blockers.length > 0 && (
            <span
              className={cn(
                'inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                hasOpenBlockers
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-slate-100 text-slate-500'
              )}
            >
              {blockers.length}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="mt-2 space-y-2">
          {blockers.map((blocker) => (
            <BlockerCard
              key={blocker.id}
              blocker={blocker}
              onClick={() => onBlockerClick(blocker)}
            />
          ))}

          {blockers.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">No blockers</p>
          )}

          <Button
            size="sm"
            variant="ghost"
            disabled={isSkipped}
            onClick={onAddBlocker}
            className="w-full text-xs h-7 text-slate-500 hover:text-slate-700 border border-dashed border-slate-200 hover:border-slate-300"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Blocker
          </Button>
        </div>
      )}
    </div>
  )
}
