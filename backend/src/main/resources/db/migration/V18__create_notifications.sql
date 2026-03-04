CREATE TABLE notification (
    id VARCHAR(36) PRIMARY KEY,
    target_user_id BIGINT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    href VARCHAR(255),
    source VARCHAR(50),
    FOREIGN KEY (target_user_id) REFERENCES app_user(id) ON DELETE CASCADE
);

CREATE INDEX idx_notification_user ON notification(target_user_id);
