-- ─── Preventive Maintenance update: DHN + quarterly cadence ────────────────

DO $$ BEGIN
    ALTER TYPE task_frequency ADD VALUE IF NOT EXISTS 'QUARTERLY';
EXCEPTION WHEN duplicate_object THEN null;
END $$;