import type { SupabaseClient } from "@supabase/supabase-js"
import type { Template, TemplateWithTasks } from "@/types"

export async function getTemplates(
  supabase: SupabaseClient,
  createdBy?: string
): Promise<TemplateWithTasks[]> {
  let query = supabase
    .from("templates")
    .select(`
      *,
      template_tasks(*),
      created_by_member:team_members(id, name)
    `)
    .eq("archived", false)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })

  // Return personal templates for user + all shared templates
  if (createdBy) {
    query = query.or(`scope.eq.shared,created_by.eq.${createdBy}`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getTemplateById(
  supabase: SupabaseClient,
  id: string
): Promise<TemplateWithTasks | null> {
  const { data, error } = await supabase
    .from("templates")
    .select(`
      *,
      template_tasks(*),
      created_by_member:team_members(id, name)
    `)
    .eq("id", id)
    .single()
  if (error) return null
  return data
}

export async function createTemplate(
  supabase: SupabaseClient,
  template: {
    name: string
    type: string
    scope: string
    phase_target?: number | null
    created_by?: string
  },
  tasks: Array<{
    phase_number: number
    title: string
    description?: string
    priority?: string
    sort_order?: number
  }>
): Promise<TemplateWithTasks> {
  const { data: tmpl, error } = await supabase
    .from("templates")
    .insert(template)
    .select()
    .single()
  if (error) throw error

  if (tasks.length > 0) {
    await supabase.from("template_tasks").insert(
      tasks.map((t, i) => ({
        template_id: tmpl.id,
        phase_number: t.phase_number,
        title: t.title,
        description: t.description || null,
        priority: t.priority || "medium",
        sort_order: t.sort_order ?? i,
      }))
    )
  }

  return { ...tmpl, template_tasks: [], created_by_member: null }
}

export async function applyTemplateToProject(
  supabase: SupabaseClient,
  templateId: string,
  projectId: string,
  actorId?: string
): Promise<void> {
  const template = await getTemplateById(supabase, templateId)
  if (!template) throw new Error("Template not found")

  // Get phases for this project
  const { data: phases } = await supabase
    .from("phases")
    .select("id, phase_number")
    .eq("project_id", projectId)

  if (!phases) return

  const phaseMap = Object.fromEntries(phases.map((p) => [p.phase_number, p.id]))

  const tasksToInsert = template.template_tasks
    .filter((tt) => phaseMap[tt.phase_number])
    .map((tt) => ({
      phase_id: phaseMap[tt.phase_number],
      title: tt.title,
      description: tt.description || null,
      priority: tt.priority || "medium",
      sort_order: tt.sort_order,
    }))

  if (tasksToInsert.length > 0) {
    await supabase.from("tasks").insert(tasksToInsert)
  }

  if (actorId) {
    await supabase.from("activity_log").insert({
      entity_type: "template",
      entity_id: templateId,
      project_id: projectId,
      action: "template_applied",
      actor: actorId,
      metadata: { template_name: template.name, template_type: template.type },
    })
  }
}

export async function applyTemplateToPhase(
  supabase: SupabaseClient,
  templateId: string,
  phaseId: string,
  actorId?: string
): Promise<void> {
  const template = await getTemplateById(supabase, templateId)
  if (!template) throw new Error("Template not found")

  const { data: phase } = await supabase
    .from("phases")
    .select("id, phase_number, project_id")
    .eq("id", phaseId)
    .single()

  if (!phase) throw new Error("Phase not found")

  const tasksToInsert = template.template_tasks.map((tt) => ({
    phase_id: phaseId,
    title: tt.title,
    description: tt.description || null,
    priority: tt.priority || "medium",
    sort_order: tt.sort_order,
  }))

  if (tasksToInsert.length > 0) {
    await supabase.from("tasks").insert(tasksToInsert)
  }

  if (actorId) {
    await supabase.from("activity_log").insert({
      entity_type: "template",
      entity_id: templateId,
      project_id: phase.project_id,
      action: "template_applied_to_phase",
      actor: actorId,
      metadata: { template_name: template.name, phase_number: phase.phase_number },
    })
  }
}

export async function toggleTemplatePinned(
  supabase: SupabaseClient,
  id: string,
  pinned: boolean
): Promise<void> {
  const { error } = await supabase
    .from("templates")
    .update({ pinned })
    .eq("id", id)
  if (error) throw error
}

export async function archiveTemplate(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("templates")
    .update({ archived: true })
    .eq("id", id)
  if (error) throw error
}
