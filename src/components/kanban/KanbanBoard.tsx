'use client'

import { useEffect, useCallback, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { PhaseColumn } from './PhaseColumn'
import { TaskCard } from './TaskCard'
import { createClient } from '@/lib/supabase/client'
import { updateTask } from '@/lib/queries/tasks'
import { updatePhaseStatus } from '@/lib/queries/phases'
import type { ProjectWithPhases, TeamMember, TaskWithDetails } from '@/types'

interface KanbanBoardProps {
  project: ProjectWithPhases
  teamMembers: TeamMember[]
}

export function KanbanBoard({ project, teamMembers }: KanbanBoardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [activeTask, setActiveTask] = useState<TaskWithDetails | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  // Realtime subscription
  useEffect(() => {
    const phaseIds = project.phases.map((p) => p.id)
    if (phaseIds.length === 0) return

    const channel = supabase
      .channel(`project-tasks-${project.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `phase_id=in.(${phaseIds.join(',')})`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [project.id, project.phases, supabase, router])

  function findTaskById(taskId: string): TaskWithDetails | null {
    for (const phase of project.phases) {
      const task = phase.tasks.find((t) => t.id === taskId)
      if (task) return task
    }
    return null
  }

  function findPhaseByTaskId(taskId: string): string | null {
    for (const phase of project.phases) {
      if (phase.tasks.some((t) => t.id === taskId)) return phase.id
    }
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    const task = findTaskById(event.active.id as string)
    setActiveTask(task)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    const sourcePhaseId = findPhaseByTaskId(taskId)
    if (!sourcePhaseId) return

    // Determine target phase: overId could be a phase id or a task id
    let targetPhaseId: string | null = null
    if (project.phases.some((p) => p.id === overId)) {
      targetPhaseId = overId
    } else {
      targetPhaseId = findPhaseByTaskId(overId)
    }

    if (!targetPhaseId || targetPhaseId === sourcePhaseId) return

    try {
      // Get actor
      const { data: member } = await supabase
        .from('team_members')
        .select('id')
        .limit(1)
        .single()
      const actorId = member?.id ?? 'system'

      // Move task to new phase
      await updateTask(supabase, taskId, { phase_id: targetPhaseId, status: 'todo' } as never, actorId)

      // Auto-start target phase if not_started
      const targetPhase = project.phases.find((p) => p.id === targetPhaseId)
      if (targetPhase && targetPhase.status === 'not_started') {
        await updatePhaseStatus(supabase, targetPhaseId, 'in_progress', actorId)
      }

      toast.success('Task moved')
      router.refresh()
    } catch {
      toast.error('Failed to move task')
    }
  }

  const handleTaskUpdate = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <DndContext
      id={`kanban-${project.id}`}
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 px-1 pt-1">
        {project.phases.map((phase) => (
          <PhaseColumn
            key={phase.id}
            phase={phase}
            teamMembers={teamMembers}
            onTaskUpdate={handleTaskUpdate}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rotate-2 scale-105">
            <TaskCard task={activeTask} onEdit={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
