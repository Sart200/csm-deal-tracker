'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface AnalyticsChartsProps {
  avgPhaseTime: { phase_number: number; name: string; avg_days: number; count: number }[]
  skipRates: { phase_number: number; skip_rate: number; total: number; skipped: number }[]
}

export function AnalyticsCharts({ avgPhaseTime }: AnalyticsChartsProps) {
  const data = avgPhaseTime
    .sort((a, b) => a.phase_number - b.phase_number)
    .map((p) => ({
      name: `P${p.phase_number}`,
      days: p.avg_days,
      fullName: p.name,
    }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip
          formatter={(value) => [`${value} days`, 'Avg Duration']}
          labelFormatter={(label) => {
            const item = data.find((d) => d.name === label)
            return item ? `${label} — ${item.fullName}` : label
          }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
        />
        <Bar dataKey="days" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
