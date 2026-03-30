// ============================================================
// CSM Deal Tracker — TypeScript Types
// Mirrors the Supabase database schema exactly
// ============================================================

export type DealStatus = 'active' | 'on_hold' | 'churned' | 'closed_won'
export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'cancelled'
export type PhaseStatus = 'not_started' | 'in_progress' | 'blocked' | 'skipped' | 'completed'
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked' | 'na'
export type BlockerStatus = 'open' | 'in_resolution' | 'escalated' | 'resolved'
export type BlockerCategory = 'client' | 'internal' | 'technical' | 'commercial' | 'other'
export type UserRole = 'csm_lead' | 'csm_manager' | 'solutions_engineer' | 'account_executive' | 'admin'
export type PriorityLevel = 'high' | 'medium' | 'low'
export type TemplateType = 'project' | 'phase'
export type TemplateScope = 'personal' | 'shared'

// ── Team Members ────────────────────────────────────────────

export interface TeamMember {
  id: string
  name: string
  email: string
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// ── Deals ───────────────────────────────────────────────────

export interface Deal {
  id: string
  client_name: string
  csm_owner: string | null
  ae_owner: string | null
  deal_value: number | null
  start_date: string | null
  status: DealStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DealWithRelations extends Deal {
  csm: Pick<TeamMember, 'id' | 'name' | 'email' | 'role'> | null
  ae: Pick<TeamMember, 'id' | 'name' | 'email'> | null
  projects: ProjectSummary[]
  onboarding_tasks: OnboardingTask[]
  _project_count?: number
  _open_blocker_count?: number
}

// ── Onboarding Tasks ────────────────────────────────────────

export interface OnboardingTask {
  id: string
  deal_id: string
  task_number: number
  title: string
  owner_role: string
  evidence_type: string
  completed_by: string | null
  completed_at: string | null
  evidence_notes: string | null
  blocker_id: string | null
  started_at: string | null
  due_date: string | null
  priority: PriorityLevel
  created_at: string
  completed_by_member?: Pick<TeamMember, 'id' | 'name'> | null
  linked_blocker?: BlockerSummary | null
}

// ── Projects ────────────────────────────────────────────────

export interface Project {
  id: string
  deal_id: string
  name: string
  description: string | null
  priority: PriorityLevel
  csm_owner: string | null
  status: ProjectStatus
  created_at: string
  target_completion_date: string | null
  updated_at: string
}

export interface ProjectSummary extends Project {
  csm: Pick<TeamMember, 'id' | 'name'> | null
  current_phase?: PhaseSummary | null
  _open_task_count?: number
  _blocker_count?: number
  _task_progress?: number | null   // % of tasks done (null = no tasks yet)
  _total_tasks?: number
}

export interface ProjectWithPhases extends Project {
  csm: Pick<TeamMember, 'id' | 'name' | 'email'> | null
  phases: PhaseWithTasks[]
  deal: Pick<Deal, 'id' | 'client_name'> | null
}

// ── Phases ──────────────────────────────────────────────────

export interface Phase {
  id: string
  project_id: string
  phase_number: number
  name: string
  description: string | null
  status: PhaseStatus
  started_at: string | null
  completed_at: string | null
  skipped_at: string | null
  skip_reason: string | null
  skipped_by: string | null
  created_at: string
  updated_at: string
}

export interface PhaseSummary extends Phase {
  _task_count?: number
  _open_task_count?: number
  _blocker_count?: number
}

export interface PhaseWithTasks extends Phase {
  tasks: TaskWithDetails[]
  blockers: BlockerSummary[]
  skipped_by_member?: Pick<TeamMember, 'id' | 'name'> | null
}

// ── Tasks ───────────────────────────────────────────────────

export interface Task {
  id: string
  phase_id: string
  title: string
  description: string | null
  assignee: string | null
  priority: PriorityLevel
  due_date: string | null
  started_at: string | null
  completed_at: string | null
  status: TaskStatus
  na_reason: string | null
  blocker_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TaskWithDetails extends Task {
  assignee_member?: Pick<TeamMember, 'id' | 'name' | 'avatar_url'> | null
  linked_blocker?: BlockerSummary | null
}

// ── Blockers ────────────────────────────────────────────────

export interface Blocker {
  id: string
  phase_id: string | null
  task_id: string | null
  title: string
  description: string | null
  category: BlockerCategory
  raised_by: string | null
  raised_at: string
  owner: string | null
  target_resolution_date: string | null
  resolved_at: string | null
  resolution_notes: string | null
  status: BlockerStatus
  escalation_note: string | null
  created_at: string
  updated_at: string
}

export interface BlockerSummary extends Blocker {
  raised_by_member?: Pick<TeamMember, 'id' | 'name'> | null
  owner_member?: Pick<TeamMember, 'id' | 'name'> | null
  phase?: Pick<Phase, 'id' | 'phase_number' | 'name' | 'project_id'> | null
}

export interface BlockerWithDetails extends BlockerSummary {
  task?: Pick<Task, 'id' | 'title'> | null
  project?: Pick<Project, 'id' | 'name' | 'deal_id'> | null
  deal?: Pick<Deal, 'id' | 'client_name'> | null
}

// ── Templates ───────────────────────────────────────────────

export interface Template {
  id: string
  name: string
  type: TemplateType
  scope: TemplateScope
  phase_target: number | null
  created_by: string | null
  created_at: string
  updated_at: string
  pinned: boolean
  archived: boolean
}

export interface TemplateTask {
  id: string
  template_id: string
  phase_number: number
  title: string
  description: string | null
  priority: PriorityLevel
  sort_order: number
}

export interface TemplateWithTasks extends Template {
  template_tasks: TemplateTask[]
  created_by_member?: Pick<TeamMember, 'id' | 'name'> | null
}

// ── Activity Log ────────────────────────────────────────────

export interface ActivityLog {
  id: string
  entity_type: string
  entity_id: string
  deal_id: string | null
  project_id: string | null
  action: string
  actor: string | null
  timestamp: string
  metadata: Record<string, unknown>
}

export interface ActivityLogWithActor extends ActivityLog {
  actor_member?: Pick<TeamMember, 'id' | 'name' | 'role'> | null
}

// ── Dashboard Stats ─────────────────────────────────────────

export interface DashboardStats {
  active_deals: number
  active_projects: number
  open_blockers: number
  escalated_blockers: number
  overdue_tasks: number
  team_member_count: number
  tasks_per_member: {
    id: string
    name: string
    role: UserRole
    open_tasks: number
    overdue_tasks: number
  }[]
}

// ── Form Input Types ─────────────────────────────────────────

export interface DealFormData {
  client_name: string
  csm_owner: string
  ae_owner?: string
  deal_value?: number
  start_date?: string
  notes?: string
}

export interface ProjectFormData {
  name: string
  description?: string
  priority: PriorityLevel
  csm_owner: string
  target_completion_date?: string
  template_id?: string
}

export interface TaskFormData {
  title: string
  assignee?: string
  priority: PriorityLevel
  start_date: string        // mandatory — maps to tasks.started_at
  due_date?: string
  description?: string
  blocker_id?: string
}

export interface BlockerFormData {
  title: string
  description?: string
  category: BlockerCategory
  owner?: string
  target_resolution_date?: string
  phase_id?: string
  task_id?: string
}

export interface TemplateFormData {
  name: string
  type: TemplateType
  scope: TemplateScope
  phase_target?: number
}

// ── Export Scope ─────────────────────────────────────────────

export type ExportScope = 'deal' | 'project' | 'all'
