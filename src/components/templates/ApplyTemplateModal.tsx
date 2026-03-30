'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, LayoutTemplate, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { applyTemplateToProject, applyTemplateToPhase } from '@/lib/queries/templates'
import type { TemplateWithTasks } from '@/types'

interface ProjectOption {
  id: string
  name: string
  deal_name: string
}

interface PhaseOption {
  id: string
  phase_number: number
  name: string
  project_id: string
}

interface ApplyTemplateModalProps {
  template: TemplateWithTasks | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function ApplyTemplateModal({ template, open, onOpenChange }: ApplyTemplateModalProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [phases, setPhases] = useState<PhaseOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const [applying, setApplying] = useState(false)

  const isPhaseTemplate = template?.type === 'phase'

  useEffect(() => {
    if (!open || !template) return
    setSelectedProjectId(null)
    setSelectedPhaseId(null)

    async function load() {
      setLoadingData(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('projects')
          .select('id, name, deal:deals(id, client_name)')
          .order('created_at', { ascending: false })
        setProjects(
          (data ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            deal_name: p.deal?.client_name ?? 'Unknown Deal',
          }))
        )
      } catch {
        toast.error('Failed to load projects')
      } finally {
        setLoadingData(false)
      }
    }
    load()
  }, [open, template])

  useEffect(() => {
    if (!isPhaseTemplate || !selectedProjectId) { setPhases([]); return }

    async function loadPhases() {
      const supabase = createClient()
      const { data } = await supabase
        .from('phases')
        .select('id, phase_number, name, project_id')
        .eq('project_id', selectedProjectId)
        .order('phase_number')
      setPhases(data ?? [])
    }
    loadPhases()
  }, [isPhaseTemplate, selectedProjectId])

  async function handleApply() {
    if (!template) return
    if (!selectedProjectId) { toast.error('Select a project first'); return }
    if (isPhaseTemplate && !selectedPhaseId) { toast.error('Select a phase first'); return }

    setApplying(true)
    try {
      const supabase = createClient()
      const { data: member } = await supabase.from('team_members').select('id').limit(1).single()
      const actorId = member?.id ?? undefined

      if (isPhaseTemplate && selectedPhaseId) {
        await applyTemplateToPhase(supabase, template.id, selectedPhaseId, actorId)
      } else {
        await applyTemplateToProject(supabase, template.id, selectedProjectId, actorId)
      }

      toast.success(`Template "${template.name}" applied successfully`)
      onOpenChange(false)
      router.refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to apply template')
    } finally {
      setApplying(false)
    }
  }

  if (!template) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Use Template</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">
            Applying <strong>{template.name}</strong> — tasks will be appended to existing ones.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Select Project */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {isPhaseTemplate ? 'Step 1 — Select Project' : 'Select Project'}
            </p>

            {loadingData ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-slate-400 text-sm">
                <LayoutTemplate className="h-7 w-7 mb-2 opacity-40" />
                No projects found — create a deal and project first.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProjectId(p.id); setSelectedPhaseId(null) }}
                    className={cn(
                      'w-full text-left rounded-lg border px-3 py-2 transition-all',
                      selectedProjectId === p.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.deal_name}</p>
                      </div>
                      {selectedProjectId === p.id && (
                        <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Select Phase (only for phase templates) */}
          {isPhaseTemplate && selectedProjectId && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Step 2 — Select Phase
              </p>
              {phases.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-3">No phases found for this project.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {phases.map((ph) => (
                    <button
                      key={ph.id}
                      onClick={() => setSelectedPhaseId(ph.id)}
                      className={cn(
                        'w-full text-left rounded-lg border px-3 py-2 transition-all',
                        selectedPhaseId === ph.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            Phase {ph.phase_number} — {ph.name}
                          </p>
                        </div>
                        {selectedPhaseId === ph.id && (
                          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={applying || !selectedProjectId || (isPhaseTemplate && !selectedPhaseId)}
          >
            {applying ? 'Applying…' : 'Apply Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
