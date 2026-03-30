import type { SupabaseClient } from "@supabase/supabase-js"
import type { Task, TaskWithDetails, TaskFormData } from "@/types"
import { logActivity } from "./log"

async function getPhaseProjectId(supabase: SupabaseClient, phaseId: string): Promise<string | null> {
  const { data } = await supabase.from("phases").select("project_id").eq("id", phaseId).single()
  return data?.project_id ?? null
}

export async function createTask(
  supabase: SupabaseClient,
  phaseId: string,
  data: TaskFormData,
  actorId?: string
): Promise<Task> {
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      phase_id: phaseId,
      title: data.title,
      assignee: data.assignee || null,
      priority: data.priority,
      due_date: data.due_date || null,
      description: data.description || null,
      blocker_id: data.blocker_id || null,
    })
    .select()
    .single()
  if (error) throw error

  const projectId = await getPhaseProjectId(supabase, phaseId)
  await logActivity(supabase, {
    entity_type: "task",
    entity_id: task.id,
    project_id: projectId,
    action: "task_created",
    actor: actorId ?? null,
    metadata: { title: task.title, priority: task.priority },
  })

  return task
}

export async function updateTask(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<TaskFormData & {
    status: string
    na_reason: string | null
    started_at: string | null
    completed_at: string | null
    sort_order: number
    phase_id: string
  }>,
  actorId?: string
): Promise<Task> {
  const { data: task, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error

  const projectId = await getPhaseProjectId(supabase, task.phase_id)

  if (updates.status) {
    const action =
      updates.status === "done" ? "task_completed" :
      updates.status === "todo" ? "task_reopened" :
      "task_status_changed"

    await logActivity(supabase, {
      entity_type: "task",
      entity_id: id,
      project_id: projectId,
      action,
      actor: actorId ?? null,
      metadata: { title: task.title, new_status: updates.status },
    })
  } else if (updates.title || updates.assignee !== undefined || updates.priority || updates.due_date !== undefined) {
    await logActivity(supabase, {
      entity_type: "task",
      entity_id: id,
      project_id: projectId,
      action: "task_updated",
      actor: actorId ?? null,
      metadata: { title: task.title },
    })
  }

  return task
}

export async function deleteTask(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id)
  if (error) throw error
}

export async function moveTask(
  supabase: SupabaseClient,
  taskId: string,
  newStatus: string,
  actorId?: string
): Promise<Task> {
  const updates: Record<string, unknown> = { status: newStatus }
  if (newStatus === "in_progress") updates.started_at = new Date().toISOString()
  if (newStatus === "done") updates.completed_at = new Date().toISOString()
  if (newStatus === "todo") { updates.started_at = null; updates.completed_at = null }
  return updateTask(supabase, taskId, updates as never, actorId)
}

export async function getTasksByPhase(
  supabase: SupabaseClient,
  phaseId: string
): Promise<TaskWithDetails[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      assignee_member:team_members(id, name, avatar_url)
    `)
    .eq("phase_id", phaseId)
    .order("sort_order")
    .order("created_at")
  if (error) throw error
  return data ?? []
}

export async function getAllTasksWithFilters(
  supabase: SupabaseClient,
  filters?: {
    status?: string
    assignee?: string
    priority?: string
    dealId?: string
  }
): Promise<
  (TaskWithDetails & {
    phase: { id: string; phase_number: number; name: string; project_id: string } | null
    project: { id: string; name: string; deal_id: string } | null
    deal: { id: string; client_name: string } | null
  })[]
> {
  let query = supabase
    .from("tasks")
    .select(`
      *,
      assignee_member:team_members(id, name, avatar_url),
      phase:phases(id, phase_number, name, project_id,
        project:projects(id, name, deal_id,
          deal:deals(id, client_name)
        )
      )
    `)
    .order("due_date", { ascending: true, nullsFirst: false })

  if (filters?.status) query = query.eq("status", filters.status)
  if (filters?.assignee) query = query.eq("assignee", filters.assignee)
  if (filters?.priority) query = query.eq("priority", filters.priority)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((t) => ({
    ...t,
    phase: t.phase,
    project: (t.phase as { project?: unknown })?.project ?? null,
    deal: ((t.phase as { project?: { deal?: unknown } })?.project as { deal?: unknown })?.deal ?? null,
  })) as never
}
