'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { createDeal } from '@/lib/queries/deals'
import { getTeamMembers } from '@/lib/queries/team'
import type { TeamMember } from '@/types'

const dealSchema = z.object({
  client_name: z.string().min(1, 'Client name is required'),
  csm_owner: z.string().min(1, 'CSM Owner is required'),
  deal_value_str: z.string().optional(),
  start_date: z.string().optional(),
  notes: z.string().optional(),
})

type DealFormValues = z.infer<typeof dealSchema>

export default function NewDealPage() {
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const supabase = createClient()

  useEffect(() => {
    getTeamMembers(supabase).then(setTeamMembers).catch(console.error)
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      client_name: '',
      csm_owner: '',
      deal_value_str: '',
      start_date: '',
      notes: '',
    },
  })

  const csmOwner = watch('csm_owner')

  async function onSubmit(values: DealFormValues) {
    try {
      const deal = await createDeal(supabase, {
        client_name: values.client_name,
        csm_owner: values.csm_owner,
        deal_value: values.deal_value_str ? Number(values.deal_value_str) : undefined,
        start_date: values.start_date || undefined,
        notes: values.notes || undefined,
      })
      toast.success(`Deal for ${deal.client_name} created!`)
      router.push(`/deals/${deal.id}`)
    } catch {
      toast.error('Failed to create deal')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/deals" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Create Deal</h1>
          <p className="text-sm text-slate-500">Add a new client deal to track</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Deal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Client Name */}
            <div className="space-y-1.5">
              <Label htmlFor="client-name">
                Client Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="client-name"
                placeholder="e.g. Acme Corp"
                {...register('client_name')}
              />
              {errors.client_name && (
                <p className="text-xs text-red-500">{errors.client_name.message}</p>
              )}
            </div>

            {/* CSM Owner */}
            <div className="space-y-1.5">
              <Label>
                CSM Owner <span className="text-red-500">*</span>
              </Label>
              <Select
                value={csmOwner}
                onValueChange={(v) => setValue('csm_owner', v ?? '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select CSM Owner">
                    {(v: string) => v ? (teamMembers.find(m => m.id === v)?.name ?? v) : 'Select CSM Owner'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.csm_owner && (
                <p className="text-xs text-red-500">{errors.csm_owner.message}</p>
              )}
            </div>

            {/* Deal Value */}
            <div className="space-y-1.5">
              <Label htmlFor="deal-value">Deal Value ($, optional)</Label>
              <Input
                id="deal-value"
                type="number"
                min={0}
                step={1000}
                placeholder="e.g. 50000"
                {...register('deal_value_str')}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                {...register('start_date')}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any relevant context or notes…"
                rows={4}
                {...register('notes')}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/deals" className={buttonVariants({ variant: 'outline' }) + ' flex-1 text-center'}>
                Cancel
              </Link>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Creating…' : 'Create Deal'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
