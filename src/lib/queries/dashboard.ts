import type { SupabaseClient } from "@supabase/supabase-js"

export interface DealHealthData {
  id: string
  client_name: string
  status: string
  start_date: string | null
  created_at: string
  deal_value: number | null
  csm: { id: string; name: string } | null
  onboarding_total: number
  onboarding_done: number
  /** Per-slot onboarding data for the 9-cell Gantt row */
  onboarding_tasks: { task_number: number; completed_at: string | null }[]
  projects: {
    id: string
    name: string
    status: string
    priority: string
    phases: {
      phase_number: number
      name: string
      status: string
    }[]
    open_blockers: number
    overdue_tasks: number
    total_tasks: number
    done_tasks: number
  }[]
  last_activity_at: string | null
  // computed
  health: "on_track" | "at_risk" | "critical"
  total_open_blockers: number
  total_overdue_tasks: number
  current_phase: number | null
}

export async function getDealHealthDashboard(
  supabase: SupabaseClient
): Promise<DealHealthData[]> {
  const today = new Date().toISOString().split("T")[0]

  // Single query: deals + CSM + onboarding + projects + phases + tasks + blockers
  const { data: deals, error } = await supabase
    .from("deals")
    .select(`
      id, client_name, status, start_date, created_at, deal_value,
      csm:team_members!deals_csm_owner_fkey(id, name),
      onboarding_tasks(id, task_number, completed_at),
      projects(
        id, name, status, priority,
        phases(
          id, phase_number, name, status,
          tasks(id, status, due_date),
          blockers(id, status)
        )
      )
    `)
    .in("status", ["active", "on_hold"])
    .order("created_at", { ascending: false })

  if (error) throw error

  // Fetch last activity per deal
  const { data: activities } = await supabase
    .from("activity_log")
    .select("deal_id, timestamp")
    .order("timestamp", { ascending: false })

  // Build last_activity_at map per deal_id
  const lastActivityMap: Record<string, string> = {}
  ;(activities ?? []).forEach((a) => {
    if (a.deal_id && !lastActivityMap[a.deal_id]) {
      lastActivityMap[a.deal_id] = a.timestamp
    }
  })

  return (deals ?? []).map((deal) => {
    const rawOnboarding: { id: string; task_number: number; completed_at: string | null }[] =
      deal.onboarding_tasks ?? []
    const onboarding_total = rawOnboarding.length
    const onboarding_done = rawOnboarding.filter((t) => t.completed_at).length
    const onboarding_tasks = rawOnboarding.map((t) => ({
      task_number: t.task_number,
      completed_at: t.completed_at,
    }))

    let total_open_blockers = 0
    let total_overdue_tasks = 0

    const projects = (deal.projects ?? []).map((proj: {
      id: string
      name: string
      status: string
      priority: string
      phases: {
        id: string
        phase_number: number
        name: string
        status: string
        tasks: { id: string; status: string; due_date: string | null }[]
        blockers: { id: string; status: string }[]
      }[]
    }) => {
      let open_blockers = 0
      let overdue_tasks = 0
      let total_tasks = 0
      let done_tasks = 0

      const phases = (proj.phases ?? []).map((ph) => {
        // Count open blockers
        open_blockers += (ph.blockers ?? []).filter(
          (b) => b.status !== "resolved"
        ).length

        // Count tasks
        ;(ph.tasks ?? []).forEach((t) => {
          if (t.status !== "na") {
            total_tasks++
            if (t.status === "done") done_tasks++
            if (
              t.due_date &&
              t.due_date < today &&
              t.status !== "done"
            ) overdue_tasks++
          }
        })

        return {
          phase_number: ph.phase_number,
          name: ph.name,
          status: ph.status,
        }
      }).sort((a, b) => a.phase_number - b.phase_number)

      total_open_blockers += open_blockers
      total_overdue_tasks += overdue_tasks

      return {
        id: proj.id,
        name: proj.name,
        status: proj.status,
        priority: proj.priority,
        phases,
        open_blockers,
        overdue_tasks,
        total_tasks,
        done_tasks,
      }
    })

    // Determine current phase (first in_progress across all projects)
    let current_phase: number | null = null
    for (const proj of projects) {
      const inProgress = proj.phases.find((p) => p.status === "in_progress")
      if (inProgress) {
        current_phase = inProgress.phase_number
        break
      }
    }

    // Health signal
    let health: "on_track" | "at_risk" | "critical" = "on_track"
    const last = lastActivityMap[deal.id]
    const daysSinceActivity = last
      ? Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    if (total_open_blockers > 0 && total_overdue_tasks > 1) {
      health = "critical"
    } else if (total_open_blockers > 0 || total_overdue_tasks > 0 || daysSinceActivity > 14) {
      health = "at_risk"
    }

    // Supabase returns FK joins as array; pick first element
    const csmRaw = Array.isArray(deal.csm) ? deal.csm[0] : deal.csm
    const csm: { id: string; name: string } | null = csmRaw
      ? { id: String(csmRaw.id), name: String(csmRaw.name) }
      : null

    return {
      id: deal.id,
      client_name: deal.client_name,
      status: deal.status,
      start_date: deal.start_date,
      created_at: deal.created_at,
      deal_value: deal.deal_value,
      csm,
      onboarding_total,
      onboarding_done,
      onboarding_tasks,
      projects,
      last_activity_at: lastActivityMap[deal.id] ?? null,
      health,
      total_open_blockers,
      total_overdue_tasks,
      current_phase,
    }
  })
}

export interface GlobalStats {
  active_deals: number
  at_risk_deals: number
  critical_deals: number
  total_open_blockers: number
  total_overdue_tasks: number
}

export function computeGlobalStats(deals: DealHealthData[]): GlobalStats {
  return {
    active_deals: deals.filter((d) => d.status === "active").length,
    at_risk_deals: deals.filter((d) => d.health === "at_risk").length,
    critical_deals: deals.filter((d) => d.health === "critical").length,
    total_open_blockers: deals.reduce((sum, d) => sum + d.total_open_blockers, 0),
    total_overdue_tasks: deals.reduce((sum, d) => sum + d.total_overdue_tasks, 0),
  }
}
