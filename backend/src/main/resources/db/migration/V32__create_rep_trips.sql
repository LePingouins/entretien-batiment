-- Rep Trips module: GPS-assisted mileage tracking for sales representatives
CREATE TABLE rep_trip (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',  -- IN_PROGRESS | COMPLETED
    purpose     VARCHAR(255),
    notes       TEXT,
    start_address VARCHAR(512),
    start_lat   DOUBLE PRECISION,
    start_lng   DOUBLE PRECISION,
    end_address VARCHAR(512),
    end_lat     DOUBLE PRECISION,
    end_lng     DOUBLE PRECISION,
    total_km    DOUBLE PRECISION,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rep_trip_user_id ON rep_trip(user_id);
CREATE INDEX idx_rep_trip_date    ON rep_trip(date);

CREATE TABLE rep_trip_stop (
    id          BIGSERIAL PRIMARY KEY,
    trip_id     BIGINT NOT NULL REFERENCES rep_trip(id) ON DELETE CASCADE,
    address     VARCHAR(512),
    lat         DOUBLE PRECISION,
    lng         DOUBLE PRECISION,
    reason      VARCHAR(64) NOT NULL DEFAULT 'OTHER',  -- CLIENT | RESTAURANT | GAS | OFFICE | OTHER
    notes       VARCHAR(512),
    stopped_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rep_trip_stop_trip_id ON rep_trip_stop(trip_id);

-- Page access: REP_TRIPS accessible to all roles by default
INSERT INTO role_page_access (page_key, role, allowed) VALUES
    ('REP_TRIPS', 'ADMIN',      true),
    ('REP_TRIPS', 'DEVELOPPER', true),
    ('REP_TRIPS', 'TECH',       false),
    ('REP_TRIPS', 'WORKER',     true)
ON CONFLICT (page_key, role) DO NOTHING;
