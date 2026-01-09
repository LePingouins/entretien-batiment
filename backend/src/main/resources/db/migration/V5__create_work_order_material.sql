-- V5: Work Order Materials

CREATE TABLE IF NOT EXISTS work_order_material (
    id BIGSERIAL PRIMARY KEY,
    work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    quantity INT,
    bought BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_material_work_order_id ON work_order_material(work_order_id);
