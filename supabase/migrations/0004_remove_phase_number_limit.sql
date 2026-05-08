-- Remove the hardcoded upper limit of 6 phases per project.
-- Projects can now have any number of stages.
ALTER TABLE phases DROP CONSTRAINT phases_phase_number_check;
ALTER TABLE phases ADD CONSTRAINT phases_phase_number_check CHECK (phase_number >= 1);
