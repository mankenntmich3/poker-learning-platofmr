-- Historical Phase-1 status flags were not independent mathematical evidence.
-- Preserve all data for audit; require revalidation before future publication.
ALTER TABLE verified_solution_artifacts ADD COLUMN IF NOT EXISTS verification_policy text;
ALTER TABLE verified_solution_artifacts ADD COLUMN IF NOT EXISTS verification_report jsonb;
ALTER TABLE verified_solution_artifacts ADD COLUMN IF NOT EXISTS stack_vector jsonb;
UPDATE verified_solution_artifacts
SET status='PENDING_VALIDATION', quality_label=NULL, published_at=NULL
WHERE status='VERIFIED' AND (verification_policy IS NULL OR verification_policy <> 'rangeform-verification-v2' OR verification_report IS NULL);
CREATE INDEX IF NOT EXISTS verified_solution_context_v2_idx
ON verified_solution_artifacts (context_key, betting_tree_id, verification_policy)
WHERE status='VERIFIED' AND verification_report IS NOT NULL;
