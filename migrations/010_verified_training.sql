CREATE TABLE IF NOT EXISTS verified_training_questions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES study_users(id) ON DELETE CASCADE,
  artifact_id text NOT NULL REFERENCES verified_solution_artifacts(id),
  artifact_checksum text NOT NULL,
  combo text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('action','recall')),
  feedback jsonb,
  submitted jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz
);
CREATE INDEX IF NOT EXISTS verified_questions_user_idx ON verified_training_questions(user_id,created_at DESC);
