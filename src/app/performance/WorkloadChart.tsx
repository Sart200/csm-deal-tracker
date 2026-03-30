'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WorkloadData {
  id: string
  name: string
  open_tasks: number
  overdue_tasks: number
  open_blockers: number
}

interface WorkloadChartProps {
  data: WorkloadData[]
}

export function WorkloadChart({ data }: WorkloadChartProps) {
  const chartData = data.map((m) => ({
    name: m.name.split(' ')[0], // First name only for chart
    'Open Tasks': m.open_tasks,
    'Overdue': m.overdue_tasks,
    'Blockers': m.open_blockers,
  }))

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-700">
          Tasks &amp; Blockers by CSM
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barSize={24}
            barCategoryGap="30%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Open Tasks" fill="#2563eb" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Overdue" fill="#ef4444" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Blockers" fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
