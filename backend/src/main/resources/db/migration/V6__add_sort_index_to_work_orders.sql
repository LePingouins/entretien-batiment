-- V6: Add sort_index column to work_orders table for manual ordering within columns
-- 
-- ORDERING RULES:
-- 1. Items with non-null sort_index are ordered by sort_index ASC within their status column
-- 2. Items with null sort_index (new items) are inserted by priority (URGENT > HIGH > MEDIUM > LOW)
-- 3. Tie-breaker: priority DESC, then created_at DESC (or id DESC)
-- 4. When user manually reorders via drag-and-drop, sort_index is assigned (0..N-1)
-- 5. Moving a card across columns updates its status and assigns sort_index at the drop position

ALTER TABLE work_orders ADD COLUMN sort_index INTEGER;

-- Create index for efficient ordering queries
CREATE INDEX idx_work_orders_status_sort_index ON work_orders(status, sort_index);

COMMENT ON COLUMN work_orders.sort_index IS 'Manual ordering index within status column. NULL means use priority-based ordering.';
