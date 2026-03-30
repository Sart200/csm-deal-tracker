'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { DealStatusBadge } from './DealStatusBadge'
import { cn, formatDate, getInitials, getOnboardingProgress, getUserRoleLabel } from '@/lib/utils'
import type { DealWithRelations } from '@/types'

interface DealCardProps {
  deal: DealWithRelations
}

export function DealCard({ deal }: DealCardProps) {
  const progress = getOnboardingProgress(deal.onboarding_tasks ?? [])
  const projectCount = deal._project_count ?? deal.projects?.length ?? 0

  return (
    <Link href={`/deals/${deal.id}`} className="block group">
      <Card className="h-full hover:shadow-md transition-shadow border-slate-200 hover:border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
              {deal.client_name}
            </h3>
            <DealStatusBadge status={deal.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* CSM Owner */}
          {deal.csm && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-blue-700">
                  {getInitials(deal.csm.name)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{deal.csm.name}</p>
                <Badge
                  variant="outline"
                  className="text-xs border-0 bg-slate-100 text-slate-500 px-1.5 py-0"
                >
                  {getUserRoleLabel(deal.csm.role)}
                </Badge>
              </div>
            </div>
          )}

          {/* Deal Value */}
          {deal.deal_value != null && (
            <div className="text-sm text-slate-600">
              <span className="font-medium text-slate-800">
                ${deal.deal_value.toLocaleString()}
              </span>
              <span className="text-slate-400 ml-1">deal value</span>
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3">
            {/* Project count */}
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <span className="text-xs text-slate-500">
                {projectCount} project{projectCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Start date */}
            {deal.start_date && (
              <span className="text-xs text-slate-400">
                Started {formatDate(deal.start_date)}
              </span>
            )}
          </div>

          {/* Progress bars */}
          <div className="space-y-2">
            {/* Onboarding */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Onboarding</span>
                <span className={cn(progress === 100 ? 'text-green-600 font-medium' : '')}>
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Per-project */}
            {(deal.projects ?? []).map((project) => {
              const pct = project._task_progress ?? 0
              const hasNoTasks = project._total_tasks === 0 || project._total_tasks == null
              return (
                <div key={project.id} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span className="truncate max-w-[70%]">{project.name}</span>
                    <span className={cn(pct === 100 ? 'text-green-600 font-medium' : '')}>
                      {hasNoTasks ? '—' : `${pct}%`}
                    </span>
                  </div>
                  <Progress value={hasNoTasks ? 0 : pct} className="h-1.5" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
