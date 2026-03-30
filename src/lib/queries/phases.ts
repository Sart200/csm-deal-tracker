import type { SupabaseClient } from "@supabase/supabase-js"
import type { Phase } from "@/types"

export async function skipPhase(
  supabase: SupabaseClient,
  phaseId: string,
  skipReason: string,
  skippedBy: string,
  actorId: string
): Promise<Phase> {
  // 1. Validate: no in-progress tasks
  const { data: inProgressTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("phase_id", phaseId)
    .eq("status", "in_progress")

  if (inProgressTasks && inProgressTasks.length > 0) {
    throw new Error(
      "Cannot skip a phase with in-progress tasks. Complete or mark them N/A first."
    )
  }

  // 2. Mark all tasks in this phase as N/A
  await supabase
    .from("tasks")
    .update({ status: "na", na_reason: "Phase skipped" })
    .eq("phase_id", phaseId)
    .neq("status", "done")

  // 3. Skip the phase
  const { data, error } = await supabase
    .from("phases")
    .update({
      status: "skipped",
      skipped_at: new Date().toISOString(),
      skip_reason: skipReason,
      skipped_by: skippedBy,
    })
    .eq("id", phaseId)
    .select()
    .single()

  if (error) throw error

  // 4. Log to activity
  await supabase.from("activity_log").insert({
    entity_type: "phase",
    entity_id: phaseId,
    project_id: data.project_id,
    action: "phase_skipped",
    actor: actorId,
    metadata: { skip_reason: skipReason, phase_name: data.name },
  })

  return data
}

export async function reopenPhase(
  supabase: SupabaseClient,
  phaseId: string,
  actorId: string
): Promise<Phase> {
  const { data, error } = await supabase
    .from("phases")
    .update({
      status: "not_started",
      skipped_at: null,
      skip_reason: null,
      skipped_by: null,
    })
    .eq("id", phaseId)
    .select()
    .single()

  if (error) throw error

  // Also revert N/A tasks back to todo (those that were skipped)
  await supabase
    .from("tasks")
    .update({ status: "todo", na_reason: null })
    .eq("phase_id", phaseId)
    .eq("status", "na")
    .eq("na_reason", "Phase skipped")

  await supabase.from("activity_log").insert({
    entity_type: "phase",
    entity_id: phaseId,
    project_id: data.project_id,
    action: "phase_reopened",
    actor: actorId,
    metadata: { phase_name: data.name },
  })

  return data
}

export async function updatePhaseStatus(
  supabase: SupabaseClient,
  phaseId: string,
  status: "not_started" | "in_progress" | "blocked" | "completed",
  actorId: string
): Promise<Phase> {
  const updates: Record<string, unknown> = { status }
  if (status === "in_progress") updates.started_at = new Date().toISOString()
  if (status === "completed") updates.completed_at = new Date().toISOString()

  const { data, error } = await supabase
    .from("phases")
    .update(updates)
    .eq("id", phaseId)
    .select()
    .single()

  if (error) throw error

  await supabase.from("activity_log").insert({
    entity_type: "phase",
    entity_id: phaseId,
    project_id: data.project_id,
    action: "phase_status_changed",
    actor: actorId,
    metadata: { new_status: status, phase_name: data.name },
  })

  return data
}
