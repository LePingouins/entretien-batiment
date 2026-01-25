-- Add attachment_filename and attachment_content_type columns to urgent_work_order
ALTER TABLE urgent_work_order ADD COLUMN IF NOT EXISTS attachment_filename VARCHAR(255);
ALTER TABLE urgent_work_order ADD COLUMN IF NOT EXISTS attachment_content_type VARCHAR(255);