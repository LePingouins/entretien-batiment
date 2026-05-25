-- Add duration tracking and full GPS waypoint trace to rep_trip
-- duration_minutes: how long the trip took (end - start)
-- waypoints_json:   JSON array of [lat, lng, timestamp_ms] triples recorded during the trip

ALTER TABLE rep_trip
    ADD COLUMN duration_minutes INTEGER,
    ADD COLUMN waypoints_json   TEXT;
