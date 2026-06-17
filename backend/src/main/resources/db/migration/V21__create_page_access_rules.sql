create table if not exists role_page_access (
    id bigserial primary key,
    page_key varchar(64) not null,
    role varchar(20) not null,
    allowed boolean not null default false,
    constraint uq_role_page_access unique (page_key, role)
);

create table if not exists user_page_access_override (
    id bigserial primary key,
    user_id bigint not null references app_user(id) on delete cascade,
    page_key varchar(64) not null,
    allowed boolean not null,
    constraint uq_user_page_access_override unique (user_id, page_key)
);

create index if not exists idx_user_page_access_override_user_id on user_page_access_override(user_id);

insert into role_page_access (page_key, role, allowed) values
    ('DASHBOARD', 'ADMIN', true),
    ('WORK_ORDERS', 'ADMIN', true),
    ('URGENT_WORK_ORDERS', 'ADMIN', true),
    ('MILEAGE', 'ADMIN', true),
    ('ARCHIVE', 'ADMIN', true),
    ('ANALYTICS', 'ADMIN', true),
    ('USERS', 'ADMIN', true),
    ('NOTIFICATIONS', 'ADMIN', true),

    ('DASHBOARD', 'TECH', true),
    ('WORK_ORDERS', 'TECH', true),
    ('URGENT_WORK_ORDERS', 'TECH', true),
    ('MILEAGE', 'TECH', true),
    ('ARCHIVE', 'TECH', false),
    ('ANALYTICS', 'TECH', false),
    ('USERS', 'TECH', false),
    ('NOTIFICATIONS', 'TECH', true),

    ('DASHBOARD', 'WORKER', true),
    ('WORK_ORDERS', 'WORKER', true),
    ('URGENT_WORK_ORDERS', 'WORKER', true),
    ('MILEAGE', 'WORKER', true),
    ('ARCHIVE', 'WORKER', false),
    ('ANALYTICS', 'WORKER', false),
    ('USERS', 'WORKER', false),
    ('NOTIFICATIONS', 'WORKER', true)
on conflict (page_key, role) do nothing;
