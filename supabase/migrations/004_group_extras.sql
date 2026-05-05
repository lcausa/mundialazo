-- Nuevos campos para grupos: reglamento, inscripción, distribución de premios y cierre de pronósticos

alter table public.groups add column if not exists rules text;
alter table public.groups add column if not exists entry_fee_clp integer default 0;
alter table public.groups add column if not exists prize_split jsonb default '{"first": 60, "second": 30, "third": 10}';
alter table public.groups add column if not exists predictions_close_at timestamptz;
