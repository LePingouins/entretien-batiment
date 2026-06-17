insert into role_page_access (page_key, role, allowed) values
    ('PREVENTIVE_MAINTENANCE', 'ADMIN',         true),
    ('PREVENTIVE_MAINTENANCE', 'DEVELOPPER',    true),
    ('PREVENTIVE_MAINTENANCE', 'TECH',          true),
    ('PREVENTIVE_MAINTENANCE', 'WORKER',        false),
    ('PREVENTIVE_MAINTENANCE', 'REPRESENTANT',  false)
on conflict (page_key, role) do nothing;
