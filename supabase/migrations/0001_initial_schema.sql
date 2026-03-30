-- ============================================================
-- CSM Internal Deal Tracker — Fibr AI
-- Full Database Schema v1.2
-- ============================================================

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE deal_status AS ENUM ('active', 'on_hold', 'churned', 'closed_won');
CREATE TYPE project_status AS ENUM ('active', 'on_hold', 'completed', 'cancelled');
CREATE TYPE phase_status AS ENUM ('not_started', 'in_progress', 'blocked', 'skipped', 'completed');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked', 'na');
CREATE TYPE blocker_status AS ENUM ('open', 'in_resolution', 'escalated', 'resolved');
CREATE TYPE blocker_category AS ENUM ('client', 'internal', 'technical', 'commercial', 'other');
CREATE TYPE user_role AS ENUM ('csm_lead', 'csm_manager', 'solutions_engineer', 'account_executive', 'admin');
CREATE TYPE priority_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE template_type AS ENUM ('project', 'phase');
CREATE TYPE template_scope AS ENUM ('personal', 'shared');

-- ============================================================
-- TEAM MEMBERS
-- ============================================================

CREATE TABLE team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        user_role NOT NULL DEFAULT 'csm_lead',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEALS
-- ============================================================

CREATE TABLE deals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name     TEXT NOT NULL,
  csm_owner       UUID REFERENCES team_members(id) ON DELETE SET NULL,
  ae_owner        UUID REFERENCES team_members(id) ON DELETE SET NULL,
  deal_value      NUMERIC(12,2),
  start_date      DATE DEFAULT CURRENT_DATE,
  status          deal_status DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ONBOARDING TASKS (9 fixed tasks per deal, seeded by trigger)
-- ============================================================

CREATE TABLE onboarding_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  task_number     SMALLINT NOT NULL CHECK (task_number BETWEEN 1 AND 9),
  title           TEXT NOT NULL,
  owner_role      TEXT NOT NULL,
  evidence_type   TEXT NOT NULL,
  completed_by    UUID REFERENCES team_members(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  evidence_notes  TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (deal_id, task_number)
);

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE projects (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id               UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  priority              priority_level DEFAULT 'medium',
  csm_owner             UUID REFERENCES team_members(id) ON DELETE SET NULL,
  status                project_status DEFAULT 'active',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  target_completion_date DATE,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PHASES (6 per project, seeded by trigger)
-- ============================================================

CREATE TABLE phases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_number    SMALLINT NOT NULL CHECK (phase_number BETWEEN 1 AND 6),
  name            TEXT NOT NULL,
  description     TEXT,
  status          phase_status DEFAULT 'not_started',
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  skipped_at      TIMESTAMPTZ,
  skip_reason     TEXT,
  skipped_by      UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, phase_number)
);

-- ============================================================
-- BLOCKERS (first-class entities)
-- ============================================================

CREATE TABLE blockers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id              UUID REFERENCES phases(id) ON DELETE CASCADE,
  task_id               UUID,  -- FK added after tasks table
  title                 TEXT NOT NULL,
  description           TEXT,
  category              blocker_category DEFAULT 'internal',
  raised_by             UUID REFERENCES team_members(id) ON DELETE SET NULL,
  raised_at             TIMESTAMPTZ DEFAULT NOW(),
  owner                 UUID REFERENCES team_members(id) ON DELETE SET NULL,
  target_resolution_date DATE,
  resolved_at           TIMESTAMPTZ,
  resolution_notes      TEXT,
  status                blocker_status DEFAULT 'open',
  escalation_note       TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id        UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  assignee        UUID REFERENCES team_members(id) ON DELETE SET NULL,
  priority        priority_level DEFAULT 'medium',
  due_date        DATE,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  status          task_status DEFAULT 'todo',
  na_reason       TEXT,
  blocker_id      UUID REFERENCES blockers(id) ON DELETE SET NULL,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Now add the FK from blockers.task_id → tasks
ALTER TABLE blockers ADD CONSTRAINT fk_blocker_task
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL;

-- ============================================================
-- TEMPLATES
-- ============================================================

CREATE TABLE templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            template_type NOT NULL,
  scope           template_scope NOT NULL DEFAULT 'personal',
  phase_target    SMALLINT CHECK (phase_target BETWEEN 1 AND 6),  -- null = project-level
  created_by      UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  pinned          BOOLEAN DEFAULT false,
  archived        BOOLEAN DEFAULT false
);

CREATE TABLE template_tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  phase_number    SMALLINT NOT NULL CHECK (phase_number BETWEEN 1 AND 6),
  title           TEXT NOT NULL,
  description     TEXT,
  priority        priority_level DEFAULT 'medium',
  sort_order      INTEGER DEFAULT 0
);

-- ============================================================
-- ACTIVITY LOG (immutable)
-- ============================================================

