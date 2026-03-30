'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BlockerStatusBadge } from './BlockerStatusBadge'
import { BlockerDrawer } from './BlockerDrawer'
import {
  cn,
  formatDate,
  getBlockerCategoryClasses,
  getBlockerCategoryLabel,
  getDaysOpen,
  getInitials,
} from '@/lib/utils'
import type { BlockerWithDetails, TeamMember } from '@/types'

interface BlockerTableProps {
  blockers: BlockerWithDetails[]
  teamMembers: TeamMember[]
}

export function BlockerTable({ blockers, teamMembers }: BlockerTableProps) {
  const router = useRouter()
  const [selectedBlocker, setSelectedBlocker] = useState<BlockerWithDetails | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Sync selectedBlocker with fresh data after router.refresh()
  useEffect(() => {
    if (selectedBlocker) {
      const updated = blockers.find(b => b.id === selectedBlocker.id)
      if (updated) setSelectedBlocker(updated)
    }
  }, [blockers])

  function handleRowClick(blocker: BlockerWithDetails) {
    setSelectedBlocker(blocker)
    setDrawerOpen(true)
  }

  if (blockers.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-slate-400">
        No open blockers — great work!
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-semibold text-slate-500">Title</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Category</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Deal</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Project</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Phase</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Status</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Raised</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Days Open</TableHead>
              <TableHead className="text-xs font-semibold text-slate-500">Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blockers.map((blocker) => {
              const daysOpen = getDaysOpen(blocker.raised_at)
              return (
                <TableRow
                  key={blocker.id}
                  className="cursor-pointer hover:bg-blue-50/40 transition-colors"
                  onClick={() => handleRowClick(blocker)}
                >
                  <TableCell className="font-medium text-slate-800 max-w-[200px]">
                    <div className="flex items-start gap-1.5">
                      {blocker.status === 'escalated' && (
                        <span className="text-orange-500 mt-0.5 shrink-0">⚠</span>
                      )}
                      <span className="truncate">{blocker.title}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs border-0 px-1.5 py-0',
                        getBlockerCategoryClasses(blocker.category)
                      )}
                    >
                      {getBlockerCategoryLabel(blocker.category)}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-sm text-slate-600 max-w-[120px] truncate">
                    {blocker.deal?.client_name ?? '—'}
                  </TableCell>

                  <TableCell className="text-sm text-slate-600 max-w-[120px] truncate">
                    {blocker.project?.name ?? '—'}
                  </TableCell>

                  <TableCell className="text-sm text-slate-600">
                    {blocker.phase ? `P${blocker.phase.phase_number} — ${blocker.phase.name}` : '—'}
                  </TableCell>

                  <TableCell>
                    <BlockerStatusBadge status={blocker.status} />
                  </TableCell>

                  <TableCell className="text-sm text-slate-500">
                    {formatDate(blocker.raised_at)}
                  </TableCell>

                  <TableCell>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        daysOpen > 14 ? 'text-red-600' : daysOpen > 7 ? 'text-orange-500' : 'text-slate-600'
                      )}
                    >
                      {daysOpen}d
                    </span>
                  </TableCell>

                  <TableCell>
                    {blocker.owner_member ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-semibold text-slate-600">
                            {getInitials(blocker.owner_member.name)}
                          </span>
                        </div>
                        <span className="text-sm text-slate-600 truncate max-w-[80px]">
                          {blocker.owner_member.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <BlockerDrawer
        blocker={selectedBlocker}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdate={() => router.refresh()}
        teamMembers={teamMembers}
      />
    </>
  )
}
