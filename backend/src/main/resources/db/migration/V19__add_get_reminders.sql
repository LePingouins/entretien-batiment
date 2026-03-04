-- V19: Add reminders_enabled to app_user table

ALTER TABLE app_user ADD COLUMN IF NOT EXISTS get_reminders BOOLEAN NOT NULL DEFAULT true;
