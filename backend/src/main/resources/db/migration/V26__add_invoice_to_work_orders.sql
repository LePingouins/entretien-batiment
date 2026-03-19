-- Add invoice document fields to work_orders table
ALTER TABLE work_orders
    ADD COLUMN IF NOT EXISTS invoice_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS invoice_content_type VARCHAR(100);

-- Add invoice document fields to urgent_work_order table
ALTER TABLE urgent_work_order
    ADD COLUMN IF NOT EXISTS invoice_filename VARCHAR(255),
    ADD COLUMN IF NOT EXISTS invoice_content_type VARCHAR(100);
