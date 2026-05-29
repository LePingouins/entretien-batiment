-- V40: Add archive support to representant expenses and rep_trip (km).
-- Lets reps archive/restore their own entries; archived rows are excluded
-- from the "my expenses" / "my trips" lists shown to the user (web + mobile)
-- but remain visible from the admin Archive page.

ALTER TABLE expense  ADD COLUMN IF NOT EXISTS archived    BOOLEAN   DEFAULT FALSE;
ALTER TABLE expense  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_expense_archived ON expense(archived);

ALTER TABLE rep_trip ADD COLUMN IF NOT EXISTS archived    BOOLEAN   DEFAULT FALSE;
ALTER TABLE rep_trip ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_rep_trip_archived ON rep_trip(archived);
