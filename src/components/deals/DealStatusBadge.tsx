import { Badge } from "@/components/ui/badge"
import { cn, getDealStatusClasses, getDealStatusLabel } from "@/lib/utils"
import type { DealStatus } from "@/types"

export function DealStatusBadge({ status }: { status: DealStatus }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border-0", getDealStatusClasses(status))}>
      {getDealStatusLabel(status)}
    </Badge>
  )
}
