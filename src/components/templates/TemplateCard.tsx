'use client'

import { Pin, Archive, LayoutTemplate, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn, getPhaseName } from '@/lib/utils'
import type { TemplateWithTasks } from '@/types'

interface TemplateCardProps {
  template: TemplateWithTasks
  onPin?: (id: string, pinned: boolean) => void
  onArchive?: (id: string) => void
  onApply?: (template: TemplateWithTasks) => void
  isManager?: boolean
}

export function TemplateCard({ template, onPin, onArchive, onApply, isManager }: TemplateCardProps) {
  const taskCount = template.template_tasks.length
  const phaseNumbers = [...new Set(template.template_tasks.map((t) => t.phase_number))].sort()

  return (
    <Card className={cn('bg-white hover:shadow-sm transition-shadow', template.pinned && 'ring-1 ring-blue-200')}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <LayoutTemplate className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{template.name}</p>
              <p className="text-xs text-slate-500">
                by {template.created_by_member?.name ?? 'Unknown'}
              </p>
            </div>
          </div>
          {template.pinned && (
            <Pin className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={cn(
            'text-xs border-0',
            template.type === 'project' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
          )}>
            {template.type === 'project' ? 'Project-level' : `Phase ${template.phase_target} template`}
          </Badge>
          <Badge variant="outline" className={cn(
            'text-xs border-0',
            template.scope === 'shared' ? 'bg-slate-100 text-slate-600' : 'bg-purple-100 text-purple-700'
          )}>
            {template.scope === 'shared' ? 'Shared' : 'Personal'}
          </Badge>
          <Badge variant="outline" className="text-xs border-0 bg-slate-100 text-slate-600">
            {taskCount} task{taskCount !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Phases covered */}
        {template.type === 'project' && phaseNumbers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="h-3 w-3 text-slate-400" />
            {phaseNumbers.map((num) => (
              <span key={num} className="text-xs text-slate-500 bg-slate-50 rounded px-1.5 py-0.5 border border-slate-200">
                P{num} · {getPhaseName(num).split(' ')[0]}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {onApply && (
            <Button size="sm" className="h-7 text-xs flex-1" onClick={() => onApply(template)}>
              Use Template
            </Button>
          )}
          {isManager && onPin && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-2"
              onClick={() => onPin(template.id, !template.pinned)}
              title={template.pinned ? 'Unpin' : 'Pin'}
            >
              <Pin className="h-3 w-3" />
            </Button>
          )}
          {isManager && onArchive && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 text-slate-400 hover:text-red-500"
              onClick={() => onArchive(template.id)}
              title="Archive"
            >
              <Archive className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
