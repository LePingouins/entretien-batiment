-- Add distance_method column to rep_trip to support Haversine (straight-line) vs OSRM (road) distance calculation
ALTER TABLE rep_trip
    ADD COLUMN IF NOT EXISTS distance_method VARCHAR(20) NOT NULL DEFAULT 'HAVERSINE';
