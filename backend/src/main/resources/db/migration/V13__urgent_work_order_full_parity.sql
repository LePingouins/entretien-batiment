ALTER TABLE urgent_work_order
  ADD COLUMN priority VARCHAR(20),
  ADD COLUMN created_by_user_id BIGINT,
  ADD COLUMN assigned_to_user_id BIGINT,
  ADD COLUMN requested_date TIMESTAMP,
  ADD COLUMN due_date TIMESTAMP,
  ADD COLUMN updated_at TIMESTAMP,
  ADD COLUMN attachment_download_url VARCHAR(255),
  ADD COLUMN materials_count INTEGER,
  ADD COLUMN materials_preview TEXT,
  ADD COLUMN archived BOOLEAN,
  ADD COLUMN archived_at TIMESTAMP,
  ADD COLUMN sort_index INTEGER;
