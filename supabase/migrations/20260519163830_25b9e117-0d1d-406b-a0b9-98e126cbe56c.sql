
-- ============ AUDIT LOG ============
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid,
  user_email text,
  action text not null, -- ticket_created | ticket_deleted | ticket_state_changed | note_added | note_deleted | attachment_added | attachment_deleted
  entity text not null, -- ticket | note | attachment
  ticket_id uuid,
  ticket_nro integer,
  details jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_ticket_nro_idx on public.audit_log (ticket_nro);
create index if not exists audit_log_action_idx on public.audit_log (action);

alter table public.audit_log enable row level security;

-- Solo admin o supervisor pueden ver el log
drop policy if exists "Audit: admin y supervisor leen" on public.audit_log;
create policy "Audit: admin y supervisor leen"
  on public.audit_log
  for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    or public.has_role(auth.uid(), 'supervisor'::public.app_role)
  );

-- Nadie inserta directo; sólo vía triggers (SECURITY DEFINER)
-- (no policy for INSERT -> denegado por defecto a usuarios)

-- Helper: obtener email del usuario actual
create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select email from auth.users where id = auth.uid()
$$;

-- ============ TRIGGER: tickets ============
create or replace function public.log_ticket_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.current_user_email();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (user_id, user_email, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, 'ticket_created', 'ticket', new.id, new.nro,
      jsonb_build_object('tipo', new.tipo, 'severidad', new.severidad, 'solicitante', new.solicitante, 'estado', new.estado));
    return new;
  elsif tg_op = 'UPDATE' then
    if new.estado is distinct from old.estado then
      insert into public.audit_log (user_id, user_email, action, entity, ticket_id, ticket_nro, details)
      values (auth.uid(), v_email, 'ticket_state_changed', 'ticket', new.id, new.nro,
        jsonb_build_object('from', old.estado, 'to', new.estado, 'cerrado_por', new.cerrado_por));
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (user_id, user_email, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, 'ticket_deleted', 'ticket', old.id, old.nro,
      jsonb_build_object('tipo', old.tipo, 'estado', old.estado, 'solicitante', old.solicitante));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_tickets_audit on public.tickets;
create trigger trg_tickets_audit
after insert or update or delete on public.tickets
for each row execute function public.log_ticket_changes();

-- ============ TRIGGER: ticket_notes ============
create or replace function public.log_note_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.current_user_email();
  v_nro integer;
begin
  if tg_op = 'INSERT' then
    select nro into v_nro from public.tickets where id = new.ticket_id;
    insert into public.audit_log (user_id, user_email, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, 'note_added', 'note', new.ticket_id, v_nro,
      jsonb_build_object('estado', new.estado, 'nota', left(coalesce(new.nota,''), 240)));
    return new;
  elsif tg_op = 'DELETE' then
    select nro into v_nro from public.tickets where id = old.ticket_id;
    insert into public.audit_log (user_id, user_email, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, 'note_deleted', 'note', old.ticket_id, v_nro,
      jsonb_build_object('estado', old.estado));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_notes_audit on public.ticket_notes;
create trigger trg_notes_audit
after insert or delete on public.ticket_notes
for each row execute function public.log_note_changes();

-- ============ TRIGGER: ticket_attachments ============
create or replace function public.log_attachment_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := public.current_user_email();
  v_nro integer;
  v_tid uuid;
begin
  if tg_op = 'INSERT' then
    v_tid := new.ticket_id;
    if v_tid is not null then
      select nro into v_nro from public.tickets where id = v_tid;
    end if;
    insert into public.audit_log (user_id, user_email, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, 'attachment_added', 'attachment', v_tid, v_nro,
      jsonb_build_object('name', new.name, 'mime', new.mime));
    return new;
  elsif tg_op = 'DELETE' then
    v_tid := old.ticket_id;
    if v_tid is not null then
      select nro into v_nro from public.tickets where id = v_tid;
    end if;
    insert into public.audit_log (user_id, user_email, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, 'attachment_deleted', 'attachment', v_tid, v_nro,
      jsonb_build_object('name', old.name));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_attachments_audit on public.ticket_attachments;
create trigger trg_attachments_audit
after insert or delete on public.ticket_attachments
for each row execute function public.log_attachment_changes();
