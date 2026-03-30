'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod/v4'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { createProject } from '@/lib/queries/projects'
import { getTeamMembers } from '@/lib/queries/team'
import { getTemplates, applyTemplateToProject } from '@/lib/queries/templates'
import { cn } from '@/lib/utils'
import type { TeamMember, TemplateWithTasks, PriorityLevel } from '@/types'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  csm_owner: z.string().min(1, 'CSM Owner is required'),
  target_completion_date: z.string().optional(),
  template_id: z.string().optional(),
})

type ProjectFormValues = z.infer<typeof projectSchema>

const PRIORITIES: { value: PriorityLevel; label: string; classes: string }[] = [
  { value: 'high', label: 'High', classes: 'border-red-300 bg-red-50 text-red-700' },
  { value: 'medium', label: 'Medium', classes: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
  { value: 'low', label: 'Low', classes: 'border-slate-200 bg-slate-50 text-slate-500' },
]

export default function NewProjectPage() {
  const router = useRouter()
  const params = useParams<{ dealId: string }>()
  const dealId = params.dealId

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [templates, setTemplates] = useState<TemplateWithTasks[]>([])
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      getTeamMembers(supabase),
      getTemplates(supabase),
    ]).then(([members, tmpls]) => {
      setTeamMembers(members)
      setTemplates(tmpls.filter((t) => t.type === 'project'))
    }).catch(console.error)
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      priority: 'medium',
      csm_owner: '',
      target_completion_date: '',
      template_id: undefined,
    },
  })

  const priority = watch('priority')
  const csmOwner = watch('csm_owner')
  const templateId = watch('template_id')

  async function onSubmit(values: ProjectFormValues) {
    try {
      const project = await createProject(supabase, dealId, {
        name: values.name,
        description: values.description || undefined,
        priority: values.priority,
        csm_owner: values.csm_owner,
        target_completion_date: values.target_completion_date || undefined,
      })

      if (values.template_id && values.template_id !== 'none') {
        try {
          await applyTemplateToProject(supabase, values.template_id, project.id)
        } catch {
          // Template application failure is non-fatal
          toast.warning('Project created but template could not be applied')
        }
      }

      toast.success(`Project "${project.name}" created!`)
      router.push(`/deals/${dealId}/projects/${project.id}`)
    } catch {
      toast.error('Failed to create project')
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/deals/${dealId}`} className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Create Project</h1>
          <p className="text-sm text-slate-500">Add a new project to this deal</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Project Name */}
            <div className="space-y-1.5">
              <Label htmlFor="project-name">
                Project Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="project-name"
                placeholder="e.g. Email Campaign Q1"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="project-desc">Description (optional)</Label>
              <Textarea
                id="project-desc"
                placeholder="Brief project description…"
                rows={3}
                {...register('description')}
              />
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setValue('priority', p.value)}
                    className={cn(
                      'flex-1 py-2 text-sm font-medium rounded-md border transition-colors',
                      p.classes,
                      priority === p.value && 'ring-2 ring-offset-1 ring-blue-400'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CSM Owner */}
            <div className="space-y-1.5">
              <Label>
                CSM Owner <span className="text-red-500">*</span>
              </Label>
              <Select
                value={csmOwner}
                onValueChange={(v) => setValue('csm_owner', v ?? '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select CSM Owner">
                    {(v: string) => v ? (teamMembers.find(m => m.id === v)?.name ?? v) : 'Select CSM Owner'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.csm_owner && (
                <p className="text-xs text-red-500">{errors.csm_owner.message}</p>
              )}
            </div>

            {/* Target Completion Date */}
            <div className="space-y-1.5">
              <Label htmlFor="target-date">Target Completion Date (optional)</Label>
              <Input
                id="target-date"
                type="date"
                {...register('target_completion_date')}
              />
            </div>

            {/* Template */}
            {templates.length > 0 && (
              <div className="space-y-1.5">
                <Label>Template (optional)</Label>
                <Select
                  value={templateId ?? 'none'}
                  onValueChange={(v) => setValue('template_id', (v === 'none' || v == null) ? undefined : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.template_tasks.length} tasks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link href={`/deals/${dealId}`} className={buttonVariants({ variant: 'outline' }) + ' flex-1 text-center'}>
                Cancel
              </Link>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Creating…' : 'Create Project'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
