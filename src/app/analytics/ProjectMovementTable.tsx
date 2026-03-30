'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Clock, ArrowRight } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

type PhaseRow = {
  id: string
  phase_number: number
  name: string
  status: string
  started_at: string | null
  completed_at: string | null
  skipped_at: string | null
  days_in_phase: number | null
  transition_days: number | null
}

type ProjectRow = {
  id: string
  name: string
  status: string
  created_at: string
  deal: { id: string; client_name: string } | null
  phases: PhaseRow[]
}

interface ProjectMovementTableProps {
  projects: ProjectRow[]
}

function phaseStatusColor(status: string) {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-700'
    case 'in_progress': return 'bg-blue-100 text-blue-700'
    case 'blocked': return 'bg-orange-100 text-orange-700'
    case 'skipped': return 'bg-slate-100 text-slate-400 line-through'
    default: return 'bg-slate-50 text-slate-400'
  }
}

function phaseStatusLabel(status: string) {
  switch (status) {
    case 'not_started': return 'Not started'
    case 'in_progress': return 'In progress'
    case 'completed': return 'Completed'
    case 'skipped': return 'Skipped'
    case 'blocked': return 'Blocked'
    default: return status
  }
}

// Group projects by deal
function groupByDeal(projects: ProjectRow[]) {
  const map = new Map<string, { dealName: string; projects: ProjectRow[] }>()
  for (const p of projects) {
    const key = p.deal?.id ?? 'no-deal'
    const name = p.deal?.client_name ?? 'Unknown Deal'
    if (!map.has(key)) map.set(key, { dealName: name, projects: [] })
    map.get(key)!.projects.push(p)
  }
  return Array.from(map.entries()).map(([id, val]) => ({ id, ...val }))
}

export function ProjectMovementTable({ projects }: ProjectMovementTableProps) {
  const deals = groupByDeal(projects)
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(
    () => new Set(deals.map((d) => d.id))
  )
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    () => new Set(projects.map((p) => p.id))
  )

  function toggleDeal(id: string) {
    setExpandedDeals((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleProject(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (projects.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        No project data yet
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {deals.map((deal) => (
        <div key={deal.id} className="border border-slate-200 rounded-lg overflow-hidden">
          {/* Deal header */}
          <button
            onClick={() => toggleDeal(deal.id)}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            {expandedDeals.has(deal.id)
              ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
              : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            }
            <span className="text-sm font-semibold text-slate-700">{deal.dealName}</span>
            <span className="text-xs text-slate-400 ml-1">
              {deal.projects.length} project{deal.projects.length !== 1 ? 's' : ''}
            </span>
          </button>

          {expandedDeals.has(deal.id) && (
            <div className="divide-y divide-slate-100">
              {deal.projects.map((project) => {
                const totalDays = project.phases
                  .filter((ph) => ph.days_in_phase !== null && ph.status !== 'not_started')
                  .reduce((sum, ph) => sum + (ph.days_in_phase ?? 0), 0)
                const activePhasesCount = project.phases.filter(
                  (ph) => ph.status !== 'not_started' && ph.status !== 'skipped'
                ).length

                return (
                  <div key={project.id}>
                    {/* Project row */}
                    <button
                      onClick={() => toggleProject(project.id)}
                      className="w-full flex items-center gap-2 px-5 py-2 hover:bg-slate-50 transition-colors text-left"
                    >
                      {expandedProjects.has(project.id)
                        ? <ChevronDown className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                      }
                      <span className="text-sm font-medium text-slate-800 flex-1 truncate">
                        {project.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        Started {formatDate(project.created_at)}
                      </span>
                      {activePhasesCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 rounded-full px-2 py-0.5 shrink-0">
                          <Clock className="h-3 w-3" />
                          {totalDays}d total
                        </span>
                      )}
                    </button>

                    {/* Phase breakdown */}
                    {expandedProjects.has(project.id) && (
                      <div className="px-8 pb-3 space-y-1">
                        <div className="grid grid-cols-[1fr_80px_90px_90px_80px] gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wide py-1 border-b border-slate-100">
                          <span>Phase</span>
                          <span className="text-right">Status</span>
                          <span className="text-right">Started</span>
                          <span className="text-right">Ended</span>
                          <span className="text-right">Days</span>
                        </div>
                        {project.phases.map((phase, idx) => (
                          <div key={phase.id}>
                            <div className="grid grid-cols-[1fr_80px_90px_90px_80px] gap-2 items-center py-1.5 text-xs">
                              <span className="text-slate-700 font-medium truncate">
                                <span className="text-slate-400 mr-1.5">P{phase.phase_number}</span>
                                {phase.name}
                              </span>
                              <span className="text-right">
                                <span className={cn(
                                  'inline-block text-[10px] rounded px-1.5 py-0.5 font-medium',
                                  phaseStatusColor(phase.status)
                                )}>
                                  {phaseStatusLabel(phase.status)}
                                </span>
                              </span>
                              <span className="text-right text-slate-500">
                                {phase.started_at ? formatDate(phase.started_at) : '—'}
                              </span>
                              <span className="text-right text-slate-500">
                                {phase.completed_at
                                  ? formatDate(phase.completed_at)
                                  : phase.skipped_at
                                  ? formatDate(phase.skipped_at)
                                  : phase.status === 'in_progress' ? 'Ongoing' : '—'}
                              </span>
                              <span className={cn(
                                'text-right font-semibold',
                                phase.days_in_phase !== null
                                  ? phase.status === 'in_progress' ? 'text-blue-600' : 'text-slate-700'
                                  : 'text-slate-300'
                              )}>
                                {phase.days_in_phase !== null ? `${phase.days_in_phase}d` : '—'}
                              </span>
                            </div>
                            {/* Transition arrow between phases */}
                            {idx < project.phases.length - 1 && phase.transition_days !== null && (
                              <div className="flex items-center gap-1.5 ml-6 py-0.5 text-[10px] text-slate-400">
                                <ArrowRight className="h-3 w-3" />
                                <span>
                                  {phase.transition_days === 0
                                    ? 'Moved immediately'
                                    : `${phase.transition_days}d before next stage started`}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
