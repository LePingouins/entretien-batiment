-- V8: Add URL and description fields to work_order_material

ALTER TABLE work_order_material ADD COLUMN IF NOT EXISTS url VARCHAR(500);
ALTER TABLE work_order_material ADD COLUMN IF NOT EXISTS description TEXT;
