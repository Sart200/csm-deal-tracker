import { Badge } from "@/components/ui/badge"
import { cn, getBlockerStatusClasses, getBlockerStatusLabel } from "@/lib/utils"
import type { BlockerStatus } from "@/types"

export function BlockerStatusBadge({ status }: { status: BlockerStatus }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border-0", getBlockerStatusClasses(status))}>
      {getBlockerStatusLabel(status)}
    </Badge>
  )
}
