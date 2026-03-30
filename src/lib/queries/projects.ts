import type { SupabaseClient } from "@supabase/supabase-js"
import type { Project, ProjectWithPhases, ProjectFormData } from "@/types"
import { logActivity } from "./log"

export async function getProjectsByDeal(
  supabase: SupabaseClient,
  dealId: string
): Promise<ProjectWithPhases[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      csm:team_members(id, name, email),
      deal:deals(id, client_name),
      phases(
        id, project_id, phase_number, name, description, status,
        started_at, completed_at, skipped_at, skip_reason, skipped_by, created_at, updated_at,
        tasks(id, status, due_date),
        blockers(id, status)
      )
    `)
    .eq("deal_id", dealId)
    .order("created_at")
  if (error) throw error
  return data ?? []
}

export async function getProjectsByDealWithTasks(
  supabase: SupabaseClient,
  dealId: string
): Promise<ProjectWithPhases[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      csm:team_members(id, name, email),
      deal:deals(id, client_name),
      phases(
        id, project_id, phase_number, name, description, status,
        started_at, completed_at, skipped_at, skip_reason, skipped_by, created_at, updated_at,
        skipped_by_member:team_members(id, name),
        tasks(
          id, phase_id, title, description, assignee, priority,
          due_date, started_at, completed_at, status, na_reason,
          blocker_id, sort_order, created_at, updated_at,
          assignee_member:team_members(id, name, avatar_url)
        ),
        blockers(
          id, phase_id, task_id, title, description, category,
          raised_by, raised_at, owner, target_resolution_date,
          resolved_at, resolution_notes, status, escalation_note,
          created_at, updated_at,
          raised_by_member:team_members!blockers_raised_by_fkey(id, name),
          owner_member:team_members!blockers_owner_fkey(id, name)
        )
      )
    `)
    .eq("deal_id", dealId)
    .order("created_at")
    .order("phase_number", { referencedTable: "phases" })
  if (error) throw error
  return data ?? []
}

export async function getProjectById(
  supabase: SupabaseClient,
  id: string
): Promise<ProjectWithPhases | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      csm:team_members(id, name, email),
      deal:deals(id, client_name),
      phases(
        id, project_id, phase_number, name, description, status,
        started_at, completed_at, skipped_at, skip_reason, skipped_by, created_at, updated_at,
        skipped_by_member:team_members(id, name),
        tasks(
          id, phase_id, title, description, assignee, priority,
          due_date, started_at, completed_at, status, na_reason,
          blocker_id, sort_order, created_at, updated_at,
          assignee_member:team_members(id, name, avatar_url)
        ),
        blockers(
          id, phase_id, task_id, title, description, category,
          raised_by, raised_at, owner, target_resolution_date,
          resolved_at, resolution_notes, status, escalation_note,
          created_at, updated_at,
          raised_by_member:team_members!blockers_raised_by_fkey(id, name),
          owner_member:team_members!blockers_owner_fkey(id, name)
        )
      )
    `)
    .eq("id", id)
    .order("phase_number", { referencedTable: "phases" })
    .single()
  if (error) return null
  return data
}

export async function createProject(
  supabase: SupabaseClient,
  dealId: string,
  data: ProjectFormData & { phases?: string[] },
  actorId?: string
): Promise<Project> {
  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      deal_id: dealId,
      name: data.name,
      description: data.description || null,
      priority: data.priority,
      csm_owner: data.csm_owner || null,
      target_completion_date: data.target_completion_date || null,
    })
    .select()
    .single()
  if (error) throw error

  // Create phases if provided
  if (data.phases && data.phases.length > 0) {
    const phaseRows = data.phases
      .filter((name) => name.trim())
      .map((name, idx) => ({
        project_id: project.id,
        phase_number: idx + 1,
        name: name.trim(),
        status: "not_started" as const,
      }))
    if (phaseRows.length > 0) {
      await supabase.from("phases").insert(phaseRows)
    }
  }

  await logActivity(supabase, {
    entity_type: "project",
    entity_id: project.id,
    deal_id: dealId,
    project_id: project.id,
    action: "project_created",
    actor: actorId ?? null,
    metadata: { name: project.name, priority: project.priority },
  })

  return project
}

export async function addPhase(
  supabase: SupabaseClient,
  projectId: string,
  name: string
): Promise<{ id: string; phase_number: number; name: string }> {
  const { data: existing } = await supabase
    .from("phases")
    .select("phase_number")
    .eq("project_id", projectId)
    .order("phase_number", { ascending: false })
    .limit(1)

  const nextNumber = (existing?.[0]?.phase_number ?? 0) + 1

  const { data, error } = await supabase
    .from("phases")
    .insert({ project_id: projectId, phase_number: nextNumber, name, status: "not_started" })
    .select("id, phase_number, name")
    .single()
  if (error) throw error
  return data
}

export async function deletePhase(
  supabase: SupabaseClient,
  phaseId: string
): Promise<void> {
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("phase_id", phaseId)
    .limit(1)

  if (tasks && tasks.length > 0) {
    throw new Error("Cannot delete a stage that has tasks. Remove all tasks first.")
  }

  const { error } = await supabase.from("phases").delete().eq("id", phaseId)
  if (error) throw error
}

export async function updateProject(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<ProjectFormData & { status: string }>,
  actorId?: string
): Promise<Project> {
  const { data, error } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error

  const action = updates.status ? "project_status_changed" : "project_updated"
  await logActivity(supabase, {
    entity_type: "project",
    entity_id: id,
    deal_id: data.deal_id,
    project_id: id,
    action,
    actor: actorId ?? null,
    metadata: updates.status
      ? { new_status: updates.status, name: data.name }
      : { name: updates.name ?? data.name },
  })

  return data
}
