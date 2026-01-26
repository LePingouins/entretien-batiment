-- V11: Urgent Work Order Materials

create table if not exists urgent_work_order_material (
    id bigserial primary key,
    urgent_work_order_id bigint not null references urgent_work_order(id) on delete cascade,
    name varchar(255) not null,
    quantity integer,
    url varchar(255),
    description text,
    supplier varchar(255),
    bought boolean not null default false,
    created_at timestamp not null default now()
);

create index if not exists idx_urgent_work_order_material_urgent_work_order_id on urgent_work_order_material(urgent_work_order_id);
