'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Link2,
  Pencil,
  Tag,
  User,
  Users,
  X,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  getDaysUntilTarget,
  getInitials,
} from '@/lib/utils'
import type { BlockerCategory, BlockerWithDetails, TaskWithDetails, TeamMember } from '@/types'

const CATEGORIES: { value: BlockerCategory; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'internal', label: 'Internal' },
  { value: 'technical', label: 'Technical' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'other', label: 'Other' },
]

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

  // Status actions
  const [escalationNote, setEscalationNote] = useState('')
  const [showEscalateInput, setShowEscalateInput] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [showResolveInput, setShowResolveInput] = useState(false)
  const [loading, setLoading] = useState(false)

  // Edit mode
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState<BlockerCategory>('internal')
  const [editOwner, setEditOwner] = useState('')
  const [editTargetDate, setEditTargetDate] = useState('')
  const [editTaskId, setEditTaskId] = useState('')
  const [editLoading, setEditLoading] = useState(false)

  if (!blocker) return null

  const isResolved = blocker.status === 'resolved'
  const isOpen = blocker.status === 'open'
  const isInResolution = blocker.status === 'in_resolution'
  const isEscalated = blocker.status === 'escalated'
  const daysOpen = getDaysOpen(blocker.raised_at)

  const linkedTask = blocker.task_id
    ? tasks.find((t) => t.id === blocker.task_id) ?? blocker.task ?? null
    : null

  function openEdit() {
    setEditTitle(blocker!.title)
    setEditDescription(blocker!.description ?? '')
    setEditCategory(blocker!.category)
    setEditOwner(blocker!.owner ?? '')
    setEditTargetDate(blocker!.target_resolution_date ?? '')
    setEditTaskId(blocker!.task_id ?? '')
    setEditing(true)
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) {
      toast.error('Title is required')
      return
    }
    setEditLoading(true)
    try {
      await updateBlocker(supabase, blocker!.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        category: editCategory,
        owner: editOwner || undefined,
        target_resolution_date: editTargetDate || undefined,
      })

      // Update task_id directly (updateBlocker doesn't expose it yet)
      await supabase
        .from('blockers')
        .update({ task_id: editTaskId || null })
        .eq('id', blocker!.id)

      toast.success('Blocker updated')
      setEditing(false)
      onUpdate()
    } catch {
      toast.error('Failed to update blocker')
    } finally {
      setEditLoading(false)
    }
  }

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

  // Active tasks for the task selector
  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'na')

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) setEditing(false); onOpenChange(v) }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        {/* Status colour strip */}
        <div className={cn(
          'h-1 w-full',
          isResolved ? 'bg-green-500' :
          isEscalated ? 'bg-orange-500' :
          isInResolution ? 'bg-blue-400' :
          'bg-red-400'
        )} />

        <div className="p-5 space-y-5">

          {/* ── VIEW MODE ─────────────────────────────────── */}
          {!editing ? (
            <>
              <SheetHeader className="space-y-2 text-left">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-2 items-center flex-1">
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
                      <span className={cn('text-xs font-medium', daysOpen > 7 ? 'text-red-500' : 'text-slate-400')}>
                        {daysOpen}d open
                      </span>
                    )}
                  </div>
                  {/* Edit button */}
                  <button
                    onClick={openEdit}
                    className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Edit blocker"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
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
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-slate-400"><User className="h-3 w-3" />Raised by</div>
                  {blocker.raised_by_member ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-semibold text-slate-600">{getInitials(blocker.raised_by_member.name)}</span>
                      </div>
                      <span className="text-sm text-slate-700">{blocker.raised_by_member.name}</span>
                    </div>
                  ) : <span className="text-sm text-slate-400">—</span>}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-slate-400"><Users className="h-3 w-3" />Owner</div>
                  {blocker.owner_member ? (
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-semibold text-blue-700">{getInitials(blocker.owner_member.name)}</span>
                      </div>
                      <span className="text-sm text-slate-700">{blocker.owner_member.name}</span>
                    </div>
                  ) : <span className="text-sm text-slate-400">Unassigned</span>}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" />Raised</div>
                  <p className="text-sm text-slate-700">
                    {formatDate(blocker.raised_at)}
                    <span className="text-slate-400 text-xs ml-1">({daysOpen}d ago)</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-slate-400"><Calendar className="h-3 w-3" />Target Date</div>
                  {blocker.target_resolution_date ? (() => {
                    const days = getDaysUntilTarget(blocker.target_resolution_date)
                    const overdue = days !== null && days < 0
                    const dueToday = days === 0
                    const urgent = days !== null && days > 0 && days <= 3
                    return (
                      <div className="space-y-0.5">
                        <p className={cn('text-sm', overdue && !isResolved ? 'text-red-600 font-medium' : 'text-slate-700')}>
                          {formatDate(blocker.target_resolution_date)}
                        </p>
                        {!isResolved && days !== null && (
                          <p className={cn('text-xs font-medium', overdue ? 'text-red-500' : dueToday ? 'text-orange-500' : urgent ? 'text-yellow-600' : 'text-slate-400')}>
                            {overdue
                              ? `${Math.abs(days)}d overdue`
                              : dueToday
                              ? 'Due today'
                              : `${days}d remaining`}
                          </p>
                        )}
                      </div>
                    )
                  })() : <span className="text-sm text-slate-400">Not set</span>}
                </div>

                {blocker.phase && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400"><Tag className="h-3 w-3" />Phase</div>
                    <p className="text-sm text-slate-700">P{blocker.phase.phase_number} — {blocker.phase.name}</p>
                  </div>
                )}

                {blocker.deal && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-slate-400"><Tag className="h-3 w-3" />Deal</div>
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
                      <p className="text-xs text-green-500 mt-1.5">Resolved {formatRelativeTime(blocker.resolved_at)}</p>
                    )}
                  </div>
                </>
              )}

              {/* Status action buttons */}
              {!isResolved && (
                <>
                  <Separator />
                  <div className="space-y-2.5">
                    {isOpen && (
                      <Button className="w-full" variant="outline" size="sm" onClick={handleMarkInResolution} disabled={loading}>
                        Mark In Resolution
                      </Button>
                    )}

                    {(isOpen || isInResolution) && !showEscalateInput && (
                      <Button className="w-full border-orange-300 text-orange-600 hover:bg-orange-50" variant="outline" size="sm" onClick={() => setShowEscalateInput(true)} disabled={loading}>
                        <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                        Escalate
                      </Button>
                    )}

                    {showEscalateInput && (
                      <div className="space-y-2 rounded-md bg-orange-50 border border-orange-100 p-3">
                        <Label className="text-orange-700">Escalation Note <span className="text-red-500">*</span></Label>
                        <Textarea placeholder="Why is this being escalated?" rows={3} value={escalationNote} onChange={(e) => setEscalationNote(e.target.value)} />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowEscalateInput(false)}>Cancel</Button>
                          <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleEscalate} disabled={loading}>Escalate</Button>
                        </div>
                      </div>
                    )}

                    {!showResolveInput && (
                      <Button className="w-full bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={() => setShowResolveInput(true)} disabled={loading}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        Mark Resolved
                      </Button>
                    )}

                    {showResolveInput && (
                      <div className="space-y-2 rounded-md bg-green-50 border border-green-100 p-3">
                        <Label className="text-green-700">Resolution Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
                        <Textarea placeholder="How was this resolved?" rows={3} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowResolveInput(false)}>Cancel</Button>
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleResolve} disabled={loading}>Mark Resolved</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (

          /* ── EDIT MODE ─────────────────────────────────── */
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Edit Blocker</h3>
                <button
                  onClick={() => setEditing(false)}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label>Title <span className="text-red-500">*</span></Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Brief description of the blocker…"
                  />
                </div>

                {/* Linked task */}
                {activeTasks.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Blocking Task <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <Select
                      value={editTaskId || 'none'}
                      onValueChange={(v) => setEditTaskId(v === 'none' ? '' : v)}
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
                          <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="More detail about the blocker…"
                    rows={3}
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={editCategory} onValueChange={(v) => setEditCategory(v as BlockerCategory)}>
                    <SelectTrigger>
                      <SelectValue>
                        {(v: string) => CATEGORIES.find((c) => c.value === v)?.label ?? v}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Owner */}
                <div className="space-y-1.5">
                  <Label>Owner</Label>
                  <Select value={editOwner || 'unassigned'} onValueChange={(v) => setEditOwner(v === 'unassigned' ? '' : v)}>
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
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Target resolution date */}
                <div className="space-y-1.5">
                  <Label>Target Resolution Date</Label>
                  <Input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                  />
                </div>

                {/* Save / Cancel */}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleSaveEdit} disabled={editLoading}>
                    {editLoading ? 'Saving…' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
