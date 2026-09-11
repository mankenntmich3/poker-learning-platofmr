CREATE TABLE IF NOT EXISTS study_saved_spots (
  user_id uuid NOT NULL REFERENCES study_users(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  spot jsonb NOT NULL,
  label text NOT NULL,
  favorite boolean NOT NULL DEFAULT false,
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,node_id)
);
CREATE TABLE IF NOT EXISTS study_engine_decisions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES study_users(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  spot jsonb NOT NULL,
  chosen_action text NOT NULL,
  feedback jsonb NOT NULL,
  street text NOT NULL,
  position text NOT NULL,
  hand_class text NOT NULL,
  board_texture jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_engine_decisions_user_date ON study_engine_decisions(user_id,created_at DESC);
