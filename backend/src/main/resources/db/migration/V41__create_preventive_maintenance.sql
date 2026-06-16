-- ─── Preventive Maintenance ──────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE task_frequency AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'SEMI_ANNUAL', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_site AS ENUM ('INEWA', 'HORIZON_NATURE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE preventive_task (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(200) NOT NULL,
    frequency     task_frequency NOT NULL DEFAULT 'YEARLY',
    site          task_site NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE preventive_task_completion (
    id                    BIGSERIAL PRIMARY KEY,
    task_id               BIGINT NOT NULL REFERENCES preventive_task(id) ON DELETE CASCADE,
    completed_by_user_id  BIGINT REFERENCES app_user(id) ON DELETE SET NULL,
    completed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes                 TEXT
);

CREATE INDEX idx_ptc_task_id       ON preventive_task_completion(task_id);
CREATE INDEX idx_ptc_task_date     ON preventive_task_completion(task_id, completed_at DESC);

-- ─── Seed INEWA tasks ────────────────────────────────────────────────────────
INSERT INTO preventive_task (name, frequency, site, display_order) VALUES
    ('Transpalette x2',                   'YEARLY',      'INEWA',  1),
    ('Chariot élévateur',                 'YEARLY',      'INEWA',  2),
    ('Porte de garage x2',                'YEARLY',      'INEWA',  3),
    ('Pétrin x4',                         'YEARLY',      'INEWA',  4),
    ('Diviseuse automatique à pression',  'YEARLY',      'INEWA',  5),
    ('Machine à bagel',                   'YEARLY',      'INEWA',  6),
    ('Diviseuse manuelle',                'YEARLY',      'INEWA',  7),
    ('Balancelle',                        'YEARLY',      'INEWA',  8),
    ('Four x4',                           'YEARLY',      'INEWA',  9),
    ('Étuve',                             'YEARLY',      'INEWA', 10),
    ('Trancheuse à pain',                 'MONTHLY',     'INEWA', 11),
    ('Mélangeur zone SG',                 'YEARLY',      'INEWA', 12),
    ('Four zone SG',                      'YEARLY',      'INEWA', 13),
    ('Trancheuse zone SG',                'SEMI_ANNUAL', 'INEWA', 14),
    ('Convoyeur trancheuse',              'YEARLY',      'INEWA', 15),
    ('Convoyeur étiquetage',              'YEARLY',      'INEWA', 16),
    ('Chariots de four',                  'YEARLY',      'INEWA', 17),
    ('Chariots à pains',                  'YEARLY',      'INEWA', 18),
    ('Changer courroie (Étiquetage)',     'YEARLY',      'INEWA', 19),
    ('Changer courroie (Petit convoyeur)','YEARLY',      'INEWA', 20),
    ('Fans zone de refroidissement',      'YEARLY',      'INEWA', 21),
    ('Compresseur x2',                    'YEARLY',      'INEWA', 22),
    ('Machine à pression',                'YEARLY',      'INEWA', 23),
    ('Grille sur le toit',                'YEARLY',      'INEWA', 24),
    ('Drains (vis en bon état)',          'YEARLY',      'INEWA', 25),
    ('Lumières Zone production',          'YEARLY',      'INEWA', 26),
    ('Lumières Zone SG',                  'YEARLY',      'INEWA', 27),
    ('Lumières Zone cuisson',             'YEARLY',      'INEWA', 28),
    ('Lumières Zone emballage',           'YEARLY',      'INEWA', 29),
    ('Lumières Zone entrepôt',            'YEARLY',      'INEWA', 30),
    ('Lumières Cuisine + bureau',         'YEARLY',      'INEWA', 31),
    ('Lumières Toilettes + vestiaires',   'YEARLY',      'INEWA', 32);
