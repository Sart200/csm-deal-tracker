import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, getInitials, getUserRoleLabel } from '@/lib/utils'
import type { UserRole } from '@/types'

interface CSMPerformanceData {
  id: string
  name: string
  role: UserRole
  active_deals: number
  active_projects: number
  open_tasks: number
  overdue_tasks: number
  open_blockers: number
}

interface CSMPerformanceCardProps {
  data: CSMPerformanceData
}

interface MetricPillProps {
  label: string
  value: number
  variant?: 'default' | 'warn' | 'danger'
}

function MetricPill({ label, value, variant = 'default' }: MetricPillProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg px-3 py-2 text-center',
        variant === 'default' && 'bg-slate-100',
        variant === 'warn' && (value > 0 ? 'bg-yellow-50' : 'bg-slate-100'),
        variant === 'danger' && (value > 0 ? 'bg-red-50' : 'bg-slate-100')
      )}
    >
      <span
        className={cn(
          'text-lg font-bold leading-none',
          variant === 'default' && 'text-slate-800',
          variant === 'warn' && (value > 0 ? 'text-yellow-700' : 'text-slate-600'),
          variant === 'danger' && (value > 0 ? 'text-red-600' : 'text-slate-600')
        )}
      >
        {value}
      </span>
      <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">{label}</span>
    </div>
  )
}

export function CSMPerformanceCard({ data }: CSMPerformanceCardProps) {
  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">{getInitials(data.name)}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 truncate">{data.name}</p>
            <Badge
              variant="outline"
              className="text-[10px] border-0 bg-slate-100 text-slate-500 px-1.5 py-0 mt-0.5"
            >
              {getUserRoleLabel(data.role)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <MetricPill label="Active Deals" value={data.active_deals} />
          <MetricPill label="Active Projects" value={data.active_projects} />
          <MetricPill label="Open Tasks" value={data.open_tasks} />
          <MetricPill label="Overdue Tasks" value={data.overdue_tasks} variant="danger" />
          <MetricPill label="Open Blockers" value={data.open_blockers} variant="warn" />
        </div>
      </CardContent>
    </Card>
  )
}
