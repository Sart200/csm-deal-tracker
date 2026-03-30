import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProjectStatusBadge } from './ProjectStatusBadge'
import {
  cn,
  getInitials,
  getPriorityClasses,
  getPriorityLabel,
  getTimeInPhase,
  formatDate,
  getProjectTimeline,
  getDaysOpen,
} from '@/lib/utils'
import type { ProjectSummary } from '@/types'

interface ProjectCardProps {
  project: ProjectSummary
}

export function ProjectCard({ project }: ProjectCardProps) {
  const priorityClasses = getPriorityClasses(project.priority)

  // Find the in-progress phase
  const currentPhase = project.current_phase

  // Effective start = first task-driven date available, else created_at
  const effectiveStart = currentPhase?.started_at ?? project.created_at

  return (
    <Link href={`/deals/${project.deal_id}/projects/${project.id}`} className="block group">
      <Card
        className={cn(
          'h-full hover:shadow-md transition-shadow border-slate-200 hover:border-blue-200 border-l-4',
          priorityClasses.border
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
              {project.name}
            </h3>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <ProjectStatusBadge status={project.status} />
              <Badge
                variant="outline"
                className={cn('text-xs border-0 px-1.5 py-0', priorityClasses.badge)}
              >
                {getPriorityLabel(project.priority)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {/* Current phase */}
          <div>
            {currentPhase ? (
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    P{currentPhase.phase_number} — {currentPhase.name}
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  {getTimeInPhase(currentPhase.started_at)}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Not started</p>
            )}
          </div>

          {/* Start date + timeline */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">
              Started {formatDate(effectiveStart)}
            </span>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5">
              {getProjectTimeline(effectiveStart)} · {getDaysOpen(effectiveStart)}d
            </span>
          </div>

          {/* CSM Owner */}
          {project.csm && (
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-semibold text-blue-700">
                  {getInitials(project.csm.name)}
                </span>
              </div>
              <span className="text-xs text-slate-500 truncate">{project.csm.name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
