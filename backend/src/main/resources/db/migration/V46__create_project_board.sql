-- Project Board: exclusive Kanban board for the MANAGER role (same 5 statuses as work orders).
CREATE TABLE project_board_task (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    priority VARCHAR(20),
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    created_by_user_id BIGINT,
    assigned_to_user_id BIGINT,
    requested_date TIMESTAMP,
    due_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP,
    attachment_filename VARCHAR(255),
    attachment_content_type VARCHAR(255),
    attachment_download_url VARCHAR(255),
    invoice_filename VARCHAR(255),
    invoice_content_type VARCHAR(100),
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMP,
    sort_index INTEGER
);
