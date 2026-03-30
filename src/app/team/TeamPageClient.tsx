'use client'

import { useState } from 'react'
import { Plus, Mail, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { createTeamMember, updateTeamMember, deleteTeamMember } from '@/lib/queries/team'
import { getInitials, getUserRoleLabel } from '@/lib/utils'
import type { TeamMember } from '@/types'

const ROLES = [
  { value: 'csm_lead', label: 'CSM Lead' },
  { value: 'csm_manager', label: 'CSM Manager' },
  { value: 'solutions_engineer', label: 'Solutions Engineer' },
  { value: 'account_executive', label: 'Account Executive' },
  { value: 'admin', label: 'Admin' },
]

const ROLE_COLORS: Record<string, string> = {
  csm_manager: 'bg-purple-100 text-purple-700',
  csm_lead: 'bg-blue-100 text-blue-700',
  solutions_engineer: 'bg-green-100 text-green-700',
  account_executive: 'bg-yellow-100 text-yellow-700',
  admin: 'bg-slate-100 text-slate-700',
}

// ── Add / Edit dialog ──────────────────────────────────────────────────────────

interface MemberDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  member?: TeamMember          // undefined = add mode
  onSuccess: () => void
}

function MemberDialog({ open, onOpenChange, member, onSuccess }: MemberDialogProps) {
  const isEdit = !!member
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(member?.name ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [role, setRole] = useState(member?.role ?? 'csm_lead')

  // Reset fields when dialog opens
  function handleOpenChange(v: boolean) {
    if (v) {
      setName(member?.name ?? '')
      setEmail(member?.email ?? '')
      setRole(member?.role ?? 'csm_lead')
    }
    onOpenChange(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setLoading(true)
    try {
      const supabase = createClient()
      if (isEdit && member) {
        await updateTeamMember(supabase, member.id, { name: name.trim(), email: email.trim(), role })
        toast.success('Member updated')
      } else {
        await createTeamMember(supabase, { name: name.trim(), email: email.trim(), role })
        toast.success('Team member added')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to save member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Member' : 'Add Team Member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Mehta" required />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="priya@fibr.ai" required />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? 'csm_lead')}>
              <SelectTrigger>
                <SelectValue>
                  {(v: string) => ROLES.find(r => r.value === v)?.label ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirmation dialog ─────────────────────────────────────────────────

interface DeleteDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  member: TeamMember | null
  onSuccess: () => void
}

function DeleteDialog({ open, onOpenChange, member, onSuccess }: DeleteDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!member) return
    setLoading(true)
    try {
      const supabase = createClient()
      await deleteTeamMember(supabase, member.id)
      toast.success(`${member.name} removed`)
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove Team Member</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500 mt-1">
          Are you sure you want to remove <span className="font-semibold text-slate-700">{member?.name}</span>?
          This cannot be undone.
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={handleDelete}
          >
            {loading ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Add button (used in page header) ──────────────────────────────────────────

export function AddButton() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <Plus className="h-4 w-4 mr-1.5" />
        Add Member
      </Button>
      <MemberDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}

// ── Main client component ──────────────────────────────────────────────────────

interface TeamPageClientProps {
  members: TeamMember[]
}

function TeamPageClientInner({ members }: TeamPageClientProps) {
  const router = useRouter()
  const [editMember, setEditMember] = useState<TeamMember | null>(null)
  const [deleteMember, setDeleteMember] = useState<TeamMember | null>(null)

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Plus className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">No team members yet</p>
        <p className="text-sm text-slate-400 mt-1">Add your first team member to get started.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((member) => (
          <div key={member.id} className="group bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 relative">
            {/* Action buttons */}
            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditMember(member)}
                className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Edit member"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDeleteMember(member)}
                className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Remove member"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-blue-600 text-white text-sm font-semibold">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{member.name}</p>
                <Badge variant="outline" className={`text-xs border-0 mt-0.5 ${ROLE_COLORS[member.role] ?? 'bg-slate-100 text-slate-600'}`}>
                  {getUserRoleLabel(member.role)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{member.email}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Edit dialog */}
      <MemberDialog
        open={!!editMember}
        onOpenChange={(v) => { if (!v) setEditMember(null) }}
        member={editMember ?? undefined}
        onSuccess={() => router.refresh()}
      />

      {/* Delete dialog */}
      <DeleteDialog
        open={!!deleteMember}
        onOpenChange={(v) => { if (!v) setDeleteMember(null) }}
        member={deleteMember}
        onSuccess={() => router.refresh()}
      />
    </>
  )
}

export const TeamPageClient = TeamPageClientInner
