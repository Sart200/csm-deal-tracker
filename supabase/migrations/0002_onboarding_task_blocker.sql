-- Add blocker linkage to onboarding tasks (mirrors tasks.blocker_id pattern)
ALTER TABLE onboarding_tasks
  ADD COLUMN blocker_id UUID REFERENCES blockers(id) ON DELETE SET NULL;
