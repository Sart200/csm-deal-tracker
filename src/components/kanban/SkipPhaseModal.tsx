'use client'

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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { skipPhase } from '@/lib/queries/phases'

const skipSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
})

type SkipFormValues = z.infer<typeof skipSchema>

interface SkipPhaseModalProps {
  phaseId: string
  phaseName: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}

export function SkipPhaseModal({
  phaseId,
  phaseName,
  open,
  onOpenChange,
  onSuccess,
}: SkipPhaseModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SkipFormValues>({
    resolver: zodResolver(skipSchema),
  })

  async function onSubmit(values: SkipFormValues) {
    const supabase = createClient()
    try {
      // Use a placeholder actor since there's no auth
      const { data: members } = await supabase
        .from('team_members')
        .select('id')
        .limit(1)
        .single()

      const actorId = members?.id ?? 'system'

      await skipPhase(supabase, phaseId, values.reason, actorId, actorId)
      toast.success(`Phase "${phaseName}" skipped`)
      reset()
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to skip phase'
      toast.error(message)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skip Phase</DialogTitle>
          <p className="text-sm text-slate-500">
            Skipping <span className="font-medium text-slate-700">{phaseName}</span>. All
            incomplete tasks will be marked N/A.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="skip-reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="skip-reason"
              placeholder="Explain why this phase is being skipped (min. 10 characters)…"
              rows={4}
              {...register('reason')}
            />
            {errors.reason && (
              <p className="text-xs text-red-500">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => { reset(); onOpenChange(false) }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Skipping…' : 'Skip Phase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
