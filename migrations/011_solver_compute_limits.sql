-- Diagnostics are jobs, never approved strategy artifacts. Preserve existing
-- rows and statuses while recording bounded solver/verifier exhaustion.
ALTER TABLE solver_jobs DROP CONSTRAINT IF EXISTS solver_jobs_priority_check;
ALTER TABLE solver_jobs ADD CONSTRAINT solver_jobs_priority_check CHECK (priority BETWEEN 1 AND 4);
ALTER TABLE solver_jobs DROP CONSTRAINT IF EXISTS solver_jobs_status_check;
ALTER TABLE solver_jobs ADD CONSTRAINT solver_jobs_status_check CHECK (status IN
  ('QUEUED', 'RUNNING', 'VALIDATING', 'VERIFIED', 'FAILED_VALIDATION', 'FAILED', 'COMPUTE_LIMIT', 'NON_CONVERGED'));
