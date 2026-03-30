'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
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
import type { TaskWithDetails, TeamMember, PriorityLevel } from '@/types'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  assignee: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  due_date: z.string().optional(),
  description: z.string().optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface TaskFormProps {
  phaseId: string
  phaseName: string
  teamMembers: TeamMember[]
  task?: TaskWithDetails
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
  open,
  onOpenChange,
  onSuccess,
}: TaskFormProps) {
  const isEdit = !!task
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      assignee: undefined,
      priority: 'medium',
      due_date: '',
      description: '',
    },
  })

  const priority = watch('priority')

  useEffect(() => {
    if (open) {
      setConfirmDelete(false)
      if (task) {
        reset({
          title: task.title,
          assignee: task.assignee ?? undefined,
          priority: task.priority,
          due_date: task.due_date ?? '',
          description: task.description ?? '',
        })
      } else {
        reset({
          title: '',
          assignee: undefined,
          priority: 'medium',
          due_date: '',
          description: '',
        })
      }
    }
  }, [open, task, reset])

  async function onSubmit(values: TaskFormValues) {
    const supabase = createClient()
    try {
      if (isEdit && task) {
        await updateTask(supabase, task.id, {
          title: values.title,
          assignee: values.assignee || undefined,
          priority: values.priority,
          due_date: values.due_date || undefined,
          description: values.description || undefined,
        })
        toast.success('Task updated')
      } else {
        await createTask(supabase, phaseId, {
          title: values.title,
          assignee: values.assignee || undefined,
          priority: values.priority,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Task' : 'New Task'}</DialogTitle>
          <p className="text-sm text-slate-500">
            Phase: <span className="font-medium text-slate-700">{phaseName}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder="Task title…"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
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
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label htmlFor="task-due-date">Due Date</Label>
            <Input
              id="task-due-date"
              type="date"
              {...register('due_date')}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-description">Description</Label>
            <Textarea
              id="task-description"
              placeholder="Optional task description…"
              rows={3}
              {...register('description')}
            />
          </div>

          <DialogFooter className="gap-2">
            {/* Delete — only when editing */}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
