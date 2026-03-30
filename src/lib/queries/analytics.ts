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

      // Open blockers in this CSM's projects
      // Step 1: get all project IDs owned by this CSM
      const { data: ownedProjects } = await supabase
        .from("projects")
        .select("id")
        .eq("csm_owner", m.id)

      const projectIds = (ownedProjects ?? []).map((p) => p.id)

      let openBlockers = 0
      if (projectIds.length > 0) {
        // Step 2: get phase IDs in those projects
        const { data: phases } = await supabase
          .from("phases")
          .select("id")
          .in("project_id", projectIds)

        const phaseIds = (phases ?? []).map((p) => p.id)

        if (phaseIds.length > 0) {
          // Step 3: count unresolved blockers in those phases
          const { count } = await supabase
            .from("blockers")
            .select("id", { count: "exact", head: true })
            .in("phase_id", phaseIds)
            .neq("status", "resolved")

          openBlockers = count ?? 0
        }
      }

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

export async function getProjectMovementAnalytics(supabase: SupabaseClient) {
  const { data: projects } = await supabase
    .from("projects")
    .select(`
      id, name, status, created_at,
      deal:deals(id, client_name),
      phases(id, phase_number, name, status, started_at, completed_at, skipped_at)
    `)
    .order("created_at", { ascending: false })

  if (!projects) return []

  return projects.map((project) => {
    const sortedPhases = [...(project.phases ?? [])].sort(
      (a, b) => a.phase_number - b.phase_number
    )

    const phasesWithMetrics = sortedPhases.map((phase, idx) => {
      const startDate = phase.started_at ? new Date(phase.started_at) : null
      const endDate = phase.completed_at
        ? new Date(phase.completed_at)
        : phase.skipped_at
        ? new Date(phase.skipped_at)
        : null

      // Days spent in phase: if still active use today; if finished use end date
      let daysInPhase: number | null = null
      if (startDate) {
        const compareTo = endDate ?? new Date()
        daysInPhase = Math.round(
          (compareTo.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      // Transition gap: time between this phase ending and next phase starting
      let transitionDays: number | null = null
      const nextPhase = sortedPhases[idx + 1]
      if (endDate && nextPhase?.started_at) {
        const nextStart = new Date(nextPhase.started_at)
        transitionDays = Math.round(
          (nextStart.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      return { ...phase, days_in_phase: daysInPhase, transition_days: transitionDays }
    })

    return {
      id: project.id,
      name: project.name,
      status: project.status as string,
      created_at: project.created_at,
      deal: project.deal as { id: string; client_name: string } | null,
      phases: phasesWithMetrics,
    }
  })
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
