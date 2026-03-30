import type { SupabaseClient } from "@supabase/supabase-js"
import type { TeamMember } from "@/types"

export async function getTeamMembers(supabase: SupabaseClient): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("name")
  if (error) throw error
  return data ?? []
}

export async function getTeamMemberById(
  supabase: SupabaseClient,
  id: string
): Promise<TeamMember | null> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return null
  return data
}

export async function createTeamMember(
  supabase: SupabaseClient,
  data: { name: string; email: string; role: string }
): Promise<TeamMember> {
  const { data: member, error } = await supabase
    .from("team_members")
    .insert(data)
    .select()
    .single()
  if (error) throw error
  return member
}

export async function deleteTeamMember(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("team_members").delete().eq("id", id)
  if (error) throw error
}

export async function updateTeamMember(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<Pick<TeamMember, "name" | "email" | "role" | "avatar_url">>
): Promise<TeamMember> {
  const { data, error } = await supabase
    .from("team_members")
    .update(updates)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}
