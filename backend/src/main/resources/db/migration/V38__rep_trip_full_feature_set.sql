-- =============================================================================
-- V38: Complete rep-trip feature set  (PostgreSQL)
-- =============================================================================

-- --- columns on rep_trip ----------------------------------------------------
ALTER TABLE rep_trip
    ADD COLUMN IF NOT EXISTS actual_polyline       TEXT              NULL,
    ADD COLUMN IF NOT EXISTS osrm_km               DOUBLE PRECISION  NULL,
    ADD COLUMN IF NOT EXISTS category              VARCHAR(32)       NOT NULL DEFAULT 'CLIENT',
    ADD COLUMN IF NOT EXISTS approval_status       VARCHAR(16)       NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS approved_by_user_id   BIGINT            NULL,
    ADD COLUMN IF NOT EXISTS approved_at           TIMESTAMP         NULL,
    ADD COLUMN IF NOT EXISTS approval_note         VARCHAR(512)      NULL,
    ADD COLUMN IF NOT EXISTS driver_note           TEXT              NULL,
    ADD COLUMN IF NOT EXISTS locked                BOOLEAN           NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS locked_at             TIMESTAMP         NULL,
    ADD COLUMN IF NOT EXISTS idempotency_key       VARCHAR(64)       NULL,
    ADD COLUMN IF NOT EXISTS mileage_rate_cents    INT               NULL,
    ADD COLUMN IF NOT EXISTS reimbursement_cents   INT               NULL,
    ADD COLUMN IF NOT EXISTS suspicion_flags       INT               NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS waypoints_archived_at TIMESTAMP         NULL,
    ADD COLUMN IF NOT EXISTS vehicle_id            BIGINT            NULL;

ALTER TABLE rep_trip
    ADD CONSTRAINT uk_trip_idempotency UNIQUE (idempotency_key);

-- --- per-leg distances on stops ---------------------------------------------
ALTER TABLE rep_trip_stop
    ADD COLUMN IF NOT EXISTS leg_index        INT               NULL,
    ADD COLUMN IF NOT EXISTS leg_km           DOUBLE PRECISION  NULL,
    ADD COLUMN IF NOT EXISTS duration_seconds INT               NULL;

-- --- per-user mileage rate ($/km) over time ---------------------------------
CREATE TABLE IF NOT EXISTS user_mileage_rate (
    id             BIGSERIAL    NOT NULL,
    user_id        BIGINT       NULL,
    cents_per_km   INT          NOT NULL,
    effective_from DATE         NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    created_by     BIGINT       NULL,
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS ix_mileage_user_date ON user_mileage_rate (user_id, effective_from);

-- Seed: CRA 2026 rate = 70 cents/km (company default, user_id NULL)
INSERT INTO user_mileage_rate (user_id, cents_per_km, effective_from)
    VALUES (NULL, 70, '2026-01-01');

-- --- vehicles ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicle (
    id            BIGSERIAL    NOT NULL,
    label         VARCHAR(64)  NOT NULL,
    license_plate VARCHAR(16)  NULL,
    user_id       BIGINT       NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    notes         VARCHAR(255) NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS ix_vehicle_user ON vehicle (user_id);

-- --- audit log --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rep_trip_audit_log (
    id          BIGSERIAL    NOT NULL,
    trip_id     BIGINT       NOT NULL,
    user_id     BIGINT       NULL,
    action      VARCHAR(32)  NOT NULL,
    summary     VARCHAR(255) NULL,
    before_json TEXT         NULL,
    after_json  TEXT         NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_audit_trip FOREIGN KEY (trip_id) REFERENCES rep_trip(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS ix_audit_trip ON rep_trip_audit_log (trip_id, created_at);

-- --- photos -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rep_trip_photo (
    id          BIGSERIAL    NOT NULL,
    trip_id     BIGINT       NOT NULL,
    stop_id     BIGINT       NULL,
    kind        VARCHAR(16)  NOT NULL,
    file_path   VARCHAR(512) NOT NULL,
    mime_type   VARCHAR(64)  NULL,
    size_bytes  INT          NULL,
    uploaded_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id),
    CONSTRAINT fk_photo_trip FOREIGN KEY (trip_id) REFERENCES rep_trip(id) ON DELETE CASCADE,
    CONSTRAINT fk_photo_stop FOREIGN KEY (stop_id) REFERENCES rep_trip_stop(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS ix_photo_trip ON rep_trip_photo (trip_id);

