-- V30: Audit Trail / Developer Insights
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY,
    user_id         BIGINT,
    user_email      VARCHAR(255),
    user_role       VARCHAR(50),
    action          VARCHAR(100) NOT NULL,
    entity_type     VARCHAR(100),
    entity_id       BIGINT,
    entity_title    VARCHAR(255),
    details         TEXT,
    ip_address      VARCHAR(45),
    occurred_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id     ON audit_logs(user_id);
CREATE INDEX idx_audit_occurred_at ON audit_logs(occurred_at);
CREATE INDEX idx_audit_action      ON audit_logs(action);