CREATE TABLE activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT NOT NULL,   -- 'deal' | 'project' | 'phase' | 'task' | 'blocker' | 'template'
  entity_id       UUID NOT NULL,
  deal_id         UUID REFERENCES deals(id) ON DELETE CASCADE,  -- for scoping
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE, -- for scoping
  action          TEXT NOT NULL,
  actor           UUID REFERENCES team_members(id) ON DELETE SET NULL,
  timestamp       TIMESTAMPTZ DEFAULT NOW(),
  metadata        JSONB DEFAULT '{}'
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_deals_csm_owner         ON deals(csm_owner);
CREATE INDEX idx_deals_status            ON deals(status);
CREATE INDEX idx_onboarding_deal         ON onboarding_tasks(deal_id);
CREATE INDEX idx_projects_deal           ON projects(deal_id);
CREATE INDEX idx_projects_csm_owner      ON projects(csm_owner);
CREATE INDEX idx_phases_project          ON phases(project_id);
CREATE INDEX idx_tasks_phase             ON tasks(phase_id);
CREATE INDEX idx_tasks_assignee          ON tasks(assignee);
CREATE INDEX idx_tasks_status            ON tasks(status);
CREATE INDEX idx_tasks_due_date          ON tasks(due_date);
CREATE INDEX idx_blockers_phase          ON blockers(phase_id);
CREATE INDEX idx_blockers_status         ON blockers(status);
CREATE INDEX idx_activity_entity         ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_deal           ON activity_log(deal_id);
CREATE INDEX idx_activity_project        ON activity_log(project_id);
CREATE INDEX idx_activity_timestamp      ON activity_log(timestamp DESC);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_team_members_updated_at BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_phases_updated_at BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_blockers_updated_at BEFORE UPDATE ON blockers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: Auto-seed 9 onboarding tasks when a deal is created
-- ============================================================

CREATE OR REPLACE FUNCTION seed_onboarding_tasks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO onboarding_tasks (deal_id, task_number, title, owner_role, evidence_type) VALUES
    (NEW.id, 1, 'Kick-off Call Scheduled',           'CSM Lead',           'Date + recording link'),
    (NEW.id, 2, 'Contract & SOW Signed',              'Account Executive',  'Contract ID reference'),
    (NEW.id, 3, 'Stakeholder Mapping Completed',      'CSM Lead',           'Names, roles, contacts'),
    (NEW.id, 4, 'Technical Onboarding Done',          'Solutions Engineer', 'Snippet / pixel verified'),
    (NEW.id, 5, 'Fibr Dashboard Access Granted',      'CSM Lead',           'User IDs + roles assigned'),
    (NEW.id, 6, 'Data Source Connected',              'Solutions Engineer', 'CRM / CDP / Analytics'),
    (NEW.id, 7, 'Use-Case Alignment Workshop',        'CSM Lead + Client',  'Notes doc linked'),
    (NEW.id, 8, 'Success Metrics Defined',            'CSM Lead',           'KPIs documented'),
    (NEW.id, 9, 'Onboarding Sign-off',                'Client POC',         'Date + confirmation email');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seed_onboarding_tasks
  AFTER INSERT ON deals
  FOR EACH ROW EXECUTE FUNCTION seed_onboarding_tasks();

-- ============================================================
-- TRIGGER: Auto-seed 6 phases when a project is created
-- ============================================================

CREATE OR REPLACE FUNCTION seed_project_phases()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO phases (project_id, phase_number, name, description) VALUES
    (NEW.id, 1, 'Requirement Gathering',  'Understand client goals, audience segments, and personalization use cases.'),
    (NEW.id, 2, 'Scoping & Solutioning',  'Translate requirements into a Fibr solution blueprint with effort estimates.'),
    (NEW.id, 3, 'Campaign Setup',         'Configure and build the personalization campaign inside Fibr dashboard.'),
    (NEW.id, 4, 'Campaign Review',        'Internal QA + client walkthrough. Collect approvals before going live.'),
    (NEW.id, 5, 'Campaign Live',          'Campaign activated. Monitor delivery, impressions, and real-time metrics.'),
    (NEW.id, 6, 'Campaign Performance',   'Ongoing or end-state review of KPIs. Document learnings and next steps.');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seed_project_phases
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION seed_project_phases();

-- ============================================================
-- ROW LEVEL SECURITY (permissive — no auth in v1)
-- ============================================================

ALTER TABLE team_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blockers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_team_members"    ON team_members    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_deals"           ON deals           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_onboarding"      ON onboarding_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_projects"        ON projects        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_phases"          ON phases          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_tasks"           ON tasks           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_blockers"        ON blockers        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_templates"       ON templates       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_template_tasks"  ON template_tasks  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_activity_log"    ON activity_log    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DASHBOARD STATS RPC
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE result JSON;
BEGIN
  SELECT json_build_object(
    'active_deals',        (SELECT COUNT(*) FROM deals WHERE status = 'active'),
    'active_projects',     (SELECT COUNT(*) FROM projects WHERE status = 'active'),
    'open_blockers',       (SELECT COUNT(*) FROM blockers WHERE status IN ('open', 'in_resolution', 'escalated')),
    'escalated_blockers',  (SELECT COUNT(*) FROM blockers WHERE status = 'escalated'),
    'overdue_tasks',       (SELECT COUNT(*) FROM tasks t JOIN phases ph ON t.phase_id = ph.id WHERE t.due_date < CURRENT_DATE AND t.status NOT IN ('done', 'na') AND ph.status != 'skipped'),
    'team_member_count',   (SELECT COUNT(*) FROM team_members),
    'tasks_per_member', (
      SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
      FROM (
        SELECT tm.id, tm.name, tm.role,
               COUNT(t.id) FILTER (WHERE t.status NOT IN ('done','na')) AS open_tasks,
               COUNT(t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status NOT IN ('done','na')) AS overdue_tasks
        FROM team_members tm
        LEFT JOIN tasks t ON t.assignee = tm.id
        GROUP BY tm.id, tm.name, tm.role
        ORDER BY open_tasks DESC
      ) r
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO team_members (name, email, role) VALUES
  ('Meera K.',    'meera@fibr.ai',   'csm_manager'),
  ('Priya S.',    'priya@fibr.ai',   'csm_lead'),
  ('Rohan M.',    'rohan@fibr.ai',   'csm_lead'),
  ('Anil T.',     'anil@fibr.ai',    'csm_lead'),
  ('Dev P.',      'dev@fibr.ai',     'solutions_engineer'),
  ('Sarthak S.',  'sarthak@fibr.ai', 'csm_lead');
