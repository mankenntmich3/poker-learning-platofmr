CREATE TABLE IF NOT EXISTS nlhe_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES study_users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  config jsonb NOT NULL,
  solution_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, client_id)
);
CREATE TABLE IF NOT EXISTS nlhe_questions (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES nlhe_sessions(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal BETWEEN 1 AND 10),
  cards jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, ordinal)
);
CREATE TABLE IF NOT EXISTS nlhe_decisions (
  question_id uuid PRIMARY KEY REFERENCES nlhe_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES study_users(id) ON DELETE CASCADE,
  action text NOT NULL,
  feedback jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nlhe_sessions_user ON nlhe_sessions(user_id, created_at DESC);
ALTER TABLE nlhe_sessions ADD COLUMN IF NOT EXISTS range_snapshot jsonb;
ALTER TABLE nlhe_sessions ADD COLUMN IF NOT EXISTS opponent_snapshot jsonb;
CREATE INDEX IF NOT EXISTS nlhe_decisions_user ON nlhe_decisions(user_id, created_at DESC);
INSERT INTO schema_migrations (version) VALUES (3) ON CONFLICT DO NOTHING;
