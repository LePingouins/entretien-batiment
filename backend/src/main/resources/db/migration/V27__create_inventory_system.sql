-- ============================================================
-- Horizon Nature – Warehouse Inventory Counting System
-- ============================================================

-- Product categories (e.g. "Huiles essentielles", "Savons", "Herbes séchées")
CREATE TABLE inventory_categories (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product catalog
CREATE TABLE inventory_products (
    id              BIGSERIAL PRIMARY KEY,
    sku             VARCHAR(60) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    category_id     BIGINT REFERENCES inventory_categories(id) ON DELETE SET NULL,
    unit            VARCHAR(30) NOT NULL DEFAULT 'unit',   -- unit, kg, L, box, etc.
    barcode         VARCHAR(80),
    expected_qty    NUMERIC(12,2) NOT NULL DEFAULT 0,      -- "book" quantity
    location_zone   VARCHAR(80),                           -- warehouse zone / aisle
    notes           TEXT,
    archived        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_products_sku     ON inventory_products(sku);
CREATE INDEX idx_inv_products_barcode ON inventory_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_inv_products_cat     ON inventory_products(category_id);

-- Count session status
CREATE TYPE inventory_session_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- A count session represents one full physical inventory count
CREATE TABLE inventory_count_sessions (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    status          inventory_session_status NOT NULL DEFAULT 'DRAFT',
    notes           TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_by      BIGINT REFERENCES app_user(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual count entries per product per session
CREATE TABLE inventory_count_items (
    id              BIGSERIAL PRIMARY KEY,
    session_id      BIGINT NOT NULL REFERENCES inventory_count_sessions(id) ON DELETE CASCADE,
    product_id      BIGINT NOT NULL REFERENCES inventory_products(id) ON DELETE CASCADE,
    counted_qty     NUMERIC(12,2),                      -- NULL = not yet counted
    expected_qty    NUMERIC(12,2) NOT NULL DEFAULT 0,   -- snapshot at count time
    zone            VARCHAR(80),
    counted_by      BIGINT REFERENCES app_user(id),
    notes           TEXT,
    counted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE(session_id, product_id)
);

CREATE INDEX idx_inv_count_items_session ON inventory_count_items(session_id);
CREATE INDEX idx_inv_count_items_product ON inventory_count_items(product_id);
