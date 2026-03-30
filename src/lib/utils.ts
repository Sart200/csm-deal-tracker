import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, differenceInDays, format, parseISO, isValid } from "date-fns"
import type {
  DealStatus, ProjectStatus, PhaseStatus, TaskStatus,
  BlockerStatus, BlockerCategory, PriorityLevel, UserRole
} from "@/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date helpers ─────────────────────────────────────────────

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—"
  const d = parseISO(date)
  if (!isValid(d)) return "—"
  return format(d, "dd MMM yyyy")
}

export function formatDateShort(date: string | null | undefined): string {
  if (!date) return "—"
  const d = parseISO(date)
  if (!isValid(d)) return "—"
  return format(d, "d MMM")
}

export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return "—"
  const d = parseISO(date)
  if (!isValid(d)) return "—"
  return formatDistanceToNow(d, { addSuffix: true })
}

export function getDaysOpen(date: string | null | undefined): number {
  if (!date) return 0
  const d = parseISO(date)
  if (!isValid(d)) return 0
  return Math.max(0, differenceInDays(new Date(), d))
}

export function getDaysOverdue(dueDate: string | null | undefined): number {
  if (!dueDate) return 0
  const d = parseISO(dueDate)
  if (!isValid(d)) return 0
  const days = differenceInDays(new Date(), d)
  return Math.max(0, days)
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  const d = parseISO(dueDate)
  if (!isValid(d)) return false
  return d < new Date()
}

export function getTimeInPhase(startedAt: string | null | undefined): string {
  if (!startedAt) return "Not started"
  const d = parseISO(startedAt)
  if (!isValid(d)) return "—"
  const days = differenceInDays(new Date(), d)
  if (days === 0) return "Today"
  if (days === 1) return "1 day"
  return `${days} days`
}

export function getProjectTimeline(createdAt: string | null | undefined): string {
  if (!createdAt) return "—"
  const d = parseISO(createdAt)
  if (!isValid(d)) return "—"
  const days = differenceInDays(new Date(), d)
  if (days === 0) return "Day 1"
  return `Day ${days + 1}`
}

export function getDaysBetween(
  from: string | null | undefined,
  to: string | null | undefined
): number | null {
  if (!from || !to) return null
  const a = parseISO(from)
  const b = parseISO(to)
  if (!isValid(a) || !isValid(b)) return null
  return Math.max(0, differenceInDays(b, a))
}

// ── Initials helper ──────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

// ── Status labels ────────────────────────────────────────────

export function getDealStatusLabel(status: DealStatus): string {
  const labels: Record<DealStatus, string> = {
    active: "Active", on_hold: "On Hold", churned: "Churned", closed_won: "Closed Won",
  }
  return labels[status]
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    active: "Active", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled",
  }
  return labels[status]
}

export function getPhaseStatusLabel(status: PhaseStatus): string {
  const labels: Record<PhaseStatus, string> = {
    not_started: "Not Started", in_progress: "In Progress",
    blocked: "Blocked", skipped: "Skipped", completed: "Completed",
  }
  return labels[status]
}

export function getTaskStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    todo: "To Do", in_progress: "In Progress",
    done: "Done", blocked: "Blocked", na: "N/A",
  }
  return labels[status]
}

export function getBlockerStatusLabel(status: BlockerStatus): string {
  const labels: Record<BlockerStatus, string> = {
    open: "Open", in_resolution: "In Resolution", escalated: "Escalated", resolved: "Resolved",
  }
  return labels[status]
}

export function getBlockerCategoryLabel(cat: BlockerCategory): string {
  const labels: Record<BlockerCategory, string> = {
    client: "Client", internal: "Internal", technical: "Technical",
    commercial: "Commercial", other: "Other",
  }
  return labels[cat]
}

export function getPriorityLabel(priority: PriorityLevel): string {
  const labels: Record<PriorityLevel, string> = {
    high: "High", medium: "Medium", low: "Low",
  }
  return labels[priority]
}

export function getUserRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    csm_lead: "CSM Lead", csm_manager: "CSM Manager",
    solutions_engineer: "Solutions Engineer",
    account_executive: "Account Executive", admin: "Admin",
  }
  return labels[role]
}

// ── Status colour classes ─────────────────────────────────────

export function getDealStatusClasses(status: DealStatus): string {
  const map: Record<DealStatus, string> = {
    active: "bg-green-100 text-green-800",
    on_hold: "bg-yellow-100 text-yellow-800",
    churned: "bg-red-100 text-red-800",
    closed_won: "bg-blue-100 text-blue-800",
  }
  return map[status]
}

export function getProjectStatusClasses(status: ProjectStatus): string {
  const map: Record<ProjectStatus, string> = {
    active: "bg-green-100 text-green-800",
    on_hold: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800",
    cancelled: "bg-slate-100 text-slate-600",
  }
  return map[status]
}

export function getPhaseStatusClasses(status: PhaseStatus): string {
  const map: Record<PhaseStatus, string> = {
    not_started: "bg-slate-100 text-slate-600",
    in_progress: "bg-blue-100 text-blue-700",
    blocked: "bg-orange-100 text-orange-700",
    skipped: "bg-slate-100 text-slate-500",
    completed: "bg-green-100 text-green-700",
  }
  return map[status]
}

export function getTaskStatusClasses(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    todo: "bg-slate-100 text-slate-600",
    in_progress: "bg-blue-100 text-blue-700",
    done: "bg-green-100 text-green-700",
    blocked: "bg-orange-100 text-orange-700",
    na: "bg-slate-100 text-slate-400",
  }
  return map[status]
}

export function getBlockerStatusClasses(status: BlockerStatus): string {
  const map: Record<BlockerStatus, string> = {
    open: "bg-orange-100 text-orange-700",
    in_resolution: "bg-yellow-100 text-yellow-700",
    escalated: "bg-red-100 text-red-700",
    resolved: "bg-green-100 text-green-700",
  }
  return map[status]
}

export function getBlockerCategoryClasses(cat: BlockerCategory): string {
  const map: Record<BlockerCategory, string> = {
    client: "bg-purple-100 text-purple-700",
    internal: "bg-blue-100 text-blue-700",
    technical: "bg-slate-100 text-slate-700",
    commercial: "bg-yellow-100 text-yellow-700",
    other: "bg-slate-100 text-slate-600",
  }
  return map[cat]
}

export function getPriorityClasses(priority: PriorityLevel): {
  border: string
  badge: string
} {
  const map: Record<PriorityLevel, { border: string; badge: string }> = {
    high: { border: "border-l-red-500", badge: "bg-red-100 text-red-700" },
    medium: { border: "border-l-yellow-400", badge: "bg-yellow-100 text-yellow-700" },
    low: { border: "border-l-slate-300", badge: "bg-slate-100 text-slate-500" },
  }
  return map[priority]
}

// ── Onboarding completion ────────────────────────────────────

export function getOnboardingProgress(tasks: { completed_at: string | null }[]): number {
  if (tasks.length === 0) return 0
  const completed = tasks.filter((t) => t.completed_at !== null).length
  return Math.round((completed / tasks.length) * 100)
}

// ── Phase number labels ───────────────────────────────────────

export const PHASE_NAMES = [
  "", // index 0 unused
  "Requirement Gathering",
  "Scoping & Solutioning",
  "Campaign Setup",
  "Campaign Review",
  "Campaign Live",
  "Campaign Performance",
]

export function getPhaseName(num: number): string {
  return PHASE_NAMES[num] ?? `Phase ${num}`
}
