-- Add optional links from mileage_entry to work_orders and urgent_work_order
ALTER TABLE mileage_entry ADD COLUMN IF NOT EXISTS work_order_id BIGINT REFERENCES work_orders(id);
ALTER TABLE mileage_entry ADD COLUMN IF NOT EXISTS urgent_work_order_id BIGINT REFERENCES urgent_work_order(id);