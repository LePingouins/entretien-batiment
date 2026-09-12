ALTER TABLE rep_trip_stop
    ADD COLUMN IF NOT EXISTS client_operation_id VARCHAR(64);

ALTER TABLE rep_trip_photo
    ADD COLUMN IF NOT EXISTS client_operation_id VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS ux_rep_trip_stop_client_operation
    ON rep_trip_stop (client_operation_id)
    WHERE client_operation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_rep_trip_photo_client_operation
    ON rep_trip_photo (client_operation_id)
    WHERE client_operation_id IS NOT NULL;