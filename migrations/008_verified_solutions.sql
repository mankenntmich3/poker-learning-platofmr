CREATE TABLE IF NOT EXISTS solver_jobs (
  id uuid PRIMARY KEY,
  context_key text NOT NULL,
  config jsonb NOT NULL,
  priority smallint NOT NULL CHECK (priority BETWEEN 1 AND 3),
  status text NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'VALIDATING', 'VERIFIED', 'FAILED_VALIDATION', 'FAILED')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS solver_jobs_queue_idx ON solver_jobs (priority, created_at) WHERE status = 'QUEUED';

CREATE TABLE IF NOT EXISTS verified_solution_artifacts (
  id text PRIMARY KEY,
  context_key text NOT NULL,
  game text NOT NULL,
  game_type text NOT NULL CHECK (game_type IN ('TOURNAMENT', 'CASH')),
  evaluation_model text NOT NULL CHECK (evaluation_model IN ('CHIP_EV', 'ICM', 'PKO', 'MYSTERY_BOUNTY')),
  players smallint NOT NULL CHECK (players BETWEEN 2 AND 9),
  stack_bb numeric NOT NULL CHECK (stack_bb > 0),
  ante_type text NOT NULL CHECK (ante_type IN ('NONE', 'BBA', 'PLAYER_ANTE', 'CUSTOM')),
  hero_position text NOT NULL,
  action_history jsonb NOT NULL,
  board jsonb NOT NULL,
  betting_tree_id text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('VERIFIED_SOLVER', 'IMPORTED_VERIFIED')),
  status text NOT NULL CHECK (status IN ('PENDING_VALIDATION', 'VERIFIED', 'FAILED_VALIDATION')),
  quality_label text CHECK (quality_label IN ('VERY_HIGH', 'HIGH', 'EXPERIMENTAL')),
  convergence_metric text NOT NULL,
  convergence_value double precision NOT NULL,
  convergence_threshold double precision NOT NULL,
  exploitability_bb_per_hand double precision,
  checksum text NOT NULL UNIQUE,
  artifact jsonb NOT NULL,
  generated_at timestamptz NOT NULL,
  published_at timestamptz,
  UNIQUE (context_key, betting_tree_id, checksum)
);
CREATE INDEX IF NOT EXISTS verified_solutions_lookup_idx ON verified_solution_artifacts
  (game, game_type, evaluation_model, players, stack_bb, ante_type, hero_position, betting_tree_id)
  WHERE status = 'VERIFIED';
