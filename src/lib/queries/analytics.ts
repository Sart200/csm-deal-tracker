import type { SupabaseClient } from "@supabase/supabase-js"
import type { DashboardStats } from "@/types"

export async function getDashboardStats(
  supabase: SupabaseClient
): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc("get_dashboard_stats")
  if (error) throw error
  return data as DashboardStats
}

export async function getCSMPerformance(supabase: SupabaseClient) {
  // Fetch team members with their deal/task data
  const { data: members } = await supabase
    .from("team_members")
    .select("id, name, email, role")
    .order("name")

  if (!members) return []

  const results = await Promise.all(
    members.map(async (m) => {
      // Active deals
      const { count: activeDeals } = await supabase
        .from("deals")
        .select("id", { count: "exact", head: true })
        .eq("csm_owner", m.id)
        .eq("status", "active")

      // Active projects
      const { count: activeProjects } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("csm_owner", m.id)
        .eq("status", "active")

      // Open tasks assigned
      const { count: openTasks } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assignee", m.id)
        .not("status", "in", '("done","na")')

      // Overdue tasks
      const { count: overdueTasks } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assignee", m.id)
        .lt("due_date", new Date().toISOString().split("T")[0])
        .not("status", "in", '("done","na")')

      // Open blockers they own
      const { count: openBlockers } = await supabase
        .from("blockers")
        .select("id", { count: "exact", head: true })
        .eq("owner", m.id)
        .not("status", "eq", "resolved")

      return {
        ...m,
        active_deals: activeDeals ?? 0,
        active_projects: activeProjects ?? 0,
        open_tasks: openTasks ?? 0,
        overdue_tasks: overdueTasks ?? 0,
        open_blockers: openBlockers ?? 0,
      }
    })
  )

  return results
}

export async function getPipelineMetrics(supabase: SupabaseClient) {
  // Phase time analysis — avg days per phase across all completed phases
  const { data: completedPhases } = await supabase
    .from("phases")
    .select("phase_number, name, started_at, completed_at")
    .eq("status", "completed")
    .not("started_at", "is", null)
    .not("completed_at", "is", null)

  const phaseMetrics: Record<
    number,
    { name: string; total_days: number; count: number }
  > = {}

  ;(completedPhases ?? []).forEach((p) => {
    const days =
      (new Date(p.completed_at!).getTime() - new Date(p.started_at!).getTime()) /
      (1000 * 60 * 60 * 24)
    if (!phaseMetrics[p.phase_number]) {
      phaseMetrics[p.phase_number] = { name: p.name, total_days: 0, count: 0 }
    }
    phaseMetrics[p.phase_number].total_days += days
    phaseMetrics[p.phase_number].count += 1
  })

  const avgPhaseTime = Object.entries(phaseMetrics).map(([num, m]) => ({
    phase_number: parseInt(num),
    name: m.name,
    avg_days: m.count > 0 ? Math.round(m.total_days / m.count) : 0,
    count: m.count,
  }))

  // Skip rate per phase
  const { data: allPhases } = await supabase
    .from("phases")
    .select("phase_number, status")

  const skipMetrics: Record<number, { total: number; skipped: number }> = {}
  ;(allPhases ?? []).forEach((p) => {
    if (!skipMetrics[p.phase_number]) skipMetrics[p.phase_number] = { total: 0, skipped: 0 }
    skipMetrics[p.phase_number].total += 1
    if (p.status === "skipped") skipMetrics[p.phase_number].skipped += 1
  })

  const skipRates = Object.entries(skipMetrics).map(([num, m]) => ({
    phase_number: parseInt(num),
    skip_rate: m.total > 0 ? Math.round((m.skipped / m.total) * 100) : 0,
    total: m.total,
    skipped: m.skipped,
  }))

  return { avgPhaseTime, skipRates }
}
