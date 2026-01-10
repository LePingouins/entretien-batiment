-- Add archived flag to work orders
-- Work orders in COMPLETED or CANCELLED status will be archived after 7 days

ALTER TABLE work_orders ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE work_orders ADD COLUMN archived_at TIMESTAMP;

-- Index for efficient filtering of non-archived work orders
CREATE INDEX idx_work_orders_archived ON work_orders(archived);
CREATE INDEX idx_work_orders_archived_at ON work_orders(archived_at);
