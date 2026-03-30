'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PHASE_NAMES } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { createTemplate } from '@/lib/queries/templates'
import type { TeamMember, TemplateType, TemplateScope, PriorityLevel } from '@/types'

const PRIORITIES: { value: PriorityLevel; label: string; classes: string }[] = [
  { value: 'high',   label: 'High',   classes: 'border-red-200 text-red-600 bg-red-50' },
  { value: 'medium', label: 'Med',    classes: 'border-yellow-200 text-yellow-600 bg-yellow-50' },
  { value: 'low',    label: 'Low',    classes: 'border-slate-200 text-slate-500 bg-slate-50' },
]

interface TaskRow {
  id: number
  phase_number: number
  title: string
  priority: PriorityLevel
}

let _id = 0
const nextId = () => ++_id

interface CreateTemplateModalProps {
  teamMembers: TeamMember[]
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function CreateTemplateModal({ teamMembers, open, onOpenChange }: CreateTemplateModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState<TemplateType>('project')
  const [scope, setScope] = useState<TemplateScope>('shared')
  const [phaseTarget, setPhaseTarget] = useState<number>(1)
  const [createdBy, setCreatedBy] = useState<string>('')
  const [tasks, setTasks] = useState<TaskRow[]>([
    { id: nextId(), phase_number: 1, title: '', priority: 'medium' },
  ])

  function reset() {
    setName('')
    setType('project')
    setScope('shared')
    setPhaseTarget(1)
    setCreatedBy('')
    setTasks([{ id: nextId(), phase_number: 1, title: '', priority: 'medium' }])
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  function addTask() {
    const defaultPhase = type === 'phase' ? phaseTarget : 1
    setTasks((prev) => [...prev, { id: nextId(), phase_number: defaultPhase, title: '', priority: 'medium' }])
  }

  function removeTask(id: number) {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function updateTask(id: number, field: keyof TaskRow, value: string | number) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Template name is required'); return }
    const validTasks = tasks.filter((t) => t.title.trim())
    if (validTasks.length === 0) { toast.error('Add at least one task'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      await createTemplate(
        supabase,
        {
          name: name.trim(),
          type,
          scope,
          phase_target: type === 'phase' ? phaseTarget : null,
          created_by: createdBy || undefined,
        },
        validTasks.map((t, i) => ({
          phase_number: type === 'phase' ? phaseTarget : t.phase_number,
          title: t.title.trim(),
          priority: t.priority,
          sort_order: i,
        }))
      )
      toast.success(`Template "${name.trim()}" created`)
      handleOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Failed to create template')
    } finally {
      setLoading(false)
    }
  }

  const phaseOptions = PHASE_NAMES.slice(1).map((name, i) => ({ value: i + 1, label: `Phase ${i + 1} — ${name}` }))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
          <p className="text-sm text-slate-500">
            Build a reusable task template for projects or individual phases.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="tmpl-name">
              Template Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="tmpl-name"
              placeholder="e.g. Standard Onboarding Flow"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Type + Scope */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(['project', 'phase'] as TemplateType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      'flex-1 py-1.5 text-sm font-medium rounded-md border transition-colors capitalize',
                      type === t
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {t === 'project' ? 'Project-level' : 'Phase-level'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {type === 'project'
                  ? 'Tasks are spread across multiple phases'
                  : 'All tasks apply to one specific phase'}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <div className="flex gap-2">
                {(['shared', 'personal'] as TemplateScope[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={cn(
                      'flex-1 py-1.5 text-sm font-medium rounded-md border transition-colors capitalize',
                      scope === s
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {s === 'shared' ? 'Shared' : 'Personal'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                {scope === 'shared' ? 'Visible to the whole team' : 'Only visible to you'}
              </p>
            </div>
          </div>

          {/* Phase target (only for phase-type) */}
          {type === 'phase' && (
            <div className="space-y-1.5">
              <Label>Target Phase</Label>
              <Select
                value={String(phaseTarget)}
                onValueChange={(v) => setPhaseTarget(v ? Number(v) : 1)}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v: string) => phaseOptions.find(p => p.value === Number(v))?.label ?? `Phase ${v}`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Created by */}
          {teamMembers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Created By</Label>
              <Select value={createdBy} onValueChange={(v) => setCreatedBy(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team member…">
                    {(v: string) => v ? (teamMembers.find(m => m.id === v)?.name ?? v) : 'Select team member…'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Tasks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tasks <span className="text-red-500">*</span></Label>
              <Badge variant="outline" className="text-xs">
                {tasks.filter(t => t.title.trim()).length} task{tasks.filter(t => t.title.trim()).length !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {tasks.map((task, idx) => (
                <div key={task.id} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                  {/* Phase selector (only for project-type) */}
                  {type === 'project' && (
                    <Select
                      value={String(task.phase_number)}
                      onValueChange={(v) => updateTask(task.id, 'phase_number', v ? Number(v) : 1)}
                    >
                      <SelectTrigger className="h-7 w-28 shrink-0 text-xs">
                        <SelectValue>
                          {(v: string) => `P${v}`}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {phaseOptions.map((p) => (
                          <SelectItem key={p.value} value={String(p.value)} className="text-xs">
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Title */}
                  <Input
                    className="h-7 text-sm flex-1"
                    placeholder={`Task ${idx + 1} title…`}
                    value={task.title}
                    onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                  />

                  {/* Priority */}
                  <div className="flex gap-1 shrink-0">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => updateTask(task.id, 'priority', p.value)}
                        className={cn(
                          'h-7 px-2 text-xs font-medium rounded border transition-colors',
                          task.priority === p.value
                            ? p.classes + ' ring-1 ring-offset-1 ring-blue-400'
                            : 'border-slate-200 text-slate-400 hover:border-slate-300'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeTask(task.id)}
                    disabled={tasks.length === 1}
                    className="h-7 w-7 flex items-center justify-center rounded text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addTask}
              className="w-full h-8 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </button>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
