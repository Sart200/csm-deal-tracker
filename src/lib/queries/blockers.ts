import type { SupabaseClient } from "@supabase/supabase-js"
import type { Blocker, BlockerWithDetails, BlockerFormData } from "@/types"
import { logActivity } from "./log"

export async function createBlocker(
  supabase: SupabaseClient,
  data: BlockerFormData,
  actorId?: string
): Promise<Blocker> {
  const { data: blocker, error } = await supabase
    .from("blockers")
    .insert({
      phase_id: data.phase_id || null,
      task_id: data.task_id || null,
      title: data.title,
      description: data.description || null,
      category: data.category,
      raised_by: actorId || null,
      owner: data.owner || null,
      target_resolution_date: data.target_resolution_date || null,
    })
    .select()
    .single()
  if (error) throw error

  if (data.phase_id) {
    const { data: phase } = await supabase
      .from("phases")
      .select("project_id")
      .eq("id", data.phase_id)
      .single()

    if (phase) {
      await logActivity(supabase, {
        entity_type: "blocker",
        entity_id: blocker.id,
        project_id: phase.project_id,
        action: "blocker_raised",
        actor: actorId ?? null,
        metadata: { title: blocker.title, category: blocker.category },
      })
    }
  }

  return blocker
}

export async function createOnboardingBlocker(
  supabase: SupabaseClient,
  onboardingTaskId: string,
  data: { title: string; description?: string; category: string }
): Promise<Blocker> {
  // Create the blocker (no phase_id for onboarding tasks)
  const { data: blocker, error } = await supabase
    .from("blockers")
    .insert({
      phase_id: null,
      task_id: null,
      title: data.title,
      description: data.description || null,
      category: data.category,
    })
    .select()
    .single()
  if (error) throw error

  // Link it back to the onboarding task
  const { error: linkError } = await supabase
    .from("onboarding_tasks")
    .update({ blocker_id: blocker.id })
    .eq("id", onboardingTaskId)
  if (linkError) throw linkError

  return blocker
}

export async function unlinkOnboardingBlocker(
  supabase: SupabaseClient,
  onboardingTaskId: string
): Promise<void> {
  const { error } = await supabase
    .from("onboarding_tasks")
    .update({ blocker_id: null })
    .eq("id", onboardingTaskId)
  if (error) throw error
}

export async function updateBlocker(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<{
    title: string
    description: string
    category: string
    owner: string
    target_resolution_date: string
    status: string
    resolution_notes: string
    escalation_note: string
    resolved_at: string
  }>,
  actorId?: string
): Promise<Blocker> {
  // Auto-set resolved_at when resolving
  if (updates.status === "resolved" && !updates.resolved_at) {
    updates.resolved_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from("blockers")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error

  const { data: phase } = await supabase
    .from("phases")
    .select("project_id")
    .eq("id", data.phase_id)
    .single()

  if (updates.status && phase) {
    const action =
      updates.status === "resolved" ? "blocker_resolved" :
      updates.status === "escalated" ? "blocker_escalated" :
      "blocker_status_changed"
    await logActivity(supabase, {
      entity_type: "blocker",
      entity_id: id,
      project_id: phase.project_id,
      action,
      actor: actorId ?? null,
      metadata: { new_status: updates.status, title: data.title },
    })
  } else if (!updates.status && phase) {
    await logActivity(supabase, {
      entity_type: "blocker",
      entity_id: id,
      project_id: phase.project_id,
      action: "blocker_updated",
      actor: actorId ?? null,
      metadata: { title: data.title },
    })
  }

  return data
}

export async function getAllOpenBlockers(
  supabase: SupabaseClient
): Promise<BlockerWithDetails[]> {
  const { data, error } = await supabase
    .from("blockers")
    .select(`
      *,
      raised_by_member:team_members!blockers_raised_by_fkey(id, name),
      owner_member:team_members!blockers_owner_fkey(id, name),
      phase:phases(
        id, phase_number, name, project_id,
        project:projects(
          id, name, deal_id,
          deal:deals(id, client_name)
        )
      )
    `)
    .in("status", ["open", "in_resolution", "escalated"])
    .order("raised_at", { ascending: true })
  if (error) throw error
  return (data ?? []).map((b) => ({
    ...b,
    project: (b.phase as { project?: unknown })?.project ?? null,
    deal: ((b.phase as { project?: { deal?: unknown } })?.project as { deal?: unknown })?.deal ?? null,
  })) as BlockerWithDetails[]
}

export async function getBlockersByPhase(
  supabase: SupabaseClient,
  phaseId: string
): Promise<BlockerWithDetails[]> {
  const { data, error } = await supabase
    .from("blockers")
    .select(`
      *,
      raised_by_member:team_members!blockers_raised_by_fkey(id, name),
      owner_member:team_members!blockers_owner_fkey(id, name)
    `)
    .eq("phase_id", phaseId)
    .order("raised_at", { ascending: false })
  if (error) throw error
  return data ?? []
}
