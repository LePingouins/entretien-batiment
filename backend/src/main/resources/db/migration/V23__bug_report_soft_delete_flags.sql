ALTER TABLE bug_report_feature
    ADD COLUMN reporter_deleted_at TIMESTAMPTZ,
    ADD COLUMN admin_deleted_at TIMESTAMPTZ;

CREATE INDEX idx_bug_report_feature_reporter_deleted_at ON bug_report_feature(reporter_deleted_at);
CREATE INDEX idx_bug_report_feature_admin_deleted_at ON bug_report_feature(admin_deleted_at);
