ALTER TABLE study_users ADD COLUMN IF NOT EXISTS development_only boolean NOT NULL DEFAULT false;
INSERT INTO schema_migrations (version) VALUES (2) ON CONFLICT DO NOTHING;
