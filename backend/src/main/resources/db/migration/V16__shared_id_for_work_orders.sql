-- V16: Shared sequence for work_orders and urgent_work_order

-- Create a new sequence for shared IDs
CREATE SEQUENCE IF NOT EXISTS work_order_shared_id_seq;

-- Set work_orders.id to use the shared sequence
ALTER TABLE work_orders ALTER COLUMN id SET DEFAULT nextval('work_order_shared_id_seq');

-- Set urgent_work_order.id to use the shared sequence
ALTER TABLE urgent_work_order ALTER COLUMN id SET DEFAULT nextval('work_order_shared_id_seq');

-- NOTE: Existing IDs will not be changed. If you want to re-sequence existing data, you must update them manually.
-- MileageEntry keeps its own sequence (no change needed)
