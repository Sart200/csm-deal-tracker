"use client"
import * as XLSX from "xlsx"
import type { DealWithRelations } from "@/types"
import { formatDate, getOnboardingProgress, getPhaseName } from "./utils"

export function exportDealToXlsx(deal: DealWithRelations): void {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Deal Summary ─────────────────────────────────
  const dealRows = [
    ["Field", "Value"],
    ["Client Name", deal.client_name],
    ["CSM Owner", deal.csm?.name ?? "—"],
    ["AE Owner", deal.ae?.name ?? "—"],
    ["Deal Value", deal.deal_value ? `$${deal.deal_value.toLocaleString()}` : "—"],
    ["Start Date", formatDate(deal.start_date)],
    ["Status", deal.status],
    ["Onboarding Progress", `${getOnboardingProgress(deal.onboarding_tasks ?? [])}%`],
    ["Total Projects", deal.projects?.length ?? 0],
    ["Notes", deal.notes ?? ""],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(dealRows)
  XLSX.utils.book_append_sheet(wb, ws1, "Deal Summary")

  // ── Sheet 2: Projects ─────────────────────────────────────
  const projectHeaders = [
    "Project Name", "Status", "Priority", "CSM Owner", "Current Phase",
    "Created", "Target Completion",
  ]
  const projectRows = (deal.projects ?? []).map((p) => {
    const currentPhase = (p as { phases?: { status: string; phase_number: number }[] }).phases
      ?.find((ph) => ph.status === "in_progress")
    return [
      p.name,
      p.status,
      p.priority,
      (p as { csm?: { name: string } }).csm?.name ?? "—",
      currentPhase ? `P${currentPhase.phase_number} — ${getPhaseName(currentPhase.phase_number)}` : "—",
      formatDate(p.created_at),
      formatDate(p.target_completion_date),
    ]
  })
  const ws2 = XLSX.utils.aoa_to_sheet([projectHeaders, ...projectRows])
  XLSX.utils.book_append_sheet(wb, ws2, "Projects")

  // ── Sheet 3: Onboarding Tasks ─────────────────────────────
  const onboardingHeaders = [
    "#", "Task", "Owner Role", "Evidence Type", "Completed By", "Completed At", "Notes"
  ]
  const onboardingRows = (deal.onboarding_tasks ?? []).map((t) => [
    t.task_number,
    t.title,
    t.owner_role,
    t.evidence_type,
    (t as { completed_by_member?: { name: string } | null }).completed_by_member?.name ?? "—",
    formatDate(t.completed_at),
    t.evidence_notes ?? "",
  ])
  const ws3 = XLSX.utils.aoa_to_sheet([onboardingHeaders, ...onboardingRows])
  XLSX.utils.book_append_sheet(wb, ws3, "Onboarding")

  XLSX.writeFile(wb, `${deal.client_name.replace(/\s+/g, "_")}_deal_export.xlsx`)
}

export function exportProjectToXlsx(project: {
  id: string
  name: string
  phases: Array<{
    phase_number: number
    name: string
    status: string
    started_at: string | null
    completed_at: string | null
    skipped_at: string | null
    skip_reason: string | null
    tasks: Array<{
      title: string
      status: string
      priority: string
      due_date: string | null
      completed_at: string | null
      assignee_member?: { name: string } | null
    }>
    blockers: Array<{
      title: string
      category: string
      status: string
      raised_at: string
      resolved_at: string | null
      resolution_notes: string | null
    }>
  }>
}): void {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1: Phase Timeline ───────────────────────────────
  const phaseHeaders = [
    "Phase #", "Phase Name", "Status", "Started", "Completed/Skipped", "Duration (days)", "Skip Reason"
  ]
  const phaseRows = project.phases.map((ph) => {
    let duration = "—"
    if (ph.started_at && ph.completed_at) {
      const days = Math.round(
        (new Date(ph.completed_at).getTime() - new Date(ph.started_at).getTime()) /
        (1000 * 60 * 60 * 24)
      )
      duration = `${days}d`
    }
    return [
      `P${ph.phase_number}`,
      ph.name,
      ph.status,
      formatDate(ph.started_at),
      formatDate(ph.completed_at ?? ph.skipped_at),
      duration,
      ph.skip_reason ?? "",
    ]
  })
  const ws1 = XLSX.utils.aoa_to_sheet([phaseHeaders, ...phaseRows])
  XLSX.utils.book_append_sheet(wb, ws1, "Phase Timeline")

  // ── Sheet 2: Tasks ────────────────────────────────────────
  const taskHeaders = [
    "Phase", "Task Title", "Assignee", "Priority", "Status", "Due Date", "Completed At"
  ]
  const taskRows = project.phases.flatMap((ph) =>
    ph.tasks.map((t) => [
      `P${ph.phase_number} — ${ph.name}`,
      t.title,
      t.assignee_member?.name ?? "—",
      t.priority,
      t.status,
      formatDate(t.due_date),
      formatDate(t.completed_at),
    ])
  )
  const ws2 = XLSX.utils.aoa_to_sheet([taskHeaders, ...taskRows])
  XLSX.utils.book_append_sheet(wb, ws2, "Tasks")

  // ── Sheet 3: Blockers ─────────────────────────────────────
  const blockerHeaders = [
    "Phase", "Blocker Title", "Category", "Status", "Raised", "Resolved", "Resolution Notes"
  ]
  const blockerRows = project.phases.flatMap((ph) =>
    ph.blockers.map((b) => [
      `P${ph.phase_number} — ${ph.name}`,
      b.title,
      b.category,
      b.status,
      formatDate(b.raised_at),
      formatDate(b.resolved_at),
      b.resolution_notes ?? "",
    ])
  )
  const ws3 = XLSX.utils.aoa_to_sheet([blockerHeaders, ...blockerRows])
  XLSX.utils.book_append_sheet(wb, ws3, "Blockers")

  XLSX.writeFile(wb, `${project.name.replace(/\s+/g, "_")}_project_export.xlsx`)
}
