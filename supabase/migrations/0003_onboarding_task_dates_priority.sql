-- Add start date, due date, and priority to onboarding tasks
ALTER TABLE onboarding_tasks
  ADD COLUMN started_at   DATE,
  ADD COLUMN due_date     DATE,
  ADD COLUMN priority     priority_level DEFAULT 'medium';
