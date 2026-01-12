-- Add supplier column to work_order_material table
ALTER TABLE work_order_material ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
