-- ─────────────────────────────────────────────────────────────────────────────
-- V39: REPRESENTANT role + Expenses/Invoices feature
-- ─────────────────────────────────────────────────────────────────────────────

-- New page access rules. REP_TRIPS already exists; reps see their own only
-- (enforced in controllers). REP_EXPENSES is the rep's own invoice screen.
-- REPRESENTANTS is the admin-only directory page.
insert into role_page_access (page_key, role, allowed) values
    ('REP_EXPENSES',   'ADMIN',        true),
    ('REP_EXPENSES',   'REPRESENTANT', true),
    ('REP_EXPENSES',   'TECH',         false),
    ('REP_EXPENSES',   'WORKER',       false),

    ('REP_TRIPS',      'REPRESENTANT', true),

    ('REPRESENTANTS',  'ADMIN',        true),
    ('REPRESENTANTS',  'TECH',         false),
    ('REPRESENTANTS',  'WORKER',       false),
    ('REPRESENTANTS',  'REPRESENTANT', false)
on conflict (page_key, role) do nothing;

-- ─── Expense (a representant's invoice / receipt) ───────────────────────────
create table if not exists expense (
    id                   bigserial primary key,
    user_id              bigint  not null references app_user(id) on delete cascade,
    date                 date    not null,
    -- Free-text supplier, e.g., "Expedia", "Hotel Kaiser", "Booking", "Avion"
    supplier             varchar(255),
    -- Free-text nature of the line item, e.g., "La Planque", "Avion", "Hotel"
    description          varchar(512),
    -- e.g., "QC", "ON" - the province in the screenshot
    province             varchar(8),
    -- Code d'imputation (GL) — manual entry by admin/rep
    imputation_code      varchar(32),
    -- Money values in cents to avoid float rounding errors
    subtotal_cents       bigint,
    tps_cents            bigint,
    tvq_cents            bigint,
    tvh_cents            bigint,
    tip_cents            bigint,
    total_cents          bigint,
    -- Status workflow (mirrors RepTrip approval)
    status               varchar(16) not null default 'PENDING',  -- PENDING | APPROVED | REJECTED
    approved_by_user_id  bigint references app_user(id) on delete set null,
    approved_at          timestamp,
    approval_note        varchar(512),
    -- OCR placeholder: when populated, indicates Tesseract was attempted
    ocr_processed_at     timestamp,
    ocr_raw_text         text,
    notes                text,
    created_at           timestamp not null default now(),
    updated_at           timestamp not null default now()
);

create index if not exists idx_expense_user_id  on expense(user_id);
create index if not exists idx_expense_date     on expense(date);
create index if not exists idx_expense_status   on expense(status);

-- ─── Expense receipt photos (one expense → many photos) ─────────────────────
create table if not exists expense_receipt (
    id              bigserial primary key,
    expense_id      bigint not null references expense(id) on delete cascade,
    -- UUID-based filename stored on disk under uploads/expenses/
    filename        varchar(255) not null,
    content_type    varchar(120),
    -- Original filename for downloads
    original_name   varchar(512),
    file_size       bigint,
    uploaded_at     timestamp not null default now()
);

create index if not exists idx_expense_receipt_expense_id on expense_receipt(expense_id);
