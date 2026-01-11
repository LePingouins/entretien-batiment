-- V9: Increase URL column size to TEXT to support long URLs (e.g., Google search URLs)

ALTER TABLE work_order_material ALTER COLUMN url TYPE TEXT;
