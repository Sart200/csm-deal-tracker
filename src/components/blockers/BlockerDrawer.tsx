'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Link2,
  Tag,
  User,
  Users,
} from 'lucide-react'
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
import type { BlockerWithDetails, TaskWithDetails, TeamMember } from '@/types'

interface BlockerDrawerProps {
  blocker: BlockerWithDetails | null
  open: boolean
  onOpenChange: (v: boolean) => void
  onUpdate: () => void
  teamMembers: TeamMember[]
  tasks?: TaskWithDetails[]
}

export function BlockerDrawer({
  blocker,
  open,
  onOpenChange,
  onUpdate,
  teamMembers,
  tasks = [],
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

  // Find linked task title from the tasks list if available
  const linkedTask = blocker.task_id
    ? tasks.find((t) => t.id === blocker.task_id) ?? blocker.task ?? null
    : null

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
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {/* Coloured top strip by status */}
        <div
          className={cn(
            'h-1 w-full',
            isResolved ? 'bg-green-500' :
            isEscalated ? 'bg-orange-500' :
            isInResolution ? 'bg-blue-400' :
            'bg-red-400'
          )}
        />

        <div className="p-5 space-y-5">
          {/* Header */}
          <SheetHeader className="space-y-2 text-left">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge
                variant="outline"
                className={cn('text-xs border-0 px-2 py-0.5', getBlockerCategoryClasses(blocker.category))}
              >
                {getBlockerCategoryLabel(blocker.category)}
              </Badge>
              <BlockerStatusBadge status={blocker.status} />
              {isEscalated && (
                <div className="flex items-center gap-1 text-orange-500 text-xs font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Escalated
                </div>
              )}
              {daysOpen > 0 && !isResolved && (
                <span className={cn(
                  'text-xs font-medium',
                  daysOpen > 7 ? 'text-red-500' : 'text-slate-400'
                )}>
                  {daysOpen}d open
                </span>
              )}
            </div>
            <SheetTitle className="text-left text-base font-semibold leading-snug text-slate-900">
              {blocker.title}
            </SheetTitle>
          </SheetHeader>

          {/* Description */}
          <div className="rounded-md bg-slate-50 border border-slate-100 px-3 py-2.5 min-h-[56px]">
            {blocker.description ? (
              <p className="text-sm text-slate-700 leading-relaxed">{blocker.description}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">No description provided</p>
            )}
          </div>

          {/* Linked task */}
          {linkedTask && (
            <div className="flex items-start gap-2.5 rounded-md bg-blue-50 border border-blue-100 px-3 py-2.5">
              <Link2 className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-blue-600 mb-0.5">Blocking Task</p>
                <p className="text-sm text-blue-800">{linkedTask.title}</p>
              </div>
            </div>
          )}

          <Separator />

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {/* Raised by */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <User className="h-3 w-3" />
                Raised by
              </div>
              {blocker.raised_by_member ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-semibold text-slate-600">
                      {getInitials(blocker.raised_by_member.name)}
                    </span>
                  </div>
                  <span className="text-sm text-slate-700">{blocker.raised_by_member.name}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">—</span>
              )}
            </div>

            {/* Owner */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Users className="h-3 w-3" />
                Owner
              </div>
              {blocker.owner_member ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-semibold text-blue-700">
                      {getInitials(blocker.owner_member.name)}
                    </span>
                  </div>
                  <span className="text-sm text-slate-700">{blocker.owner_member.name}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">Unassigned</span>
              )}
            </div>

            {/* Raised date */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                Raised
              </div>
              <p className="text-sm text-slate-700">
                {formatDate(blocker.raised_at)}
                <span className="text-slate-400 text-xs ml-1">({daysOpen}d ago)</span>
              </p>
            </div>

            {/* Target date */}
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="h-3 w-3" />
                Target Date
              </div>
              {blocker.target_resolution_date ? (
                <p className={cn(
                  'text-sm',
                  new Date(blocker.target_resolution_date) < new Date() && !isResolved
                    ? 'text-red-600 font-medium'
                    : 'text-slate-700'
                )}>
                  {formatDate(blocker.target_resolution_date)}
                </p>
              ) : (
                <span className="text-sm text-slate-400">Not set</span>
              )}
            </div>

            {/* Phase */}
            {blocker.phase && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Tag className="h-3 w-3" />
                  Phase
                </div>
                <p className="text-sm text-slate-700">
                  P{blocker.phase.phase_number} — {blocker.phase.name}
                </p>
              </div>
            )}

            {/* Deal */}
            {blocker.deal && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Tag className="h-3 w-3" />
                  Deal
                </div>
                <p className="text-sm text-slate-700">{blocker.deal.client_name}</p>
              </div>
            )}
          </div>

          {/* Escalation note */}
          {blocker.escalation_note && (
            <>
              <Separator />
              <div className="rounded-md bg-orange-50 border border-orange-200 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                  <p className="text-xs font-semibold text-orange-600">Escalation Note</p>
                </div>
                <p className="text-sm text-orange-800">{blocker.escalation_note}</p>
              </div>
            </>
          )}

          {/* Resolution notes */}
          {blocker.resolution_notes && (
            <>
              <Separator />
              <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <p className="text-xs font-semibold text-green-600">Resolution Notes</p>
                </div>
                <p className="text-sm text-green-800">{blocker.resolution_notes}</p>
                {blocker.resolved_at && (
                  <p className="text-xs text-green-500 mt-1.5">
                    Resolved {formatRelativeTime(blocker.resolved_at)}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Action buttons — only show if not resolved */}
          {!isResolved && (
            <>
              <Separator />
              <div className="space-y-2.5">
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
                    <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                    Escalate
                  </Button>
                )}

                {showEscalateInput && (
                  <div className="space-y-2 rounded-md bg-orange-50 border border-orange-100 p-3">
                    <Label className="text-orange-700">Escalation Note <span className="text-red-500">*</span></Label>
                    <Textarea
                      placeholder="Why is this being escalated?"
                      rows={3}
                      value={escalationNote}
                      onChange={(e) => setEscalationNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowEscalateInput(false)}>
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

                {!showResolveInput && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                    onClick={() => setShowResolveInput(true)}
                    disabled={loading}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Mark Resolved
                  </Button>
                )}

                {showResolveInput && (
                  <div className="space-y-2 rounded-md bg-green-50 border border-green-100 p-3">
                    <Label className="text-green-700">Resolution Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <Textarea
                      placeholder="How was this resolved?"
                      rows={3}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowResolveInput(false)}>
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
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
