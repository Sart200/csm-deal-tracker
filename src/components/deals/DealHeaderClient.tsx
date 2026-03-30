'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { DealStatusBadge } from './DealStatusBadge'
import { EditDealDialog } from './EditDealDialog'
import { formatDate, getInitials, getUserRoleLabel } from '@/lib/utils'
import type { DealWithRelations, TeamMember } from '@/types'

interface DealHeaderClientProps {
  deal: DealWithRelations
  teamMembers: TeamMember[]
}

export function DealHeaderClient({ deal, teamMembers }: DealHeaderClientProps) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <>
      <div className="flex flex-wrap items-start gap-3">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{deal.client_name}</h1>
            <DealStatusBadge status={deal.status} />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            {deal.csm && (
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-white">
                    {getInitials(deal.csm.name)}
                  </span>
                </div>
                <span>{deal.csm.name}</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">{getUserRoleLabel(deal.csm.role)}</span>
              </div>
            )}
            {deal.deal_value != null && (
              <span className="font-medium text-slate-700">
                ${deal.deal_value.toLocaleString()}
              </span>
            )}
            {deal.start_date && (
              <span>Started {formatDate(deal.start_date)}</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setEditOpen(true)}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
          title="Edit deal"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <EditDealDialog
        deal={deal}
        teamMembers={teamMembers}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  )
}
