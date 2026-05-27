-- Store both Google-computed distances on each trip for transparency and
-- audit:
--   ideal_km        = optimal Google route via origin + recorded stops + dest
--   actual_km       = Google route through filtered GPS intermediates
--   distance_source = which value populated total_km ("actual",
--                     "ideal_fallback", "haversine", "manual", ...)
ALTER TABLE rep_trip
    ADD COLUMN ideal_km        DOUBLE NULL,
    ADD COLUMN actual_km       DOUBLE NULL,
    ADD COLUMN distance_source VARCHAR(32) NULL;
