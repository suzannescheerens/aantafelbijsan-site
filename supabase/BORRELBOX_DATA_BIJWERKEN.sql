-- Gebruik dit bestand om later nieuwe data open te zetten.
-- Pas alleen de datums en status aan.

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

update public.borrelbox_dates
set status = 'closed'
where service_date >= '2026-06-01'
  and service_date < '2026-09-01';

-- Voorbeelden:
-- available = bezoekers kunnen reserveren
-- full      = handmatig op vol zetten
-- closed    = datum staat wel in de lijst, maar is gesloten

-- Wil je een datum helemaal verwijderen? Gebruik dan:
-- delete from public.borrelbox_dates where service_date = '2026-09-19';
