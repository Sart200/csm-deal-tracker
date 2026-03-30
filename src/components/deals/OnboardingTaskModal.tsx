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
import { addOnboardingTask } from '@/lib/queries/deals'
import type { TeamMember } from '@/types'

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  owner_role: z.string().optional(),
  evidence_type: z.string().optional(),
  evidence_notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const OWNER_ROLES = ['CSM', 'AE', 'Client', 'SE', 'Manager']
const EVIDENCE_TYPES = ['Manual', 'Screenshot', 'Document', 'Email', 'Call Recording', 'Other']

interface OnboardingTaskModalProps {
  dealId: string
  teamMembers: TeamMember[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function OnboardingTaskModal({
  dealId,
  open,
  onOpenChange,
  onSuccess,
}: OnboardingTaskModalProps) {
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
      reset({ title: '', owner_role: 'CSM', evidence_type: 'Manual', evidence_notes: '' })
    }
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    const supabase = createClient()
    try {
      await addOnboardingTask(supabase, dealId, values.title, {
        owner_role: values.owner_role || 'CSM',
        evidence_type: values.evidence_type || 'Manual',
        evidence_notes: values.evidence_notes?.trim() || null,
      })
      toast.success('Task added')
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('Failed to add task')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Onboarding Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ob-title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input id="ob-title" placeholder="Task title…" {...register('title')} />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Owner Role */}
          <div className="space-y-1.5">
            <Label>Owner Role</Label>
            <Select
              value={ownerRole ?? 'CSM'}
              onValueChange={(v) => setValue('owner_role', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select owner role" />
              </SelectTrigger>
              <SelectContent>
                {OWNER_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Evidence Type */}
          <div className="space-y-1.5">
            <Label>Evidence Type</Label>
            <Select
              value={evidenceType ?? 'Manual'}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding…' : 'Add Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
