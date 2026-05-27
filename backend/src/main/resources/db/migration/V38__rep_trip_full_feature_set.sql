-- =============================================================================
-- V38: Complete rep-trip feature set
-- -----------------------------------------------------------------------------
-- Adds the schema needed for:
--   #1  polyline storage (encoded Google polyline of the actual route)
--   #2  tamper protection (locked flag, approval state controls editability)
--   #4  idempotency (prevent duplicate submissions on network retries)
--   #5  per-leg distances stored on stops (for multi-stop trips)
--   #6  OSRM cross-check value
--   #7  approval workflow (status, approver, decision timestamp, reason)
--   #8  mileage rate snapshot + computed reimbursement amount
--   #9  suspicious-pattern flag bitset and notes
--   #12 photo attachments (start / end / receipt)
--   #13 trip category (CLIENT / PICKUP / TRAINING / PERSONAL / OTHER)
--   #15 data retention (waypoints_archived_at)
--   #19 per-vehicle tracking (optional FK on trip)
-- Plus supporting tables:
--   user_mileage_rate      -- per-user $/km configuration over time
--   vehicle                -- fleet vehicles + assignments
--   rep_trip_audit_log     -- full audit trail (#3)
--   rep_trip_photo         -- photo attachments (#12)
-- =============================================================================

-- --- columns on rep_trip --------------------------------------------------
ALTER TABLE rep_trip
    ADD COLUMN actual_polyline      TEXT          NULL,                              -- #1
    ADD COLUMN osrm_km              DOUBLE        NULL,                              -- #6
    ADD COLUMN category             VARCHAR(32)   NOT NULL DEFAULT 'CLIENT',         -- #13
    ADD COLUMN approval_status      VARCHAR(16)   NOT NULL DEFAULT 'PENDING',        -- #7
    ADD COLUMN approved_by_user_id  BIGINT        NULL,                              -- #7
    ADD COLUMN approved_at          DATETIME(3)   NULL,                              -- #7
    ADD COLUMN approval_note        VARCHAR(512)  NULL,                              -- #7
    ADD COLUMN driver_note          TEXT          NULL,                              -- #11
    ADD COLUMN locked               TINYINT(1)    NOT NULL DEFAULT 0,                -- #2
    ADD COLUMN locked_at            DATETIME(3)   NULL,                              -- #2
    ADD COLUMN idempotency_key      VARCHAR(64)   NULL,                              -- #4
    ADD COLUMN mileage_rate_cents   INT           NULL,                              -- #8 (snapshot at submission)
    ADD COLUMN reimbursement_cents  INT           NULL,                              -- #8
    ADD COLUMN suspicion_flags      INT           NOT NULL DEFAULT 0,                -- #9 bitset
    ADD COLUMN waypoints_archived_at DATETIME(3)  NULL,                              -- #15
    ADD COLUMN vehicle_id           BIGINT        NULL,                              -- #19
    ADD UNIQUE KEY uk_trip_idempotency (idempotency_key);

-- --- per-leg distances on stops -------------------------------------------
ALTER TABLE rep_trip_stop
    ADD COLUMN leg_index    INT     NULL,    -- 0 = first leg (start → stop1)
    ADD COLUMN leg_km       DOUBLE  NULL,    -- distance from previous anchor to this stop
    ADD COLUMN duration_seconds INT NULL;    -- computed stop duration

-- --- per-user mileage rate ($/km) over time -------------------------------
CREATE TABLE user_mileage_rate (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    user_id         BIGINT       NULL,           -- NULL = company default
    cents_per_km    INT          NOT NULL,
    effective_from  DATE         NOT NULL,
    created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_by      BIGINT       NULL,
    PRIMARY KEY (id),
    KEY ix_mileage_user_date (user_id, effective_from)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed: CRA 2026 rate (Quebec, first 5000 km) = 70¢/km, default for all users.
INSERT INTO user_mileage_rate (user_id, cents_per_km, effective_from)
    VALUES (NULL, 70, '2026-01-01');

-- --- vehicles -------------------------------------------------------------
CREATE TABLE vehicle (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    label         VARCHAR(64)  NOT NULL,        -- "Ford Transit #1"
    license_plate VARCHAR(16)  NULL,
    user_id       BIGINT       NULL,            -- default assignee
    active        TINYINT(1)   NOT NULL DEFAULT 1,
    notes         VARCHAR(255) NULL,
    created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY ix_vehicle_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --- audit log ------------------------------------------------------------
CREATE TABLE rep_trip_audit_log (
    id           BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id      BIGINT       NOT NULL,
    user_id      BIGINT       NULL,             -- actor (NULL = system)
    action       VARCHAR(32)  NOT NULL,         -- CREATED | UPDATED | APPROVED | REJECTED | LOCKED | UNLOCKED | DELETED | EXPORTED
    summary      VARCHAR(255) NULL,
    before_json  MEDIUMTEXT   NULL,
    after_json   MEDIUMTEXT   NULL,
    created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY ix_audit_trip (trip_id, created_at),
    CONSTRAINT fk_audit_trip FOREIGN KEY (trip_id) REFERENCES rep_trip(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --- photos ---------------------------------------------------------------
CREATE TABLE rep_trip_photo (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    trip_id     BIGINT       NOT NULL,
    stop_id     BIGINT       NULL,
    kind        VARCHAR(16)  NOT NULL,          -- START | END | STOP | RECEIPT
    file_path   VARCHAR(512) NOT NULL,
    mime_type   VARCHAR(64)  NULL,
    size_bytes  INT          NULL,
    uploaded_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    KEY ix_photo_trip (trip_id),
    CONSTRAINT fk_photo_trip FOREIGN KEY (trip_id) REFERENCES rep_trip(id) ON DELETE CASCADE,
    CONSTRAINT fk_photo_stop FOREIGN KEY (stop_id) REFERENCES rep_trip_stop(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
