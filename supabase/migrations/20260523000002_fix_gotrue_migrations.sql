
-- Fix GoTrue migrations:
-- 1. Skip broken migration 20221208132122 (id = user_id::text fails, uuid vs text)
-- 2. Add missing columns aud and role to auth.users (00_initial_setup.sql already has them)

-- schema_migrations must exist before GoTrue's own migration creates it
-- so we can tell it to skip the broken migration
create table if not exists auth.schema_migrations (
  version varchar(255) primary key
);

insert into auth.schema_migrations (version)
values ('20221208132122')
on conflict (version) do nothing;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'aud'
  ) then
    alter table auth.users add column aud varchar(255);
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'role'
  ) then
    alter table auth.users add column "role" varchar(255);
  end if;
end
$$;

-- Grant permissions to roles used by PostgREST
-- - 'authenticated': used for user Bearer tokens (GoTrue JWT has role='authenticated')
-- - 'service_role': used by supabaseAdmin (service role key) for server functions
-- RLS policies on each table control actual row-level access.

-- service_role needs BYPASSRLS so supabaseAdmin can bypass RLS
alter role service_role bypassrls;

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant all on all functions in schema public to authenticated;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;
