'use client'

import { useState } from 'react'
import { Pencil, Plus, X, GripVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProjectStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import {
  cn,
  getInitials,
  getPriorityClasses,
  getPriorityLabel,
  formatDate,
  getProjectTimeline,
  getDaysOpen,
  getProjectEffectiveStartDate,
} from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { updateProject, addPhase, deletePhase, updatePhase, reorderPhases } from '@/lib/queries/projects'
import type { ProjectWithPhases, TeamMember, ProjectStatus, PriorityLevel } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────────

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

type LocalPhase = {
  _key: string          // stable id for dnd + react key
  id: string | null     // null = new (not yet saved)
  name: string
  hasTasks: boolean     // can't delete if true
}

// ── Sortable stage row (inside Edit dialog) ────────────────────────────────────

function SortablePhaseRow({
  phase,
  index,
  onChange,
  onRemove,
}: {
  phase: LocalPhase
  index: number
  onChange: (name: string) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: phase._key })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex items-center gap-2', isDragging && 'opacity-50')}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors shrink-0 touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs text-slate-400 w-5 text-right shrink-0">{index + 1}.</span>
      <Input
        value={phase.name}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Stage ${index + 1}`}
        className="h-8 text-sm flex-1"
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={phase.hasTasks}
        className={cn(
          'shrink-0 transition-colors',
          phase.hasTasks
            ? 'text-slate-200 cursor-not-allowed'
            : 'text-slate-300 hover:text-red-400'
        )}
        title={phase.hasTasks ? 'Remove all tasks first' : 'Remove stage'}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Edit Project Dialog ────────────────────────────────────────────────────────

interface EditProjectDialogProps {
  project: ProjectWithPhases
  teamMembers: TeamMember[]
  open: boolean
  onOpenChange: (v: boolean) => void
}

function EditProjectDialog({ project, teamMembers, open, onOpenChange }: EditProjectDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Project fields
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [csmOwner, setCsmOwner] = useState(project.csm_owner ?? '')
  const [priority, setPriority] = useState<PriorityLevel>(project.priority)
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [targetDate, setTargetDate] = useState(project.target_completion_date ?? '')

  // Stages (local editable copy)
  const [localPhases, setLocalPhases] = useState<LocalPhase[]>(() =>
    buildLocalPhases(project)
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )

  function buildLocalPhases(p: ProjectWithPhases): LocalPhase[] {
    return [...p.phases]
      .sort((a, b) => a.phase_number - b.phase_number)
      .map((ph) => ({
        _key: ph.id,
        id: ph.id,
        name: ph.name,
        hasTasks: (ph.tasks?.length ?? 0) > 0,
      }))
  }

  // Reset everything when dialog opens
  function handleOpenChange(v: boolean) {
    if (v) {
      setName(project.name)
      setDescription(project.description ?? '')
      setCsmOwner(project.csm_owner ?? '')
      setPriority(project.priority)
      setStatus(project.status)
      setTargetDate(project.target_completion_date ?? '')
      setLocalPhases(buildLocalPhases(project))
    }
    onOpenChange(v)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setLocalPhases((prev) => {
        const oldIdx = prev.findIndex((p) => p._key === active.id)
        const newIdx = prev.findIndex((p) => p._key === over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  function addNewStage() {
    const key = `new-${Date.now()}`
    setLocalPhases((prev) => [...prev, { _key: key, id: null, name: '', hasTasks: false }])
  }

  function removeStage(key: string) {
    setLocalPhases((prev) => prev.filter((p) => p._key !== key))
  }

  function renameStage(key: string, newName: string) {
    setLocalPhases((prev) =>
      prev.map((p) => (p._key === key ? { ...p, name: newName } : p))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    try {
      const supabase = createClient()

      // 1. Update project metadata
      await updateProject(supabase, project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        csm_owner: csmOwner || undefined,
        priority,
        status,
        target_completion_date: targetDate || undefined,
      })

      // 2. Delete removed phases
      const keptIds = new Set(localPhases.map((p) => p.id).filter(Boolean))
      const toDelete = project.phases.filter((ph) => !keptIds.has(ph.id))
      for (const ph of toDelete) {
        await deletePhase(supabase, ph.id)
      }

      // 3. Rename changed phases
      const originalByKey = Object.fromEntries(project.phases.map((ph) => [ph.id, ph]))
      for (const lp of localPhases) {
        if (lp.id && originalByKey[lp.id] && originalByKey[lp.id].name !== lp.name.trim()) {
          await updatePhase(supabase, lp.id, { name: lp.name.trim() })
        }
      }

      // 4. Add new phases (in order they appear in localPhases)
      const newPhases = localPhases.filter((p) => p.id === null && p.name.trim())
      for (const np of newPhases) {
        const created = await addPhase(supabase, project.id, np.name.trim())
        // Update local id so reorder step can include it
        np.id = created.id
      }

      // 5. Reorder all remaining phases to match localPhases order
      const finalIds = localPhases
        .filter((p) => p.id !== null)
        .map((p) => p.id as string)
      if (finalIds.length > 0) {
        await reorderPhases(supabase, finalIds)
      }

      toast.success('Project updated')
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Project Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-name">
              Project Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-proj-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Migration"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-proj-desc">Description (optional)</Label>
            <Textarea
              id="edit-proj-desc"
              placeholder="What is this project about?"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={cn(
                    'flex-1 py-1.5 text-sm font-medium rounded-md border transition-colors',
                    p.value === 'high' && 'border-red-300 bg-red-50 text-red-700',
                    p.value === 'medium' && 'border-yellow-300 bg-yellow-50 text-yellow-700',
                    p.value === 'low' && 'border-slate-200 bg-slate-50 text-slate-500',
                    priority === p.value && 'ring-2 ring-offset-1 ring-blue-400',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* CSM Owner */}
          <div className="space-y-1.5">
            <Label>CSM Owner</Label>
            <Select value={csmOwner} onValueChange={(v) => setCsmOwner(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select CSM Owner">
                  {(v: string) => v ? (teamMembers.find((m) => m.id === v)?.name ?? v) : 'Select CSM Owner'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status + Target Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus((v ?? 'active') as ProjectStatus)}>
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => PROJECT_STATUSES.find((s) => s.value === v)?.label ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

          {/* Project Stages */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Project Stages</Label>
              <span className="text-xs text-slate-400">
                {localPhases.filter((p) => p.name.trim()).length} stages
              </span>
            </div>

            <DndContext
              id="edit-stages-dnd"
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localPhases.map((p) => p._key)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1.5">
                  {localPhases.map((phase, idx) => (
                    <SortablePhaseRow
                      key={phase._key}
                      phase={phase}
                      index={idx}
                      onChange={(val) => renameStage(phase._key, val)}
                      onRemove={() => removeStage(phase._key)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <button
              type="button"
              onClick={addNewStage}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 border border-dashed border-slate-200 hover:border-blue-300 rounded-md px-3 py-1.5 w-full transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Stage
            </button>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
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
  const [editOpen, setEditOpen] = useState(false)
  const priorityClasses = getPriorityClasses(project.priority)
  const effectiveStartDate = getProjectEffectiveStartDate(project.phases, project.created_at)

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
              <span className="text-xs text-slate-400">
                Started {formatDate(effectiveStartDate)}
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
                {getProjectTimeline(effectiveStartDate)}
                <span className="font-normal text-blue-400">({getDaysOpen(effectiveStartDate)}d)</span>
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

      {/* Stage overview bar — read-only status pills */}
      <div className="px-4 pt-3 pb-2 flex flex-wrap items-center gap-2 border-b border-slate-100">
        <span className="text-xs font-medium text-slate-500 mr-1">Stages:</span>
        {project.phases
          .sort((a, b) => a.phase_number - b.phase_number)
          .map((phase) => (
            <span
              key={phase.id}
              className={cn(
                'text-xs rounded-full px-2.5 py-1 border',
                phase.status === 'completed'  ? 'bg-green-50 border-green-200 text-green-700' :
                phase.status === 'in_progress' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                phase.status === 'blocked'     ? 'bg-orange-50 border-orange-200 text-orange-700' :
                phase.status === 'skipped'     ? 'bg-slate-100 border-slate-200 text-slate-400 line-through' :
                'bg-white border-slate-200 text-slate-500'
              )}
            >
              {phase.name}
            </span>
          ))}
        <button
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 border border-dashed border-slate-200 hover:border-blue-300 rounded-full px-2.5 py-1 transition-colors"
        >
          <Pencil className="h-3 w-3" />
          Edit stages
        </button>
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
