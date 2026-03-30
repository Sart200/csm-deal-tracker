import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/lib/button-variants'
import { Badge } from '@/components/ui/badge'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { ExportButton } from '@/components/export/ExportButton'
import { createClient } from '@/lib/supabase/server'
import { getProjectById } from '@/lib/queries/projects'
import { getTeamMembers } from '@/lib/queries/team'
import { cn, getInitials, getPriorityClasses, getPriorityLabel } from '@/lib/utils'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ dealId: string; projectId: string }>
}) {
  const { projectId } = await params
  const supabase = await createClient()
  const project = await getProjectById(supabase, projectId)
  return { title: project ? `${project.name} — CSM Tracker` : 'Project Not Found' }
}

export default async function ProjectKanbanPage({
  params,
}: {
  params: Promise<{ dealId: string; projectId: string }>
}) {
  const { dealId, projectId } = await params
  const supabase = await createClient()

  const [project, teamMembers] = await Promise.all([
    getProjectById(supabase, projectId),
    getTeamMembers(supabase),
  ])

  if (!project) notFound()

  const priorityClasses = getPriorityClasses(project.priority)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Link href="/deals" className="hover:text-slate-600 transition-colors">
                Deals
              </Link>
              <span>/</span>
              {project.deal && (
                <>
                  <Link
                    href={`/deals/${project.deal.id}`}
                    className="hover:text-slate-600 transition-colors"
                  >
                    {project.deal.client_name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <span className="text-slate-600 font-medium">{project.name}</span>
            </div>

            {/* Title row */}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              <ProjectStatusBadge status={project.status} />
              <Badge
                variant="outline"
                className={cn('text-xs border-0 px-2 py-0.5', priorityClasses.badge)}
              >
                {getPriorityLabel(project.priority)}
              </Badge>
            </div>

            {/* Meta */}
            {project.csm && (
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-white">
                    {getInitials(project.csm.name)}
                  </span>
                </div>
                <span>{project.csm.name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {project.deal && (
              <Link href={`/deals/${project.deal.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back to Deal
              </Link>
            )}
            <ExportButton project={project} scope="project" />
          </div>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-auto p-6">
        <KanbanBoard project={project} teamMembers={teamMembers} />
      </div>
    </div>
  )
}
