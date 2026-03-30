import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import { buttonVariants } from '@/lib/button-variants'
import { DealHeaderClient } from '@/components/deals/DealHeaderClient'
import { OnboardingChecklist } from '@/components/deals/OnboardingChecklist'
import { ProjectInlineSection } from '@/components/deals/ProjectInlineSection'
import { ExportButton } from '@/components/export/ExportButton'
import { createClient } from '@/lib/supabase/server'
import { getDealById } from '@/lib/queries/deals'
import { getProjectsByDealWithTasks } from '@/lib/queries/projects'
import { getTeamMembers } from '@/lib/queries/team'

export async function generateMetadata({ params }: { params: Promise<{ dealId: string }> }) {
  const { dealId } = await params
  const supabase = await createClient()
  const deal = await getDealById(supabase, dealId)
  return { title: deal ? `${deal.client_name} — CSM Tracker` : 'Deal Not Found' }
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>
}) {
  const { dealId } = await params
  const supabase = await createClient()
  const [deal, projects, teamMembers] = await Promise.all([
    getDealById(supabase, dealId),
    getProjectsByDealWithTasks(supabase, dealId),
    getTeamMembers(supabase),
  ])

  if (!deal) notFound()

  return (
    <div className="p-6 max-w-full mx-auto space-y-6">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Link href="/deals" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm text-slate-500">All Deals</span>
      </div>

      {/* Deal header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <DealHeaderClient deal={deal} teamMembers={teamMembers} />
        </div>
        <ExportButton deal={deal} scope="deal" />
      </div>

      {/* Onboarding */}
      <section>
        <h2 className="text-base font-semibold text-slate-800 mb-3">Onboarding</h2>
        <OnboardingChecklist
          tasks={deal.onboarding_tasks ?? []}
          dealId={deal.id}
          teamMembers={teamMembers}
        />
      </section>

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Projects */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Projects ({projects.length})
          </h2>
          <Link
            href={`/deals/${dealId}/projects/new`}
            className={buttonVariants({ variant: 'default', size: 'sm' })}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Project
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-sm font-medium text-slate-600">No projects yet</p>
            <p className="text-sm text-slate-400 mt-1">Create a project to start tracking phases and tasks.</p>
            <Link
              href={`/deals/${dealId}/projects/new`}
              className={buttonVariants({ variant: 'default', size: 'sm' }) + ' mt-4'}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create First Project
            </Link>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectInlineSection
              key={project.id}
              project={project}
              teamMembers={teamMembers}
            />
          ))
        )}
      </section>
    </div>
  )
}
