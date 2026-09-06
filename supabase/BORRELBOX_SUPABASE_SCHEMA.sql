create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.borrelbox_dates (
  service_date date primary key,
  status text not null default 'closed'
    check (status in ('available', 'full', 'closed')),
  max_boxes integer not null default 4
    check (max_boxes >= 1 and max_boxes <= 4),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.borrelbox_reservations (
  id uuid primary key default gen_random_uuid(),
  service_date date not null references public.borrelbox_dates(service_date) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  quantity integer not null
    check (quantity >= 1 and quantity <= 4),
  reservation_status text not null default 'active'
    check (reservation_status in ('active', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists borrelbox_dates_set_updated_at on public.borrelbox_dates;
create trigger borrelbox_dates_set_updated_at
before update on public.borrelbox_dates
for each row
execute function public.set_updated_at();

alter table public.borrelbox_dates enable row level security;
alter table public.borrelbox_reservations enable row level security;

revoke all on public.borrelbox_dates from anon, authenticated;
revoke all on public.borrelbox_reservations from anon, authenticated;

create or replace function public.get_borrelbox_dates()
returns table (
  service_date date,
  status text,
  remaining_boxes integer,
  max_boxes integer
)
language sql
security definer
set search_path = public
as $$
  with booked as (
    select
      service_date,
      coalesce(sum(quantity), 0)::integer as total_booked
    from public.borrelbox_reservations
    where reservation_status = 'active'
    group by service_date
  )
  select
    d.service_date,
    case
      when d.service_date < current_date then 'closed'
      when d.status = 'closed' then 'closed'
      when d.status = 'full' then 'full'
      when coalesce(b.total_booked, 0) >= d.max_boxes then 'full'
      else 'available'
    end as status,
    greatest(d.max_boxes - coalesce(b.total_booked, 0), 0)::integer as remaining_boxes,
    d.max_boxes
  from public.borrelbox_dates d
  left join booked b on b.service_date = d.service_date
  order by d.service_date asc;
$$;

create or replace function public.create_borrelbox_reservation(
  p_service_date date,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date public.borrelbox_dates%rowtype;
  v_booked integer;
  v_remaining integer;
  v_reservation_id uuid;
  v_new_status text;
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 4 then
    raise exception 'Aantal boxen moet tussen 1 en 4 liggen.';
  end if;

  select *
  into v_date
  from public.borrelbox_dates
  where service_date = p_service_date
  for update;

  if not found then
    raise exception 'Deze datum bestaat niet.';
  end if;

  if v_date.status = 'closed' then
    raise exception 'Deze datum is gesloten.';
  end if;

  if v_date.status = 'full' then
    raise exception 'Deze datum is vol.';
  end if;

  select coalesce(sum(quantity), 0)::integer
  into v_booked
  from public.borrelbox_reservations
  where service_date = p_service_date
    and reservation_status = 'active';

  v_remaining := v_date.max_boxes - v_booked;

  if v_remaining <= 0 then
    update public.borrelbox_dates
    set status = 'full'
    where service_date = p_service_date;

    raise exception 'Deze datum is net vol geraakt.';
  end if;

  if p_quantity > v_remaining then
    raise exception 'Er zijn nog maar % box(en) beschikbaar voor deze datum.', v_remaining;
  end if;

  insert into public.borrelbox_reservations (
    service_date,
    customer_name,
    customer_email,
    customer_phone,
    quantity
  )
  values (
    p_service_date,
    trim(p_customer_name),
    lower(trim(p_customer_email)),
    trim(p_customer_phone),
    p_quantity
  )
  returning id into v_reservation_id;

  v_remaining := v_remaining - p_quantity;

  if v_remaining <= 0 then
    update public.borrelbox_dates
    set status = 'full'
    where service_date = p_service_date;

    v_new_status := 'full';
  else
    v_new_status := 'available';
  end if;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_reservation_id,
    'remaining_boxes', v_remaining,
    'status', v_new_status
  );
end;
$$;

grant execute on function public.get_borrelbox_dates() to anon, authenticated;
grant execute on function public.create_borrelbox_reservation(date, text, text, text, integer) to anon, authenticated;

insert into public.borrelbox_dates (service_date, status, max_boxes)
values
  ('2026-09-05', 'available', 4),
  ('2026-09-12', 'closed', 4),
  ('2026-09-19', 'full', 4),
  ('2026-09-26', 'available', 4),
  ('2026-10-03', 'available', 4),
  ('2026-10-04', 'available', 4),
  ('2026-10-11', 'available', 4),
  ('2026-10-17', 'available', 4),
  ('2026-10-18', 'available', 4),
  ('2026-10-24', 'available', 4),
  ('2026-10-31', 'available', 4),
  ('2026-11-07', 'available', 4),
  ('2026-11-22', 'available', 4),
  ('2026-11-29', 'available', 4)
on conflict (service_date) do update
set
  status = excluded.status,
  max_boxes = excluded.max_boxes;
