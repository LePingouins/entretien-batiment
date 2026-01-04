-- V2: Work Orders

-- ENUMS
DO $$ BEGIN
CREATE TYPE work_order_status AS ENUM (
    'OPEN',
    'ASSIGNED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
CREATE TYPE work_order_priority AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- TABLE
CREATE TABLE IF NOT EXISTS work_orders (
                                           id BIGSERIAL PRIMARY KEY,

                                           title VARCHAR(140) NOT NULL,
    description TEXT,

    location VARCHAR(200),

    priority work_order_priority NOT NULL DEFAULT 'MEDIUM',
    status   work_order_status  NOT NULL DEFAULT 'OPEN',

    created_by_user_id  BIGINT NOT NULL,
    assigned_to_user_id BIGINT NULL,

    requested_date DATE NULL,
    due_date       DATE NULL,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),

    CONSTRAINT fk_work_orders_created_by
    FOREIGN KEY (created_by_user_id)
    REFERENCES app_user(id),

    CONSTRAINT fk_work_orders_assigned_to
    FOREIGN KEY (assigned_to_user_id)
    REFERENCES app_user(id)
    );

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_to ON work_orders(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at ON work_orders(created_at);
