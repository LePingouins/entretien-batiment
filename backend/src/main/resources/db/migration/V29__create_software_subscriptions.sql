-- ─── Software Subscriptions ────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE subscription_billing_cycle AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'TRIAL', 'CANCELLED', 'EXPIRED', 'PAUSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_category AS ENUM (
        'ERP', 'ACCOUNTING', 'SECURITY', 'INFRASTRUCTURE',
        'COMMUNICATION', 'PRODUCTIVITY', 'DOMAIN', 'HOSTING',
        'STORAGE', 'MONITORING', 'HR', 'CRM', 'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE software_subscription (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    vendor      VARCHAR(120),
    category    subscription_category NOT NULL DEFAULT 'OTHER',
    cost        NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency    VARCHAR(3) NOT NULL DEFAULT 'CAD',
    billing_cycle subscription_billing_cycle NOT NULL DEFAULT 'MONTHLY',
    status      subscription_status NOT NULL DEFAULT 'ACTIVE',
    start_date  DATE,
    next_due_date DATE,
    auto_renew  BOOLEAN NOT NULL DEFAULT TRUE,
    website_url VARCHAR(500),
    contact_email VARCHAR(255),
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_software_subscription_status ON software_subscription(status);
CREATE INDEX idx_software_subscription_next_due ON software_subscription(next_due_date);

-- Seed page access rules
INSERT INTO role_page_access (page_key, role, allowed) VALUES
    ('SUBSCRIPTIONS', 'ADMIN',  true),
    ('SUBSCRIPTIONS', 'TECH',   false),
    ('SUBSCRIPTIONS', 'WORKER', false)
ON CONFLICT (page_key, role) DO NOTHING;
