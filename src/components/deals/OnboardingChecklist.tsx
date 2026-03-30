'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, Pencil, Check, X, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, getInitials } from '@/lib/utils'
import { deleteOnboardingTask } from '@/lib/queries/deals'
import { OnboardingTaskModal } from './OnboardingTaskModal'
import type { OnboardingTask, TeamMember } from '@/types'

interface OnboardingChecklistProps {
  tasks: OnboardingTask[]
  dealId: string
  teamMembers: TeamMember[]
}

export function OnboardingChecklist({ tasks, dealId, teamMembers }: OnboardingChecklistProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleToggle(task: OnboardingTask) {
    setLoadingId(task.id)
    try {
      const isCompleting = !task.completed_at
      await supabase
        .from('onboarding_tasks')
        .update({
          completed_at: isCompleting ? new Date().toISOString() : null,
          completed_by: isCompleting ? (teamMembers[0]?.id ?? null) : null,
        })
        .eq('id', task.id)

      toast.success(
        isCompleting
          ? `Task "${task.title}" marked complete`
          : `Task "${task.title}" unmarked`
      )
      router.refresh()
    } catch {
      toast.error('Failed to update task')
    } finally {
      setLoadingId(null)
    }
  }

  function startEditNote(task: OnboardingTask) {
    setEditingNoteId(task.id)
    setNoteValue(task.evidence_notes ?? '')
  }

  async function saveNote(task: OnboardingTask) {
    try {
      await supabase
        .from('onboarding_tasks')
        .update({ evidence_notes: noteValue.trim() || null })
        .eq('id', task.id)
      toast.success('Notes saved')
      setEditingNoteId(null)
      router.refresh()
    } catch {
      toast.error('Failed to save notes')
    }
  }

  async function handleDeleteTask(task: OnboardingTask) {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return
    setDeletingId(task.id)
    try {
      await deleteOnboardingTask(supabase, task.id)
      toast.success('Task removed')
      router.refresh()
    } catch {
      toast.error('Failed to remove task')
    } finally {
      setDeletingId(null)
    }
  }

  const completedCount = tasks.filter((t) => t.completed_at).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {completedCount} of {tasks.length} tasks completed
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Task
        </Button>
      </div>

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden">
        {tasks.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">
            No onboarding tasks yet. Click &ldquo;Add Task&rdquo; to get started.
          </div>
        )}

        {tasks.map((task) => {
          const isCompleted = !!task.completed_at
          const isLoading = loadingId === task.id
          const isDeleting = deletingId === task.id
          const isEditingNote = editingNoteId === task.id

          return (
            <div
              key={task.id}
              className={cn(
                'group flex gap-3 px-4 py-3 transition-colors',
                isCompleted ? 'bg-green-50/40' : 'hover:bg-slate-50',
                isDeleting && 'opacity-50'
              )}
            >
              {/* Checkbox */}
              <button
                onClick={() => handleToggle(task)}
                disabled={isLoading || isDeleting}
                className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5" />
                )}
              </button>

              <div className="flex-1 min-w-0 space-y-1">
                {/* Title row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-400 shrink-0">
                    #{task.task_number}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium text-slate-800',
                      isCompleted && 'line-through text-slate-400'
                    )}
                  >
                    {task.title}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs border-0 bg-blue-50 text-blue-600 px-1.5 py-0 shrink-0"
                  >
                    {task.owner_role}
                  </Badge>
                  <span className="text-xs text-slate-400 shrink-0">{task.evidence_type}</span>
                </div>

                {/* Evidence notes */}
                {isEditingNote ? (
                  <div className="flex gap-2 mt-1">
                    <Textarea
                      className="text-xs min-h-[60px] flex-1"
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      placeholder="Add evidence notes…"
                    />
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => saveNote(task)}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-600" onClick={() => setEditingNoteId(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {task.evidence_notes ? (
                      <p className="text-xs text-slate-500 italic">{task.evidence_notes}</p>
                    ) : (
                      <p className="text-xs text-slate-300 italic">No evidence notes</p>
                    )}
                  </div>
                )}

                {/* Completed by */}
                {isCompleted && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    {task.completed_by_member && (
                      <>
                        <div className="h-4 w-4 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-[9px] font-semibold text-green-700">
                            {getInitials(task.completed_by_member.name)}
                          </span>
                        </div>
                        <span>{task.completed_by_member.name}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>{formatDate(task.completed_at)}</span>
                  </div>
                )}
              </div>

              {/* Action buttons — edit note + delete, always right-aligned together */}
              <div className="shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEditNote(task)}
                  className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-blue-500 transition-colors"
                  title="Edit evidence notes"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDeleteTask(task)}
                  disabled={isDeleting || isLoading}
                  className="h-6 w-6 flex items-center justify-center rounded text-slate-300 hover:text-red-400 transition-colors disabled:opacity-30"
                  title="Remove task"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}

      </div>

      <OnboardingTaskModal
        dealId={dealId}
        teamMembers={teamMembers}
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
