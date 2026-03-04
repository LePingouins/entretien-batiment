create table if not exists notification_recipient_rule (
    id bigserial primary key,
    source varchar(100) not null,
    role varchar(20) not null,
    enabled boolean not null default true,
    constraint uq_notification_recipient_rule unique (source, role)
);
