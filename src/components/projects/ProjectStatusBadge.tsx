import { Badge } from "@/components/ui/badge"
import { cn, getProjectStatusClasses, getProjectStatusLabel } from "@/lib/utils"
import type { ProjectStatus } from "@/types"

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border-0", getProjectStatusClasses(status))}>
      {getProjectStatusLabel(status)}
    </Badge>
  )
}
