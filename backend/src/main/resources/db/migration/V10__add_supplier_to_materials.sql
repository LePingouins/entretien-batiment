-- V10: Add supplier field to work_order_material

ALTER TABLE work_order_material ADD COLUMN IF NOT EXISTS supplier VARCHAR(255);
