'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, AlertTriangle } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { BlockerStatusBadge } from './BlockerStatusBadge'
import { createClient } from '@/lib/supabase/client'
import { updateBlocker } from '@/lib/queries/blockers'
import {
  cn,
  formatDate,
  formatRelativeTime,
  getBlockerCategoryClasses,
  getBlockerCategoryLabel,
  getDaysOpen,
  getInitials,
} from '@/lib/utils'
import type { BlockerWithDetails, TeamMember } from '@/types'

interface BlockerDrawerProps {
  blocker: BlockerWithDetails | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onUpdate: () => void
  teamMembers: TeamMember[]
}

export function BlockerDrawer({
  blocker,
  open,
  onOpenChange,
  onUpdate,
  teamMembers,
}: BlockerDrawerProps) {
  const supabase = createClient()
  const [escalationNote, setEscalationNote] = useState('')
  const [showEscalateInput, setShowEscalateInput] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [showResolveInput, setShowResolveInput] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!blocker) return null

  const isResolved = blocker.status === 'resolved'
  const isOpen = blocker.status === 'open'
  const isInResolution = blocker.status === 'in_resolution'
  const isEscalated = blocker.status === 'escalated'
  const daysOpen = getDaysOpen(blocker.raised_at)

  async function handleMarkInResolution() {
    setLoading(true)
    try {
      await updateBlocker(supabase, blocker!.id, { status: 'in_resolution' })
      toast.success('Blocker marked as in resolution')
      onUpdate()
      onOpenChange(false)
    } catch {
      toast.error('Failed to update blocker')
    } finally {
      setLoading(false)
    }
  }

  async function handleEscalate() {
    if (!escalationNote.trim()) {
      toast.error('Please add an escalation note')
      return
    }
    setLoading(true)
    try {
      await updateBlocker(supabase, blocker!.id, {
        status: 'escalated',
        escalation_note: escalationNote.trim(),
      })
      toast.success('Blocker escalated')
      setEscalationNote('')
      setShowEscalateInput(false)
      onUpdate()
      onOpenChange(false)
    } catch {
      toast.error('Failed to escalate blocker')
    } finally {
      setLoading(false)
    }
  }

  async function handleResolve() {
    setLoading(true)
    try {
      await updateBlocker(supabase, blocker!.id, {
        status: 'resolved',
        resolution_notes: resolutionNotes.trim() || undefined,
      })
      toast.success('Blocker resolved')
      setResolutionNotes('')
      setShowResolveInput(false)
      onUpdate()
      onOpenChange(false)
    } catch {
      toast.error('Failed to resolve blocker')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pr-6">
          <SheetTitle className="text-left text-base leading-snug pr-2">
            {blocker.title}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={cn(
                'text-xs border-0 px-2 py-0.5',
                getBlockerCategoryClasses(blocker.category)
              )}
            >
              {getBlockerCategoryLabel(blocker.category)}
            </Badge>
            <BlockerStatusBadge status={blocker.status} />
            {isEscalated && (
              <div className="flex items-center gap-1 text-orange-500 text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Escalated
              </div>
            )}
          </div>

          {/* Description */}
          {blocker.description && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Description</p>
              <p className="text-sm text-slate-700">{blocker.description}</p>
            </div>
          )}

          <Separator />

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {blocker.raised_by_member && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Raised by</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center">
                    <span className="text-[9px] font-semibold text-slate-600">
                      {getInitials(blocker.raised_by_member.name)}
                    </span>
                  </div>
                  <span className="text-slate-700">{blocker.raised_by_member.name}</span>
                </div>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-400 mb-0.5">Raised</p>
              <p className="text-slate-700">
                {formatDate(blocker.raised_at)}{' '}
                <span className="text-slate-400 text-xs">({daysOpen}d ago)</span>
              </p>
            </div>

            {blocker.owner_member && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Owner</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-[9px] font-semibold text-blue-700">
                      {getInitials(blocker.owner_member.name)}
                    </span>
                  </div>
                  <span className="text-slate-700">{blocker.owner_member.name}</span>
                </div>
              </div>
            )}

            {blocker.target_resolution_date && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Target Date</p>
                <p className="text-slate-700">{formatDate(blocker.target_resolution_date)}</p>
              </div>
            )}

            {blocker.phase && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Phase</p>
                <p className="text-slate-700">
                  P{blocker.phase.phase_number} — {blocker.phase.name}
                </p>
              </div>
            )}

            {blocker.deal && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Deal</p>
                <p className="text-slate-700">{blocker.deal.client_name}</p>
              </div>
            )}
          </div>

          {/* Escalation note */}
          {blocker.escalation_note && (
            <>
              <Separator />
              <div className="bg-orange-50 rounded-md p-3 border border-orange-200">
                <p className="text-xs font-medium text-orange-600 mb-1">Escalation Note</p>
                <p className="text-sm text-orange-800">{blocker.escalation_note}</p>
              </div>
            </>
          )}

          {/* Resolution notes */}
          {blocker.resolution_notes && (
            <>
              <Separator />
              <div className="bg-green-50 rounded-md p-3 border border-green-200">
                <p className="text-xs font-medium text-green-600 mb-1">Resolution Notes</p>
                <p className="text-sm text-green-800">{blocker.resolution_notes}</p>
                {blocker.resolved_at && (
                  <p className="text-xs text-green-500 mt-1">
                    Resolved {formatRelativeTime(blocker.resolved_at)}
                  </p>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Action buttons */}
          <div className="space-y-3">
            {isOpen && (
              <Button
                className="w-full"
                variant="outline"
                size="sm"
                onClick={handleMarkInResolution}
                disabled={loading}
              >
                Mark In Resolution
              </Button>
            )}

            {(isOpen || isInResolution) && !showEscalateInput && (
              <Button
                className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                variant="outline"
                size="sm"
                onClick={() => setShowEscalateInput(true)}
                disabled={loading}
              >
                Escalate
              </Button>
            )}

            {showEscalateInput && (
              <div className="space-y-2">
                <Label>Escalation Note</Label>
                <Textarea
                  placeholder="Why is this being escalated?"
                  rows={3}
                  value={escalationNote}
                  onChange={(e) => setEscalationNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowEscalateInput(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={handleEscalate}
                    disabled={loading}
                  >
                    Escalate
                  </Button>
                </div>
              </div>
            )}

            {!isResolved && !showResolveInput && (
              <Button
                className="w-full"
                size="sm"
                onClick={() => setShowResolveInput(true)}
                disabled={loading}
              >
                Mark Resolved
              </Button>
            )}

            {showResolveInput && (
              <div className="space-y-2">
                <Label>Resolution Notes (optional)</Label>
                <Textarea
                  placeholder="How was this resolved?"
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowResolveInput(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleResolve}
                    disabled={loading}
                  >
                    Mark Resolved
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
