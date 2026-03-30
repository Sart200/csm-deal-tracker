'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
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
import { createBlocker } from '@/lib/queries/blockers'
import type { TeamMember, TaskWithDetails } from '@/types'

const blockerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  category: z.enum(['client', 'internal', 'technical', 'commercial', 'other']),
  owner: z.string().optional(),
  target_resolution_date: z.string().optional(),
  task_id: z.string().optional(),
})

type BlockerFormValues = z.infer<typeof blockerSchema>

interface BlockerFormProps {
  phaseId: string
  phaseName: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
  teamMembers: TeamMember[]
  tasks?: TaskWithDetails[]
}

export function BlockerForm({
  phaseId,
  phaseName,
  open,
  onOpenChange,
  onSuccess,
  teamMembers,
  tasks = [],
}: BlockerFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BlockerFormValues>({
    resolver: zodResolver(blockerSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'internal',
      owner: undefined,
      target_resolution_date: '',
      task_id: undefined,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        description: '',
        category: 'internal',
        owner: undefined,
        target_resolution_date: '',
        task_id: undefined,
      })
    }
  }, [open, reset])

  async function onSubmit(values: BlockerFormValues) {
    const supabase = createClient()
    try {
      const { data: member } = await supabase
        .from('team_members')
        .select('id')
        .limit(1)
        .single()
      const actorId = member?.id ?? undefined

      await createBlocker(
        supabase,
        {
          title: values.title,
          description: values.description || undefined,
          category: values.category,
          owner: values.owner || undefined,
          target_resolution_date: values.target_resolution_date || undefined,
          phase_id: phaseId,
          task_id: values.task_id || undefined,
        },
        actorId
      )
      toast.success('Blocker raised')
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('Failed to raise blocker')
    }
  }

  const category = watch('category')
  const owner = watch('owner')
  const taskId = watch('task_id')

  // Only show active (non-done, non-na) tasks
  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'na')

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Raise Blocker</DialogTitle>
          <p className="text-sm text-slate-500">
            Phase: <span className="font-medium text-slate-700">{phaseName}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="blocker-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="blocker-title"
              placeholder="Brief description of the blocker…"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Linked Task */}
          {activeTasks.length > 0 && (
            <div className="space-y-1.5">
              <Label>Blocking Task <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Select
                value={taskId ?? 'none'}
                onValueChange={(v) => setValue('task_id', v === 'none' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) =>
                      v && v !== 'none'
                        ? activeTasks.find((t) => t.id === v)?.title ?? v
                        : 'Not linked to a specific task'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked to a specific task</SelectItem>
                  {activeTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="blocker-desc">Description</Label>
            <Textarea
              id="blocker-desc"
              placeholder="More detail about the blocker…"
              rows={3}
              {...register('description')}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => { if (v) setValue('category', v as BlockerFormValues['category']) }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="internal">Internal</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Owner */}
          <div className="space-y-1.5">
            <Label>Owner</Label>
            <Select
              value={owner ?? 'unassigned'}
              onValueChange={(v) => setValue('owner', v === 'unassigned' || v == null ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: string) =>
                    v && v !== 'unassigned'
                      ? teamMembers.find((m) => m.id === v)?.name ?? v
                      : 'Unassigned'
                  }
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

          {/* Target Resolution Date */}
          <div className="space-y-1.5">
            <Label htmlFor="blocker-target-date">Target Resolution Date</Label>
            <Input
              id="blocker-target-date"
              type="date"
              {...register('target_resolution_date')}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onOpenChange(false) }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Raising…' : 'Raise Blocker'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
