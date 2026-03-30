import type { SupabaseClient } from "@supabase/supabase-js"
import type { Deal, DealWithRelations, DealFormData, OnboardingTask } from "@/types"
import { logActivity } from "./log"

export async function getDeals(supabase: SupabaseClient): Promise<DealWithRelations[]> {
  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      csm:team_members!deals_csm_owner_fkey(id, name, email, role),
      ae:team_members!deals_ae_owner_fkey(id, name, email),
      projects(id, name, status, priority),
      onboarding_tasks(id, completed_at)
    `)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []).map((d) => ({
    ...d,
    _project_count: d.projects?.length ?? 0,
  }))
}

export async function getDealById(
  supabase: SupabaseClient,
  id: string
): Promise<DealWithRelations | null> {
  const { data, error } = await supabase
    .from("deals")
    .select(`
      *,
      csm:team_members!deals_csm_owner_fkey(id, name, email, role),
      ae:team_members!deals_ae_owner_fkey(id, name, email),
      projects(
        id, name, description, priority, status, csm_owner,
        created_at, target_completion_date, deal_id, updated_at,
        csm:team_members(id, name),
        phases(id, status, phase_number, started_at)
      ),
      onboarding_tasks(
        id, deal_id, task_number, title, owner_role, evidence_type,
        completed_by, completed_at, evidence_notes, created_at,
        completed_by_member:team_members(id, name)
      )
    `)
    .eq("id", id)
    .single()
  if (error) return null
  return data
}

export async function createDeal(
  supabase: SupabaseClient,
  data: DealFormData,
  actorId?: string
): Promise<Deal> {
  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      client_name: data.client_name,
      csm_owner: data.csm_owner || null,
      ae_owner: data.ae_owner || null,
      deal_value: data.deal_value ?? null,
      start_date: data.start_date || null,
      notes: data.notes || null,
    })
    .select()
    .single()
  if (error) throw error

  // Remove any onboarding tasks auto-created by a DB trigger — user adds them manually
  await supabase.from("onboarding_tasks").delete().eq("deal_id", deal.id)

  await logActivity(supabase, {
    entity_type: "deal",
    entity_id: deal.id,
    deal_id: deal.id,
    action: "deal_created",
    actor: actorId ?? null,
    metadata: {
      client_name: deal.client_name,
      csm_owner: deal.csm_owner,
      deal_value: deal.deal_value,
    },
  })

  return deal
}

export async function updateDeal(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<DealFormData & { status: string }>,
  actorId?: string
): Promise<Deal> {
  const { data, error } = await supabase
    .from("deals")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error

  const action = updates.status ? "deal_status_changed" : "deal_updated"
  await logActivity(supabase, {
    entity_type: "deal",
    entity_id: id,
    deal_id: id,
    action,
    actor: actorId ?? null,
    metadata: updates.status
      ? { new_status: updates.status }
      : { client_name: updates.client_name },
  })

  return data
}

export async function getOnboardingTasks(
  supabase: SupabaseClient,
  dealId: string
): Promise<OnboardingTask[]> {
  const { data, error } = await supabase
    .from("onboarding_tasks")
    .select(`
      *,
      completed_by_member:team_members(id, name)
    `)
    .eq("deal_id", dealId)
    .order("task_number")
  if (error) throw error
  return data ?? []
}

export async function addOnboardingTask(
  supabase: SupabaseClient,
  dealId: string,
  title: string
): Promise<OnboardingTask> {
  // Get max task_number for this deal
  const { data: existing } = await supabase
    .from("onboarding_tasks")
    .select("task_number")
    .eq("deal_id", dealId)
    .order("task_number", { ascending: false })
    .limit(1)

  const nextNumber = (existing?.[0]?.task_number ?? 0) + 1

  const { data, error } = await supabase
    .from("onboarding_tasks")
    .insert({
      deal_id: dealId,
      task_number: nextNumber,
      title,
      owner_role: "CSM",
      evidence_type: "Manual",
    })
    .select(`*, completed_by_member:team_members(id, name)`)
    .single()
  if (error) throw error
  return data
}

export async function deleteOnboardingTask(
  supabase: SupabaseClient,
  taskId: string
): Promise<void> {
  const { error } = await supabase
    .from("onboarding_tasks")
    .delete()
    .eq("id", taskId)
  if (error) throw error
}

export async function updateOnboardingTask(
  supabase: SupabaseClient,
  id: string,
  updates: {
    completed_at?: string | null
    completed_by?: string | null
    evidence_notes?: string | null
  },
  actorId?: string
): Promise<OnboardingTask> {
  const { data, error } = await supabase
    .from("onboarding_tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error

  const isCompleting = updates.completed_at !== undefined
  if (isCompleting) {
    const action = updates.completed_at ? "onboarding_task_completed" : "onboarding_task_reopened"
    await logActivity(supabase, {
      entity_type: "onboarding_task",
      entity_id: id,
      deal_id: data.deal_id,
      action,
      actor: actorId ?? null,
      metadata: { title: data.title, task_number: data.task_number },
    })
  }

  return data
}
