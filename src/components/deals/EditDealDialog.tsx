'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { updateDeal } from '@/lib/queries/deals'
import type { DealWithRelations, TeamMember, DealStatus } from '@/types'

const DEAL_STATUSES: { value: DealStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'churned', label: 'Churned' },
]

interface EditDealDialogProps {
  deal: DealWithRelations
  teamMembers: TeamMember[]
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function EditDealDialog({ deal, teamMembers, open, onOpenChange }: EditDealDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clientName, setClientName] = useState(deal.client_name)
  const [csmOwner, setCsmOwner] = useState(deal.csm_owner ?? '')
  const [status, setStatus] = useState<DealStatus>(deal.status)
  const [dealValue, setDealValue] = useState(deal.deal_value != null ? String(deal.deal_value) : '')
  const [startDate, setStartDate] = useState(deal.start_date ?? '')
  const [notes, setNotes] = useState(deal.notes ?? '')

  // Reset when deal changes or dialog opens
  useEffect(() => {
    if (open) {
      setClientName(deal.client_name)
      setCsmOwner(deal.csm_owner ?? '')
      setStatus(deal.status)
      setDealValue(deal.deal_value != null ? String(deal.deal_value) : '')
      setStartDate(deal.start_date ?? '')
      setNotes(deal.notes ?? '')
    }
  }, [open, deal])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientName.trim()) return
    setLoading(true)
    try {
      const supabase = createClient()
      await updateDeal(supabase, deal.id, {
        client_name: clientName.trim(),
        csm_owner: csmOwner || undefined,
        status,
        deal_value: dealValue ? Number(dealValue) : undefined,
        start_date: startDate || undefined,
        notes: notes || undefined,
      })
      toast.success('Deal updated')
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Failed to update deal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Client Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-client-name">Client Name <span className="text-red-500">*</span></Label>
            <Input
              id="edit-client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>

          {/* CSM Owner + Status row */}
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
              <Select value={status} onValueChange={(v) => setStatus((v ?? 'active') as DealStatus)}>
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => DEAL_STATUSES.find(s => s.value === v)?.label ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deal Value + Start Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-deal-value">Deal Value ($)</Label>
              <Input
                id="edit-deal-value"
                type="number"
                min={0}
                step={1000}
                placeholder="50000"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-start-date">Start Date</Label>
              <Input
                id="edit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              placeholder="Any relevant context…"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
