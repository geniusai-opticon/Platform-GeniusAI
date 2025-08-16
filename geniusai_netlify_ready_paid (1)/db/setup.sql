
create table if not exists public.registrations (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null unique,
  interest text,
  spending text,
  referral text,
  paid boolean default false,
  paid_at timestamptz,
  oauth_provider text,
  oauth_id text,
  created_at timestamptz default now()
);

-- Ensure unique constraint (if table existed without it)
do $$ begin
  if not exists (select 1 from pg_indexes where schemaname='public' and tablename='registrations' and indexname='registrations_email_key') then
    alter table public.registrations add constraint registrations_email_key unique (email);
  end if;
end $$;
