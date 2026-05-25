CREATE TABLE IF NOT EXISTS rep_trip_stop (
    id          BIGSERIAL       NOT NULL,
    trip_id     BIGINT          NOT NULL,
    address     VARCHAR(512),
    lat         DOUBLE PRECISION,
    lng         DOUBLE PRECISION,
    reason      VARCHAR(32)     NOT NULL DEFAULT 'OTHER',
    notes       VARCHAR(512),
    stopped_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_rep_trip_stop_trip FOREIGN KEY (trip_id) REFERENCES rep_trip(id) ON DELETE CASCADE
);
