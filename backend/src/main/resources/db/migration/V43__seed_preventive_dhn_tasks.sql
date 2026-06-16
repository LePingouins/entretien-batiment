-- ─── Preventive Maintenance update: task seed data ─────────────────────────

INSERT INTO preventive_task (name, frequency, site, display_order) VALUES
    ('Changer filtres ventilation', 'QUARTERLY', 'INEWA', 33),
    ('Transpalette x16',                'YEARLY',     'HORIZON_NATURE', 1),
    ('Chariot élévateur x4',            'YEARLY',     'HORIZON_NATURE', 2),
    ('Porte de garage x8',              'YEARLY',     'HORIZON_NATURE', 3),
    ('Zamboni',                         'YEARLY',     'HORIZON_NATURE', 4),
    ('Avalanche (emballage)',           'YEARLY',     'HORIZON_NATURE', 5),
    ('Scelleuse 1 (emballage)',         'YEARLY',     'HORIZON_NATURE', 6),
    ('Scelleuse 2 (emballage)',         'YEARLY',     'HORIZON_NATURE', 7),
    ('Changer filtres ventilation',     'QUARTERLY',  'HORIZON_NATURE', 8),
    ('Mettre de l’eau dans les batteries des chariots élévateur', 'WEEKLY', 'HORIZON_NATURE', 9);