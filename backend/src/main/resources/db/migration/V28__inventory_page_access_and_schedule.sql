-- Seed inventory page access rules (admin only by default)
insert into role_page_access (page_key, role, allowed) values
    ('INVENTORY',          'ADMIN',  true),
    ('INVENTORY',          'TECH',   false),
    ('INVENTORY',          'WORKER', false),
    ('INVENTORY_PRODUCTS', 'ADMIN',  true),
    ('INVENTORY_PRODUCTS', 'TECH',   false),
    ('INVENTORY_PRODUCTS', 'WORKER', false)
on conflict (page_key, role) do nothing;

-- Add optional scheduling columns to existing user overrides
alter table user_page_access_override
    add column if not exists valid_from  timestamptz,
    add column if not exists valid_until timestamptz;
