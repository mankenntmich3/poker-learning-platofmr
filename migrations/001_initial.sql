CREATE TABLE IF NOT EXISTS schema_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_users (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  weekly_goal integer NOT NULL DEFAULT 3 CHECK (weekly_goal BETWEEN 1 AND 7),
  experience text NOT NULL DEFAULT 'beginner',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES study_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_sessions_user_idx ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS study_sessions_expiry_idx ON study_sessions(expires_at);

CREATE TABLE IF NOT EXISTS lesson_completions (
  user_id uuid NOT NULL REFERENCES study_users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS training_decisions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES study_users(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL,
  spot_id text NOT NULL,
  action text NOT NULL,
  regret double precision NOT NULL CHECK (regret >= 0),
  evaluation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, attempt_id)
);
CREATE INDEX IF NOT EXISTS training_decisions_user_date_idx ON training_decisions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS request_limits (
  key text NOT NULL,
  bucket bigint NOT NULL,
  count integer NOT NULL CHECK (count > 0),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (key, bucket)
);
CREATE INDEX IF NOT EXISTS request_limits_expiry_idx ON request_limits(expires_at);

INSERT INTO schema_migrations (version) VALUES (1) ON CONFLICT DO NOTHING;
