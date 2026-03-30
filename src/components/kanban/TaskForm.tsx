'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { createTask, updateTask, deleteTask } from '@/lib/queries/tasks'
import { updateBlocker } from '@/lib/queries/blockers'
import { BlockerStatusBadge } from '@/components/blockers/BlockerStatusBadge'
import type { BlockerSummary, TaskWithDetails, TeamMember, PriorityLevel } from '@/types'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  assignee: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  start_date: z.string().min(1, 'Start date is required'),
  due_date: z.string().optional(),
  description: z.string().optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface TaskFormProps {
  phaseId: string
  phaseName: string
  teamMembers: TeamMember[]
  task?: TaskWithDetails
  blockers?: BlockerSummary[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const PRIORITIES: { value: PriorityLevel; label: string; classes: string }[] = [
  { value: 'high', label: 'High', classes: 'border-red-300 bg-red-50 text-red-700 data-[active]:bg-red-100' },
  { value: 'medium', label: 'Med', classes: 'border-yellow-300 bg-yellow-50 text-yellow-700 data-[active]:bg-yellow-100' },
  { value: 'low', label: 'Low', classes: 'border-slate-200 bg-slate-50 text-slate-500 data-[active]:bg-slate-100' },
]

export function TaskForm({
  phaseId,
  phaseName,
  teamMembers,
  task,
  blockers = [],
  open,
  onOpenChange,
  onSuccess,
}: TaskFormProps) {
  const isEdit = !!task
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Per-blocker resolve state
  const [resolveState, setResolveState] = useState<
    Record<string, { loading: boolean; showNote: boolean; note: string }>
  >({})

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', assignee: undefined, priority: 'medium', start_date: '', due_date: '', description: '' },
  })

  const priority = watch('priority')

  useEffect(() => {
    if (open) {
      setConfirmDelete(false)
      setResolveState({})
      if (task) {
        reset({
          title: task.title,
          assignee: task.assignee ?? undefined,
          priority: task.priority,
          start_date: task.started_at ? task.started_at.split('T')[0] : '',
          due_date: task.due_date ?? '',
          description: task.description ?? '',
        })
      } else {
        reset({ title: '', assignee: undefined, priority: 'medium', start_date: '', due_date: '', description: '' })
      }
    }
  }, [open, task, reset])

  // Blockers linked to this task
  const linkedBlockers = task ? blockers.filter((b) => b.task_id === task.id) : []
  const unresolvedCount = linkedBlockers.filter((b) => b.status !== 'resolved').length

  async function onSubmit(values: TaskFormValues) {
    const supabase = createClient()
    try {
      if (isEdit && task) {
        await updateTask(supabase, task.id, {
          title: values.title,
          assignee: values.assignee || undefined,
          priority: values.priority,
          start_date: values.start_date,
          due_date: values.due_date || undefined,
          description: values.description || undefined,
        })
        toast.success('Task updated')
      } else {
        await createTask(supabase, phaseId, {
          title: values.title,
          assignee: values.assignee || undefined,
          priority: values.priority,
          start_date: values.start_date,
          due_date: values.due_date || undefined,
          description: values.description || undefined,
        })
        toast.success('Task created')
      }
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error(isEdit ? 'Failed to update task' : 'Failed to create task')
    }
  }

  async function handleDelete() {
    if (!task) return
    setDeleting(true)
    try {
      const supabase = createClient()
      await deleteTask(supabase, task.id)
      toast.success('Task deleted')
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('Failed to delete task')
    } finally {
      setDeleting(false)
    }
  }

  function patchResolve(id: string, patch: Partial<{ loading: boolean; showNote: boolean; note: string }>) {
    setResolveState((prev) => ({
      ...prev,
      [id]: { loading: false, showNote: false, note: '', ...prev[id], ...patch },
    }))
  }

  async function handleResolveBlocker(blockerId: string) {
    const state = resolveState[blockerId] ?? { loading: false, showNote: false, note: '' }
    patchResolve(blockerId, { loading: true })
    try {
      const supabase = createClient()
      await updateBlocker(supabase, blockerId, {
        status: 'resolved',
        resolution_notes: state.note.trim() || undefined,
      })
      toast.success('Blocker resolved')
      onSuccess()
    } catch {
      toast.error('Failed to resolve blocker')
      patchResolve(blockerId, { loading: false })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
          <p className="text-sm text-slate-500">
            Phase: <span className="font-medium text-slate-700">{phaseName}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title <span className="text-red-500">*</span></Label>
            <Input id="task-title" placeholder="Task title…" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select
              value={watch('assignee') ?? 'unassigned'}
              onValueChange={(v) => setValue('assignee', v === 'unassigned' || v == null ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned">
                  {(v: string) => !v || v === 'unassigned' ? 'Unassigned' : (teamMembers.find(m => m.id === v)?.name ?? v)}
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

          {/* Start Date + Due Date side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-start-date">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input id="task-start-date" type="date" {...register('start_date')} />
              {errors.start_date && (
                <p className="text-xs text-red-500">{errors.start_date.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input id="task-due-date" type="date" {...register('due_date')} />
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
                  data-active={priority === p.value ? '' : undefined}
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

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" placeholder="Optional task description…" rows={3} {...register('description')} />
          </div>

          {/* ── Linked Blockers ─────────────────────────── */}
          {linkedBlockers.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <Label>Blockers</Label>
                {unresolvedCount > 0 && (
                  <span className="text-xs font-medium text-red-500 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {unresolvedCount} unresolved — task cannot be closed
                  </span>
                )}
                {unresolvedCount === 0 && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    All resolved
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {linkedBlockers.map((blocker) => {
                  const rs = resolveState[blocker.id] ?? { loading: false, showNote: false, note: '' }
                  const isResolved = blocker.status === 'resolved'

                  return (
                    <div
                      key={blocker.id}
                      className={cn(
                        'rounded-md border px-3 py-2.5 space-y-2',
                        isResolved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      )}
                    >
                      {/* Blocker title + status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={cn('text-sm font-medium leading-snug', isResolved ? 'text-green-800' : 'text-red-800')}>
                            {blocker.title}
                          </p>
                          {blocker.description && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{blocker.description}</p>
                          )}
                        </div>
                        <BlockerStatusBadge status={blocker.status} />
                      </div>

                      {/* Resolved state */}
                      {isResolved && (
                        <div className="flex items-center gap-1.5 text-xs text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Resolved
                          {blocker.resolution_notes && (
                            <span className="text-slate-500 ml-1">· {blocker.resolution_notes}</span>
                          )}
                        </div>
                      )}

                      {/* Unresolved — resolve actions */}
                      {!isResolved && (
                        <>
                          {rs.showNote && (
                            <Textarea
                              placeholder="Resolution notes (optional)…"
                              rows={2}
                              className="text-xs"
                              value={rs.note}
                              onChange={(e) => patchResolve(blocker.id, { note: e.target.value })}
                            />
                          )}
                          <div className="flex gap-2">
                            {!rs.showNote ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-slate-300"
                                onClick={() => patchResolve(blocker.id, { showNote: true })}
                              >
                                Add note
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => patchResolve(blocker.id, { showNote: false, note: '' })}
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                              disabled={rs.loading}
                              onClick={() => handleResolveBlocker(blocker.id)}
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              {rs.loading ? 'Resolving…' : 'Mark Resolved'}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {isEdit && (
              confirmDelete ? (
                <div className="flex items-center gap-2 mr-auto">
                  <span className="text-xs text-red-600 font-medium">Delete this task?</span>
                  <Button type="button" size="sm" variant="destructive" className="h-7 text-xs" disabled={deleting} onClick={handleDelete}>
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
