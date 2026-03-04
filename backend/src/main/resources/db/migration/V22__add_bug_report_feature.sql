CREATE TABLE bug_report_feature (
    id BIGSERIAL PRIMARY KEY,
    reporter_user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMPTZ,
    confirmed_by_user_id BIGINT REFERENCES app_user(id) ON DELETE SET NULL
);

CREATE INDEX idx_bug_report_feature_reporter_created ON bug_report_feature(reporter_user_id, created_at DESC);
CREATE INDEX idx_bug_report_feature_confirmed_at ON bug_report_feature(confirmed_at);

ALTER TABLE notification
    ADD COLUMN bug_report_id BIGINT;

ALTER TABLE notification
    ADD CONSTRAINT fk_notification_bug_report
    FOREIGN KEY (bug_report_id) REFERENCES bug_report_feature(id) ON DELETE SET NULL;

CREATE INDEX idx_notification_bug_report ON notification(bug_report_id);
