'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { addOnboardingTask, updateOnboardingTask, deleteOnboardingTask } from '@/lib/queries/deals'
import { updateBlocker, createOnboardingBlocker } from '@/lib/queries/blockers'
import { BlockerStatusBadge } from '@/components/blockers/BlockerStatusBadge'
import { cn } from '@/lib/utils'
import type { OnboardingTask, TeamMember, PriorityLevel, BlockerCategory } from '@/types'

const OWNER_ROLES = ['CSM', 'AE', 'Client', 'SE', 'Manager']
const EVIDENCE_TYPES = ['Manual', 'Screenshot', 'Document', 'Email', 'Call Recording', 'Other']
const BLOCKER_CATEGORIES: { value: BlockerCategory; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'internal', label: 'Internal' },
  { value: 'technical', label: 'Technical' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
]

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  owner_role: z.string().optional(),
  evidence_type: z.string().optional(),
  evidence_notes: z.string().optional(),
  assignee: z.string().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  due_date: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
})

type FormValues = z.infer<typeof schema>

const PRIORITIES: { value: PriorityLevel; label: string; classes: string }[] = [
  { value: 'high', label: 'High', classes: 'border-red-300 bg-red-50 text-red-700' },
  { value: 'medium', label: 'Med', classes: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
  { value: 'low', label: 'Low', classes: 'border-slate-200 bg-slate-50 text-slate-500' },
]

interface OnboardingTaskModalProps {
  dealId: string
  teamMembers: TeamMember[]
  task?: OnboardingTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function OnboardingTaskModal({
  dealId,
  teamMembers,
  open,
  onOpenChange,
  onSuccess,
  task,
}: OnboardingTaskModalProps) {
  const isEdit = !!task
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Blocker resolve state
  const [resolveState, setResolveState] = useState<{
    loading: boolean; showNote: boolean; note: string
  }>({ loading: false, showNote: false, note: '' })

  // Add blocker form
  const [addingBlocker, setAddingBlocker] = useState(false)
  const [blockerTitle, setBlockerTitle] = useState('')
  const [blockerDesc, setBlockerDesc] = useState('')
  const [blockerCategory, setBlockerCategory] = useState<BlockerCategory>('internal')
  const [savingBlocker, setSavingBlocker] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      owner_role: 'CSM',
      evidence_type: 'Manual',
      evidence_notes: '',
      assignee: undefined,
      start_date: '',
      due_date: '',
      priority: 'medium',
    },
  })

  const ownerRole = watch('owner_role')
  const priority = watch('priority')

  useEffect(() => {
    if (open) {
      setConfirmDelete(false)
      setResolveState({ loading: false, showNote: false, note: '' })
      setAddingBlocker(false)
      setBlockerTitle('')
      setBlockerDesc('')
      setBlockerCategory('internal')
      if (task) {
        reset({
          title: task.title,
          owner_role: task.owner_role ?? 'CSM',
          evidence_type: task.evidence_type ?? 'Manual',
          evidence_notes: task.evidence_notes ?? '',
          assignee: task.completed_by ?? undefined,
          start_date: task.started_at ?? '',
          due_date: task.due_date ?? '',
          priority: task.priority ?? 'medium',
        })
      } else {
        reset({
          title: '',
          owner_role: 'CSM',
          evidence_type: 'Manual',
          evidence_notes: '',
          assignee: undefined,
          start_date: '',
          due_date: '',
          priority: 'medium',
        })
      }
    }
  }, [open, task, reset])

  const linkedBlocker = task?.linked_blocker ?? null
  const isResolved = linkedBlocker?.status === 'resolved'

  async function onSubmit(values: FormValues) {
    const supabase = createClient()
    try {
      if (isEdit && task) {
        await updateOnboardingTask(supabase, task.id, {
          title: values.title,
          owner_role: values.owner_role,
          evidence_type: values.evidence_type,
          evidence_notes: values.evidence_notes?.trim() || null,
          completed_by: values.assignee || null,
          started_at: values.start_date || null,
          due_date: values.due_date || null,
          priority: values.priority,
        })
        toast.success('Task updated')
      } else {
        await addOnboardingTask(supabase, dealId, values.title, {
          owner_role: values.owner_role,
          evidence_type: values.evidence_type,
          evidence_notes: values.evidence_notes?.trim() || null,
          started_at: values.start_date || null,
          due_date: values.due_date || null,
          priority: values.priority,
        })
        toast.success('Task added')
      }
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error(isEdit ? 'Failed to update task' : 'Failed to add task')
    }
  }

  async function handleDelete() {
    if (!task) return
    setDeleting(true)
    try {
      const supabase = createClient()
      await deleteOnboardingTask(supabase, task.id)
      toast.success('Task deleted')
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('Failed to delete task')
    } finally {
      setDeleting(false)
    }
  }

  async function handleResolveBlocker() {
    if (!linkedBlocker) return
    setResolveState((s) => ({ ...s, loading: true }))
    try {
      const supabase = createClient()
      await updateBlocker(supabase, linkedBlocker.id, {
        status: 'resolved',
        resolution_notes: resolveState.note.trim() || undefined,
      })
      toast.success('Blocker resolved')
      onSuccess()
    } catch {
      toast.error('Failed to resolve blocker')
      setResolveState((s) => ({ ...s, loading: false }))
    }
  }

  async function handleAddBlocker() {
    if (!task || !blockerTitle.trim()) return
    setSavingBlocker(true)
    try {
      const supabase = createClient()
      await createOnboardingBlocker(supabase, task.id, {
        title: blockerTitle.trim(),
        description: blockerDesc.trim() || undefined,
        category: blockerCategory,
      })
      toast.success('Blocker added')
      setAddingBlocker(false)
      onSuccess()
    } catch {
      toast.error('Failed to add blocker')
    } finally {
      setSavingBlocker(false)
    }
  }

  const assigneeId = watch('assignee')
  const assigneeName = teamMembers.find(m => m.id === assigneeId)?.name

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
          <p className="text-sm text-slate-500">Onboarding checklist</p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ob-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input id="ob-title" placeholder="Task title…" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select
              value={assigneeId ?? 'unassigned'}
              onValueChange={(v) => setValue('assignee', !v || v === 'unassigned' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue>
                  <span>{assigneeName ?? 'Unassigned'}</span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ob-start-date">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input id="ob-start-date" type="date" {...register('start_date')} />
              {errors.start_date && <p className="text-xs text-red-500">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-due-date">Due Date</Label>
              <Input id="ob-due-date" type="date" {...register('due_date')} />
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setValue('priority', p.value)}
                  className={cn(
                    'flex-1 py-1.5 text-sm font-medium rounded-md border transition-colors',
                    p.classes,
                    priority === p.value && 'ring-2 ring-offset-1 ring-blue-400'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Owner Role */}
          <div className="space-y-1.5">
            <Label>Owner Role</Label>
            <div className="flex flex-wrap gap-2">
              {OWNER_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setValue('owner_role', r)}
                  className={cn(
                    'flex-1 py-1.5 text-sm font-medium rounded-md border transition-colors min-w-[60px]',
                    'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
                    ownerRole === r && 'ring-2 ring-offset-1 ring-blue-400 bg-blue-50 border-blue-200 text-blue-700'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Evidence Type */}
          <div className="space-y-1.5">
            <Label>Evidence Type</Label>
            <Select
              value={watch('evidence_type') ?? 'Manual'}
              onValueChange={(v) => setValue('evidence_type', v ?? 'Manual')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select evidence type" />
              </SelectTrigger>
              <SelectContent>
                {EVIDENCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Evidence Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ob-notes">Evidence Notes (optional)</Label>
            <Textarea
              id="ob-notes"
              placeholder="Optional notes or instructions…"
              rows={3}
              {...register('evidence_notes')}
            />
          </div>

          {/* ── Blockers section (edit mode only) ─────────── */}
          {isEdit && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Blocker</Label>
                  {linkedBlocker && !isResolved && (
                    <span className="text-xs font-medium text-red-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Unresolved
                    </span>
                  )}
                  {linkedBlocker && isResolved && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Resolved
                    </span>
                  )}
                </div>
                {!linkedBlocker && !addingBlocker && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setAddingBlocker(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Add Blocker
                  </Button>
                )}
              </div>

              {/* Existing linked blocker */}
              {linkedBlocker && (
                <div className={cn(
                  'rounded-md border px-3 py-2.5 space-y-2',
                  isResolved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                )}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium leading-snug', isResolved ? 'text-green-800' : 'text-red-800')}>
                        {linkedBlocker.title}
                      </p>
                      {linkedBlocker.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{linkedBlocker.description}</p>
                      )}
                    </div>
                    <BlockerStatusBadge status={linkedBlocker.status} />
                  </div>

                  {isResolved && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resolved
                      {linkedBlocker.resolution_notes && (
                        <span className="text-slate-500 ml-1">· {linkedBlocker.resolution_notes}</span>
                      )}
                    </div>
                  )}

                  {!isResolved && (
                    <>
                      {resolveState.showNote && (
                        <Textarea
                          placeholder="Resolution notes (optional)…"
                          rows={2}
                          className="text-xs"
                          value={resolveState.note}
                          onChange={(e) => setResolveState((s) => ({ ...s, note: e.target.value }))}
                        />
                      )}
                      <div className="flex gap-2">
                        {!resolveState.showNote ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-slate-300"
                            onClick={() => setResolveState((s) => ({ ...s, showNote: true }))}
                          >
                            Add note
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setResolveState((s) => ({ ...s, showNote: false, note: '' }))}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                          disabled={resolveState.loading}
                          onClick={handleResolveBlocker}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {resolveState.loading ? 'Resolving…' : 'Mark Resolved'}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Add blocker inline form */}
              {addingBlocker && (
                <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2.5 space-y-2.5">
                  <p className="text-xs font-medium text-orange-700">New Blocker</p>
                  <Input
                    placeholder="Blocker title…"
                    value={blockerTitle}
                    onChange={(e) => setBlockerTitle(e.target.value)}
                    className="text-sm"
                  />
                  <Textarea
                    placeholder="Description (optional)…"
                    rows={2}
                    value={blockerDesc}
                    onChange={(e) => setBlockerDesc(e.target.value)}
                    className="text-xs"
                  />
                  <Select
                    value={blockerCategory}
                    onValueChange={(v) => setBlockerCategory(v as BlockerCategory)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCKER_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setAddingBlocker(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={!blockerTitle.trim() || savingBlocker}
                      onClick={handleAddBlocker}
                    >
                      {savingBlocker ? 'Saving…' : 'Save Blocker'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {isEdit && (
              confirmDelete ? (
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-xs text-red-600 font-medium">Delete this task?</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-7 text-xs"
                    disabled={deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mr-auto h-8 text-slate-400 hover:text-red-500 hover:bg-red-50 gap-1.5"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )
            )}

            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
