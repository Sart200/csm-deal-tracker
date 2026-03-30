'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LayoutTemplate, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { applyTemplateToPhase } from '@/lib/queries/templates'
import { getInitials, cn } from '@/lib/utils'
import type { TemplateWithTasks } from '@/types'

interface LoadTemplateModalProps {
  phaseId: string
  phaseName: string
  phaseNumber: number
  templates: TemplateWithTasks[]
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}

export function LoadTemplateModal({
  phaseId,
  phaseName,
  phaseNumber,
  templates,
  open,
  onOpenChange,
  onSuccess,
}: LoadTemplateModalProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Filter templates compatible with this phase
  const compatible = templates.filter(
    (t) => t.type === 'phase' && (t.phase_target === phaseNumber || t.phase_target === null)
  )

  async function handleApply() {
    if (!selectedId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: members } = await supabase.from('team_members').select('id').limit(1).single()
      await applyTemplateToPhase(supabase, selectedId, phaseId, members?.id)
      toast.success('Template applied — tasks added to phase')
      onOpenChange(false)
      setSelectedId(null)
      router.refresh()
      onSuccess()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to apply template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Load Template</DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Applying to <strong>{phaseName}</strong> — tasks will be appended (existing tasks not overwritten)
          </p>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto py-1">
          {compatible.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center text-slate-400">
              <LayoutTemplate className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No phase templates available</p>
              <p className="text-xs mt-1">Create one from the Templates page</p>
            </div>
          ) : (
            compatible.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id === selectedId ? null : t.id)}
                className={cn(
                  'w-full text-left rounded-lg border p-3 transition-all',
                  selectedId === t.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.template_tasks.length} task{t.template_tasks.length !== 1 ? 's' : ''} ·{' '}
                      by {t.created_by_member?.name ?? 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={cn(
                      'text-xs border-0',
                      t.scope === 'shared' ? 'bg-slate-100 text-slate-600' : 'bg-purple-100 text-purple-700'
                    )}>
                      {t.scope}
                    </Badge>
                    {selectedId === t.id && (
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleApply} disabled={!selectedId || loading}>
            {loading ? 'Applying…' : 'Apply Template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
