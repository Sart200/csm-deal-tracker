'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Calendar, Check, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  cn,
  formatDateShort,
  getInitials,
  getPriorityClasses,
  getPriorityLabel,
  isOverdue,
} from '@/lib/utils'
import type { TaskWithDetails } from '@/types'

interface TaskCardProps {
  task: TaskWithDetails
  onEdit: (task: TaskWithDetails) => void
  onToggleComplete?: (task: TaskWithDetails) => void
  onDelete?: (task: TaskWithDetails) => void
}

export function TaskCard({ task, onEdit, onToggleComplete, onDelete }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityClasses = getPriorityClasses(task.priority)
  const overdue = isOverdue(task.due_date)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative bg-white rounded-md border border-slate-200 shadow-sm',
        'border-l-4 hover:shadow-md transition-shadow cursor-pointer',
        priorityClasses.border,
        isDragging && 'opacity-50 shadow-lg ring-2 ring-blue-400',
        task.status === 'done' && 'opacity-60',
        task.status === 'na' && 'opacity-40'
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors opacity-0 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      {/* Right-side action buttons */}
      <div className="absolute right-2.5 top-2.5 flex flex-col gap-1">
        {/* Completion checkbox */}
        {onToggleComplete && task.status !== 'na' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleComplete(task) }}
            className={cn(
              'h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors',
              task.status === 'done'
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-slate-300 bg-white hover:border-green-400'
            )}
            title={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}
          >
            {task.status === 'done' && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
          </button>
        )}

        {/* Delete button — shows on hover */}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(task) }}
            className="h-4 w-4 rounded flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            title="Delete task"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Card body */}
      <div
        className="pl-6 pr-7 py-3 space-y-2"
        onClick={() => onEdit(task)}
      >
        {/* Title */}
        <p
          className={cn(
            'text-sm font-medium text-slate-800 leading-snug',
            task.status === 'done' && 'line-through text-slate-400'
          )}
        >
          {task.title}
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {/* Assignee avatar */}
            {task.assignee_member && (
              <div
                className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0"
                title={task.assignee_member.name}
              >
                <span className="text-[9px] font-bold text-white">
                  {getInitials(task.assignee_member.name)}
                </span>
              </div>
            )}

            {/* Due date */}
            {task.due_date && (
              <div
                className={cn(
                  'flex items-center gap-0.5 text-xs',
                  overdue && task.status !== 'done' ? 'text-red-500 font-medium' : 'text-slate-400'
                )}
              >
                <Calendar className="h-3 w-3" />
                <span>{formatDateShort(task.due_date)}</span>
              </div>
            )}
          </div>

          {/* Priority badge */}
          <Badge
            variant="outline"
            className={cn('text-[10px] border-0 px-1 py-0 shrink-0', priorityClasses.badge)}
          >
            {getPriorityLabel(task.priority)}
          </Badge>
        </div>
      </div>
    </div>
  )
}
