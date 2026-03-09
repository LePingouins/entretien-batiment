create table if not exists debug_error_log (
    id bigserial primary key,
    fingerprint varchar(128) not null,
    exception_type varchar(255) not null,
    error_message text,
    context text,
    method_name varchar(255),
    stack_trace text,
    request_method varchar(16),
    request_path varchar(1024),
    status_code integer,
    occurred_at timestamptz not null default now()
);

create index if not exists idx_debug_error_log_fingerprint on debug_error_log(fingerprint);
create index if not exists idx_debug_error_log_occurred_at on debug_error_log(occurred_at);
