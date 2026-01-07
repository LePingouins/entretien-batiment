ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS attachment_filename VARCHAR(255),
  ADD COLUMN IF NOT EXISTS attachment_content_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS attachment_download_url VARCHAR(255);

CREATE TABLE IF NOT EXISTS mileage_entry (
    id BIGSERIAL PRIMARY KEY,
    date DATE,
    supplier VARCHAR(255),
    start_km INT,
    end_km INT
);