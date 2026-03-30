'use client'

import { useState, useRef } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { cn, getInitials, getPriorityClasses, getPriorityLabel, formatDate, getProjectTimeline, getDaysOpen } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { updateProject, addPhase, deletePhase } from '@/lib/queries/projects'
import type { ProjectWithPhases, TeamMember, ProjectStatus, PriorityLevel } from '@/types'

const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PRIORITIES: { value: PriorityLevel; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

interface EditProjectDialogProps {
  project: ProjectWithPhases
  teamMembers: TeamMember[]
  open: boolean
  onOpenChange: (v: boolean) => void
}

function EditProjectDialog({ project, teamMembers, open, onOpenChange }: EditProjectDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [csmOwner, setCsmOwner] = useState(project.csm_owner ?? '')
  const [priority, setPriority] = useState<PriorityLevel>(project.priority)
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [targetDate, setTargetDate] = useState(project.target_completion_date ?? '')

  // Reset on open
  function handleOpenChange(v: boolean) {
    if (v) {
      setName(project.name)
      setDescription(project.description ?? '')
      setCsmOwner(project.csm_owner ?? '')
      setPriority(project.priority)
      setStatus(project.status)
      setTargetDate(project.target_completion_date ?? '')
    }
    onOpenChange(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const supabase = createClient()
      await updateProject(supabase, project.id, {
        name: name.trim(),
        description: description || undefined,
        csm_owner: csmOwner || undefined,
        priority,
        status,
        target_completion_date: targetDate || undefined,
      })
      toast.success('Project updated')
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Failed to update project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-name">Project Name <span className="text-red-500">*</span></Label>
            <Input
              id="edit-proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Migration"
              required
            />
          </div>

          {/* CSM Owner + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CSM Owner</Label>
              <Select value={csmOwner} onValueChange={(v) => setCsmOwner(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select CSM Owner">
                    {(v: string) => v ? (teamMembers.find(m => m.id === v)?.name ?? v) : 'Select CSM Owner'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus((v ?? 'active') as ProjectStatus)}>
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => PROJECT_STATUSES.find(s => s.value === v)?.label ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority + Target Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      'flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors',
                      p.value === 'high' && 'border-red-200 text-red-600 hover:bg-red-50',
                      p.value === 'medium' && 'border-yellow-200 text-yellow-600 hover:bg-yellow-50',
                      p.value === 'low' && 'border-slate-200 text-slate-500 hover:bg-slate-50',
                      priority === p.value && 'ring-2 ring-offset-1 ring-blue-400',
                      p.value === 'high' && priority === p.value && 'bg-red-50',
                      p.value === 'medium' && priority === p.value && 'bg-yellow-50',
                      p.value === 'low' && priority === p.value && 'bg-slate-50',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-target-date">Target Completion</Label>
              <Input
                id="edit-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-desc">Description</Label>
            <Textarea
              id="edit-proj-desc"
              placeholder="What is this project about?"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main section ───────────────────────────────────────────────────────────────

interface ProjectInlineSectionProps {
  project: ProjectWithPhases
  teamMembers: TeamMember[]
}

export function ProjectInlineSection({ project, teamMembers }: ProjectInlineSectionProps) {
  const router = useRouter()
  const supabase = createClient()
  const [editOpen, setEditOpen] = useState(false)
  const [addingStage, setAddingStage] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [addingStageLoading, setAddingStageLoading] = useState(false)
  const [deletingPhaseId, setDeletingPhaseId] = useState<string | null>(null)
  const stageInputRef = useRef<HTMLInputElement>(null)
  const priorityClasses = getPriorityClasses(project.priority)

  async function handleAddStage() {
    if (!newStageName.trim()) return
    setAddingStageLoading(true)
    try {
      await addPhase(supabase, project.id, newStageName.trim())
      toast.success('Stage added')
      setNewStageName('')
      setAddingStage(false)
      router.refresh()
    } catch {
      toast.error('Failed to add stage')
    } finally {
      setAddingStageLoading(false)
    }
  }

  async function handleDeletePhase(phaseId: string, phaseName: string) {
    if (!confirm(`Delete stage "${phaseName}"? This cannot be undone.\n\nNote: stages with tasks cannot be deleted.`)) return
    setDeletingPhaseId(phaseId)
    try {
      await deletePhase(supabase, phaseId)
      toast.success('Stage removed')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove stage')
    } finally {
      setDeletingPhaseId(null)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Project header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-900">{project.name}</h3>
              <ProjectStatusBadge status={project.status} />
              <Badge
                variant="outline"
                className={cn('text-xs border-0 px-2 py-0.5', priorityClasses.badge)}
              >
                {getPriorityLabel(project.priority)}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {project.csm && (
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-white">
                      {getInitials(project.csm.name)}
                    </span>
                  </div>
                  <span>{project.csm.name}</span>
                </div>
              )}
              {/* Start date + running timeline */}
              <span className="text-xs text-slate-400">
                Started {formatDate(project.created_at)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                {getProjectTimeline(project.created_at)}
                <span className="font-normal text-blue-400">({getDaysOpen(project.created_at)}d)</span>
              </span>
              {project.target_completion_date && (
                <span className="text-xs text-slate-400">
                  Target: {formatDate(project.target_completion_date)}
                </span>
              )}
              {project.description && (
                <span className="text-xs text-slate-400 truncate max-w-xs">
                  {project.description}
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={() => setEditOpen(true)}
            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
            title="Edit project"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Stage management bar */}
      <div className="px-4 pt-3 pb-1 flex flex-wrap items-center gap-2 border-b border-slate-100">
        <span className="text-xs font-medium text-slate-500 mr-1">Stages:</span>
        {project.phases.map((phase) => (
          <div
            key={phase.id}
            className={cn(
              'group flex items-center gap-1 text-xs rounded-full px-2.5 py-1 border',
              phase.status === 'completed' ? 'bg-blue-50 border-blue-200 text-blue-700' :
              phase.status === 'in_progress' ? 'bg-amber-50 border-amber-200 text-amber-700' :
              phase.status === 'skipped' ? 'bg-slate-100 border-slate-200 text-slate-400 line-through' :
              'bg-white border-slate-200 text-slate-600',
              deletingPhaseId === phase.id && 'opacity-40'
            )}
          >
            <span>{phase.name}</span>
            <button
              onClick={() => handleDeletePhase(phase.id, phase.name)}
              disabled={deletingPhaseId === phase.id}
              className="ml-0.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all"
              title="Remove stage"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}

        {addingStage ? (
          <div className="flex items-center gap-1.5">
            <Input
              ref={stageInputRef}
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="Stage name…"
              className="h-6 text-xs w-32 px-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddStage()
                if (e.key === 'Escape') { setAddingStage(false); setNewStageName('') }
              }}
            />
            <Button size="sm" className="h-6 text-xs px-2" onClick={handleAddStage} disabled={addingStageLoading || !newStageName.trim()}>
              {addingStageLoading ? '…' : 'Add'}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => { setAddingStage(false); setNewStageName('') }}>
              Cancel
            </Button>
          </div>
        ) : (
          <button
            onClick={() => { setAddingStage(true); setTimeout(() => stageInputRef.current?.focus(), 50) }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 border border-dashed border-slate-200 hover:border-blue-300 rounded-full px-2.5 py-1 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add Stage
          </button>
        )}
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto p-4">
        <KanbanBoard project={project} teamMembers={teamMembers} />
      </div>

      <EditProjectDialog
        project={project}
        teamMembers={teamMembers}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  )
}
