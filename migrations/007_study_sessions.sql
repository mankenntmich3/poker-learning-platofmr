CREATE TABLE IF NOT EXISTS study_engine_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES study_users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  root_spot jsonb NOT NULL,
  options jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id,client_id)
);
CREATE TABLE IF NOT EXISTS study_engine_questions (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES study_engine_sessions(id) ON DELETE CASCADE,
  ordinal integer NOT NULL CHECK (ordinal > 0 AND ordinal <= 100),
  spot jsonb NOT NULL,
  snapshot jsonb NOT NULL,
  UNIQUE(session_id,ordinal)
);
