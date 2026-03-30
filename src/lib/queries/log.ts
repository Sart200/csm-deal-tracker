import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Fire-and-forget activity log insert.
 * Never throws — logging should never break the main operation.
 */
export async function logActivity(
  supabase: SupabaseClient,
  entry: {
    entity_type: string
    entity_id: string
    deal_id?: string | null
    project_id?: string | null
    action: string
    actor?: string | null
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  try {
    await supabase.from("activity_log").insert({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      deal_id: entry.deal_id ?? null,
      project_id: entry.project_id ?? null,
      action: entry.action,
      actor: entry.actor ?? null,
      metadata: entry.metadata ?? {},
    })
  } catch {
    console.warn("[activity] failed to log:", entry.action)
  }
}
