'use client'

import Link from 'next/link'
import { Plus, FolderOpen } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { cn } from '@/lib/utils'
import type { ProjectSummary } from '@/types'

interface ProjectCardGridProps {
  projects: ProjectSummary[]
  dealId: string
}

export function ProjectCardGrid({ projects, dealId }: ProjectCardGridProps) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <FolderOpen className="h-7 w-7 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600 mb-1">No projects yet</p>
        <p className="text-sm text-slate-400 mb-5">
          Create your first project to start tracking progress.
        </p>
        <Link href={`/deals/${dealId}/projects/new`} className={cn(buttonVariants({ size: 'sm' }))}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Project
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href={`/deals/${dealId}/projects/new`} className={cn(buttonVariants({ size: 'sm' }))}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Project
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
