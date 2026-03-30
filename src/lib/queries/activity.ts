import type { SupabaseClient } from "@supabase/supabase-js"
import type { ActivityLogWithActor } from "@/types"

export async function getActivityLog(
  supabase: SupabaseClient,
  options?: {
    dealId?: string
    projectId?: string
    entityType?: string
    actorId?: string
    limit?: number
    offset?: number
  }
): Promise<ActivityLogWithActor[]> {
  let query = supabase
    .from("activity_log")
    .select(`
      *,
      actor_member:team_members(id, name, role)
    `)
    .order("timestamp", { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
  if (options?.dealId) query = query.eq("deal_id", options.dealId)
  if (options?.projectId) query = query.eq("project_id", options.projectId)
  if (options?.entityType) query = query.eq("entity_type", options.entityType)
  if (options?.actorId) query = query.eq("actor", options.actorId)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export function getActivityActionLabel(action: string): string {
  const labels: Record<string, string> = {
    // Deal
    deal_created: "Deal created",
    deal_updated: "Deal updated",
    deal_status_changed: "Deal status changed",
    // Onboarding
    onboarding_task_completed: "Onboarding task completed",
    onboarding_task_reopened: "Onboarding task re-opened",
    onboarding_task_uncompleted: "Onboarding task unchecked",
    // Project
    project_created: "Project created",
    project_updated: "Project updated",
    project_status_changed: "Project status changed",
    // Phase
    phase_status_changed: "Phase status changed",
    phase_skipped: "Phase skipped",
    phase_reopened: "Phase re-opened",
    // Task
    task_created: "Task created",
    task_updated: "Task updated",
    task_completed: "Task completed",
    task_reopened: "Task re-opened",
    task_status_changed: "Task status changed",
    // Blocker
    blocker_raised: "Blocker raised",
    blocker_updated: "Blocker updated",
    blocker_status_changed: "Blocker status updated",
    blocker_escalated: "Blocker escalated",
    blocker_resolved: "Blocker resolved",
    // Templates & export
    template_applied: "Template applied to project",
    template_applied_to_phase: "Template applied to phase",
    export_triggered: "Export triggered",
  }
  return labels[action] ?? action.replace(/_/g, " ")
}

export function getActivityActionIcon(action: string): string {
  if (action === "blocker_resolved") return "✅"
  if (action === "blocker_escalated") return "🚨"
  if (action.includes("blocker")) return "🔴"
  if (action === "phase_skipped") return "⏭️"
  if (action.includes("phase")) return "📋"
  if (action === "task_completed") return "✅"
  if (action.includes("task")) return "🔲"
  if (action === "project_created") return "📁"
  if (action.includes("project")) return "📁"
  if (action === "deal_created") return "🤝"
  if (action.includes("deal")) return "🤝"
  if (action.includes("onboarding")) return "☑️"
  if (action.includes("template")) return "📌"
  if (action.includes("export")) return "📊"
  return "📝"
}
