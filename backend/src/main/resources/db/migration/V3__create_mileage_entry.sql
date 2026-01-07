CREATE TABLE mileage_entry (
    id BIGSERIAL PRIMARY KEY,
    date DATE,
    supplier VARCHAR(255),
    start_km INT,
    end_km INT
);