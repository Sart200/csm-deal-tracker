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
import { createClient } from '@/lib/supabase/client'
import { addOnboardingTask, updateOnboardingTask, deleteOnboardingTask } from '@/lib/queries/deals'
import { cn } from '@/lib/utils'
import type { OnboardingTask, TeamMember } from '@/types'

const OWNER_ROLES = ['CSM', 'AE', 'Client', 'SE', 'Manager']
const EVIDENCE_TYPES = ['Manual', 'Screenshot', 'Document', 'Email', 'Call Recording', 'Other']

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  owner_role: z.string().min(1, 'Owner role is required'),
  evidence_type: z.string().min(1, 'Evidence type is required'),
  evidence_notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// Priority-style pill selector reused for owner role
const ROLE_PILLS = OWNER_ROLES.map((r) => ({ value: r, label: r }))

interface OnboardingTaskModalProps {
  dealId: string
  teamMembers: TeamMember[]
  task?: OnboardingTask | null   // null/undefined = create mode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function OnboardingTaskModal({
  dealId,
  open,
  onOpenChange,
  onSuccess,
  task,
}: OnboardingTaskModalProps) {
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
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      owner_role: 'CSM',
      evidence_type: 'Manual',
      evidence_notes: '',
    },
  })

  const ownerRole = watch('owner_role')
  const evidenceType = watch('evidence_type')

  useEffect(() => {
    if (open) {
      setConfirmDelete(false)
      if (task) {
        reset({
          title: task.title,
          owner_role: task.owner_role ?? 'CSM',
          evidence_type: task.evidence_type ?? 'Manual',
          evidence_notes: task.evidence_notes ?? '',
        })
      } else {
        reset({ title: '', owner_role: 'CSM', evidence_type: 'Manual', evidence_notes: '' })
      }
    }
  }, [open, task, reset])

  async function onSubmit(values: FormValues) {
    const supabase = createClient()
    try {
      if (isEdit && task) {
        await updateOnboardingTask(supabase, task.id, {
          title: values.title,
          owner_role: values.owner_role,
          evidence_type: values.evidence_type,
          evidence_notes: values.evidence_notes?.trim() || null,
        })
        toast.success('Task updated')
      } else {
        await addOnboardingTask(supabase, dealId, values.title, {
          owner_role: values.owner_role,
          evidence_type: values.evidence_type,
          evidence_notes: values.evidence_notes?.trim() || null,
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
            <Input
              id="ob-title"
              placeholder="Task title…"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Owner Role — pill selector */}
          <div className="space-y-1.5">
            <Label>Owner Role</Label>
            <div className="flex flex-wrap gap-2">
              {ROLE_PILLS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setValue('owner_role', r.value)}
                  className={cn(
                    'flex-1 py-1.5 text-sm font-medium rounded-md border transition-colors min-w-[60px]',
                    'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100',
                    ownerRole === r.value && 'ring-2 ring-offset-1 ring-blue-400 bg-blue-50 border-blue-200 text-blue-700'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Evidence Type — select */}
          <div className="space-y-1.5">
            <Label>Evidence Type</Label>
            <Select
              value={evidenceType}
              onValueChange={(v) => setValue('evidence_type', v)}
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

          {/* Evidence Notes / Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ob-notes">Evidence Notes (optional)</Label>
            <Textarea
              id="ob-notes"
              placeholder="Optional notes or instructions…"
              rows={3}
              {...register('evidence_notes')}
            />
          </div>

          <DialogFooter className="gap-2">
            {/* Delete button — edit mode only */}
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
