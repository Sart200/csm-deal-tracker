'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { PhaseHeader } from './PhaseHeader'
import { TaskCard } from './TaskCard'
import { TaskForm } from './TaskForm'
import { SkipPhaseModal } from './SkipPhaseModal'
import { BlockersSection } from './BlockersSection'
import { BlockerForm } from '@/components/blockers/BlockerForm'
import { BlockerDrawer } from '@/components/blockers/BlockerDrawer'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { reopenPhase } from '@/lib/queries/phases'
import { updateTask, deleteTask } from '@/lib/queries/tasks'
import type { PhaseWithTasks, TeamMember, TaskWithDetails, BlockerSummary, BlockerWithDetails } from '@/types'

interface PhaseColumnProps {
  phase: PhaseWithTasks
  teamMembers: TeamMember[]
  onTaskUpdate: () => void
}

export function PhaseColumn({ phase, teamMembers, onTaskUpdate }: PhaseColumnProps) {
  const router = useRouter()
  const supabase = createClient()

  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithDetails | undefined>(undefined)
  const [skipModalOpen, setSkipModalOpen] = useState(false)
  const [blockerFormOpen, setBlockerFormOpen] = useState(false)
  const [selectedBlocker, setSelectedBlocker] = useState<BlockerWithDetails | null>(null)
  const [blockerDrawerOpen, setBlockerDrawerOpen] = useState(false)

  const { setNodeRef, isOver } = useDroppable({ id: phase.id })

  const isSkipped = phase.status === 'skipped'
  const taskIds = phase.tasks.map((t) => t.id)

  function handleEditTask(task: TaskWithDetails) {
    setEditingTask(task)
    setTaskFormOpen(true)
  }

  async function handleDeleteTask(task: TaskWithDetails) {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return
    try {
      await deleteTask(supabase, task.id)
      toast.success('Task deleted')
      router.refresh()
      onTaskUpdate()
    } catch {
      toast.error('Failed to delete task')
    }
  }

  async function handleToggleComplete(task: TaskWithDetails) {
    // Block completion if there are unresolved blockers linked to this task
    if (task.status !== 'done') {
      const unresolvedLinked = phase.blockers.filter(
        (b) => b.task_id === task.id && b.status !== 'resolved'
      )
      if (unresolvedLinked.length > 0) {
        toast.error(
          `Cannot complete — ${unresolvedLinked.length} unresolved blocker${unresolvedLinked.length > 1 ? 's' : ''} linked to this task. Resolve them first.`
        )
        return
      }
    }
    try {
      const isDone = task.status === 'done'
      await updateTask(supabase, task.id, {
        status: isDone ? 'todo' : 'done',
        completed_at: isDone ? null : new Date().toISOString(),
        started_at: isDone ? null : (task.started_at ?? new Date().toISOString()),
      })
      router.refresh()
      onTaskUpdate()
    } catch {
      toast.error('Failed to update task')
    }
  }

  function handleAddTask() {
    setEditingTask(undefined)
    setTaskFormOpen(true)
  }

  async function handleReopen() {
    try {
      const { data: members } = await supabase
        .from('team_members')
        .select('id')
        .limit(1)
        .single()
      const actorId = members?.id ?? 'system'
      await reopenPhase(supabase, phase.id, actorId)
      toast.success(`Phase "${phase.name}" re-opened`)
      router.refresh()
      onTaskUpdate()
    } catch {
      toast.error('Failed to re-open phase')
    }
  }

  function handleBlockerClick(blocker: BlockerSummary) {
    setSelectedBlocker(blocker as BlockerWithDetails)
    setBlockerDrawerOpen(true)
  }

  return (
    <div
      className={cn(
        'flex flex-col w-72 shrink-0 rounded-xl border bg-slate-50 border-slate-200',
        isSkipped && 'opacity-60 bg-slate-50',
        isOver && 'ring-2 ring-blue-400 ring-offset-2'
      )}
    >
      {/* Column header */}
      <div className="px-4 pt-4 pb-2">
        <PhaseHeader
          phase={phase}
          onSkip={() => setSkipModalOpen(true)}
          onReopen={handleReopen}
        />
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-3 min-h-[80px]"
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 py-2">
            {phase.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={handleEditTask}
                onToggleComplete={isSkipped ? undefined : handleToggleComplete}
                onDelete={isSkipped ? undefined : handleDeleteTask}
              />
            ))}
            {phase.tasks.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No tasks yet</p>
            )}
          </div>
        </SortableContext>
      </div>

      {/* Blockers section */}
      <div className="px-3 pb-2">
        <BlockersSection
          blockers={phase.blockers}
          phaseId={phase.id}
          phaseStatus={phase.status}
          onBlockerClick={handleBlockerClick}
          onAddBlocker={() => setBlockerFormOpen(true)}
        />
      </div>

      {/* Add task button */}
      <div className="px-3 pb-3">
        <Button
          size="sm"
          variant="ghost"
          disabled={isSkipped}
          onClick={handleAddTask}
          className="w-full text-xs h-8 text-slate-500 hover:text-slate-700 border border-dashed border-slate-200 hover:border-slate-300 hover:bg-white"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Task
        </Button>
      </div>

      {/* Modals */}
      <TaskForm
        phaseId={phase.id}
        phaseName={phase.name}
        teamMembers={teamMembers}
        task={editingTask}
        blockers={phase.blockers}
        open={taskFormOpen}
        onOpenChange={(v) => {
          setTaskFormOpen(v)
          if (!v) setEditingTask(undefined)
        }}
        onSuccess={() => {
          router.refresh()
          onTaskUpdate()
        }}
      />

      <SkipPhaseModal
        phaseId={phase.id}
        phaseName={phase.name}
        open={skipModalOpen}
        onOpenChange={setSkipModalOpen}
        onSuccess={() => {
          router.refresh()
          onTaskUpdate()
        }}
      />

      <BlockerForm
        phaseId={phase.id}
        phaseName={phase.name}
        teamMembers={teamMembers}
        tasks={phase.tasks}
        open={blockerFormOpen}
        onOpenChange={setBlockerFormOpen}
        onSuccess={() => {
          router.refresh()
          onTaskUpdate()
        }}
      />

      <BlockerDrawer
        blocker={selectedBlocker}
        open={blockerDrawerOpen}
        onOpenChange={setBlockerDrawerOpen}
        onUpdate={() => {
          router.refresh()
          onTaskUpdate()
        }}
        teamMembers={teamMembers}
        tasks={phase.tasks}
      />
    </div>
  )
}
