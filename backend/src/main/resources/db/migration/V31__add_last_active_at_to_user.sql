-- V31: Track user presence (last active timestamp)
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_app_user_last_active_at ON app_user(last_active_at);
