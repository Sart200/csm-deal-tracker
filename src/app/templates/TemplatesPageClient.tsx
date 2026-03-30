'use client'

import { useState } from 'react'
import { Plus, Layout } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TemplateCard } from '@/components/templates/TemplateCard'
import { CreateTemplateModal } from '@/components/templates/CreateTemplateModal'
import { ApplyTemplateModal } from '@/components/templates/ApplyTemplateModal'
import { createClient } from '@/lib/supabase/client'
import { toggleTemplatePinned, archiveTemplate } from '@/lib/queries/templates'
import type { TemplateWithTasks, TeamMember } from '@/types'

interface TemplatesPageClientProps {
  templates: TemplateWithTasks[]
  teamMembers: TeamMember[]
}

export function TemplatesPageClient({ templates, teamMembers }: TemplatesPageClientProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [applyTemplate, setApplyTemplate] = useState<TemplateWithTasks | null>(null)

  const sharedTemplates = templates.filter((t) => t.scope === 'shared')
  const personalTemplates = templates.filter((t) => t.scope === 'personal')

  async function handlePin(id: string, pinned: boolean) {
    try {
      const supabase = createClient()
      await toggleTemplatePinned(supabase, id, pinned)
      router.refresh()
    } catch {
      toast.error('Failed to update pin')
    }
  }

  async function handleArchive(id: string) {
    if (!confirm('Archive this template? It will no longer appear in the list.')) return
    try {
      const supabase = createClient()
      await archiveTemplate(supabase, id)
      toast.success('Template archived')
      router.refresh()
    } catch {
      toast.error('Failed to archive template')
    }
  }

  function handleApply(template: TemplateWithTasks) {
    setApplyTemplate(template)
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Reusable task templates for projects and phases
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Template
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="shared">
        <TabsList>
          <TabsTrigger value="shared">
            Shared ({sharedTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="personal">
            Personal ({personalTemplates.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({templates.length})
          </TabsTrigger>
        </TabsList>

        {[
          { key: 'shared', list: sharedTemplates },
          { key: 'personal', list: personalTemplates },
          { key: 'all', list: templates },
        ].map(({ key, list }) => (
          <TabsContent key={key} value={key} className="mt-4">
            {list.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-xl">
                <Layout className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600">No templates here yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Create a template to speed up onboarding new projects.
                </p>
                <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Template
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isManager
                    onPin={handlePin}
                    onArchive={handleArchive}
                    onApply={handleApply}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Modals */}
      <CreateTemplateModal
        teamMembers={teamMembers}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <ApplyTemplateModal
        template={applyTemplate}
        open={applyTemplate !== null}
        onOpenChange={(v) => { if (!v) setApplyTemplate(null) }}
      />
    </>
  )
}
