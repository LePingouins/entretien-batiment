-- V1: Initial schema (users + refresh tokens)

create table if not exists app_user (
                                        id bigserial primary key,
                                        email varchar(255) not null unique,
    password_hash varchar(255) not null,
    role varchar(20) not null, -- ADMIN or TECH
    enabled boolean not null default true,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
    );

create table if not exists refresh_token (
                                             id bigserial primary key,
                                             user_id bigint not null references app_user(id) on delete cascade,
    token_hash varchar(255) not null unique,
    expires_at timestamp not null,
    revoked boolean not null default false,
    created_at timestamp not null default now()
    );

create index if not exists idx_refresh_token_user_id on refresh_token(user_id);
create index if not exists idx_refresh_token_expires_at on refresh_token(expires_at);
