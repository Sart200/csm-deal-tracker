'use client'

import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { exportDealToXlsx, exportProjectToXlsx } from '@/lib/export'
import type { DealWithRelations, ProjectWithPhases } from '@/types'

interface ExportButtonProps {
  deal?: DealWithRelations
  project?: ProjectWithPhases
  scope: 'deal' | 'project'
}

export function ExportButton({ deal, project, scope }: ExportButtonProps) {
  function handleExport() {
    try {
      if (scope === 'deal' && deal) {
        exportDealToXlsx(deal)
        toast.success(`Exported ${deal.client_name} deal data`)
      } else if (scope === 'project' && project) {
        exportProjectToXlsx(project)
        toast.success(`Exported ${project.name} project data`)
      } else {
        toast.error('Nothing to export')
      }
    } catch {
      toast.error('Export failed. Please try again.')
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Download className="h-4 w-4 mr-1.5" />
      Export
    </Button>
  )
}
