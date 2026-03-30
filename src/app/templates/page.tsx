import { createClient } from '@/lib/supabase/server'
import { getTemplates } from '@/lib/queries/templates'
import { getTeamMembers } from '@/lib/queries/team'
import { TemplatesPageClient } from './TemplatesPageClient'

export const metadata = {
  title: 'Templates — CSM Tracker',
}

export default async function TemplatesPage() {
  const supabase = await createClient()
  const [templates, teamMembers] = await Promise.all([
    getTemplates(supabase),
    getTeamMembers(supabase),
  ])

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <TemplatesPageClient templates={templates} teamMembers={teamMembers} />
    </div>
  )
}
