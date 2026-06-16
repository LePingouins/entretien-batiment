-- ─── Preventive Maintenance update: correct twice-yearly cadence ────────────

UPDATE preventive_task
SET frequency = 'SEMI_ANNUAL'
WHERE site = 'HORIZON_NATURE'
  AND name IN (
    'Transpalette x16',
    'Zamboni',
    'Scelleuse 1 (emballage)',
    'Scelleuse 2 (emballage)'
  );

UPDATE preventive_task
SET frequency = 'QUARTERLY'
WHERE site = 'INEWA'
  AND name = 'Changer filtres ventilation';