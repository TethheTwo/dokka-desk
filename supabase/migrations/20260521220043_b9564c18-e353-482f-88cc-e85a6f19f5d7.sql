
-- 1. Tabla de contadores globales por prefijo
CREATE TABLE IF NOT EXISTS public.app_counters (
  prefix text PRIMARY KEY,
  value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "counters_read_all" ON public.app_counters FOR SELECT TO authenticated USING (true);

-- Inicializar contadores con el MAX existente
INSERT INTO public.app_counters(prefix, value) VALUES
  ('TK', COALESCE((SELECT MAX(nro) FROM public.tickets), 0)),
  ('CG', COALESCE((SELECT MAX(nro) FROM public.reportes_cg), 0)),
  ('AP', COALESCE((SELECT MAX(nro) FROM public.reportes_ap), 0))
ON CONFLICT (prefix) DO NOTHING;

-- Función atómica para obtener el siguiente número
CREATE OR REPLACE FUNCTION public.next_code(_prefix text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v integer;
BEGIN
  INSERT INTO public.app_counters(prefix, value) VALUES (_prefix, 0)
    ON CONFLICT (prefix) DO NOTHING;
  UPDATE public.app_counters
     SET value = value + 1, updated_at = now()
   WHERE prefix = _prefix
  RETURNING value INTO v;
  RETURN v;
END $$;

-- 2. Columna username en audit_log
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS username text;

-- Backfill
UPDATE public.audit_log a
   SET username = p.username
  FROM public.profiles p
 WHERE p.email = a.user_email
   AND a.username IS NULL;

-- Helper para obtener username del usuario actual
CREATE OR REPLACE FUNCTION public.current_user_username()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT username FROM public.profiles WHERE id = auth.uid()
$$;

-- 3. Actualizar funciones de log existentes para incluir username
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_email text := public.current_user_email();
  v_user text := public.current_user_username();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (user_id, user_email, username, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, v_user, 'ticket_created', 'ticket', new.id, new.nro,
      jsonb_build_object('tipo', new.tipo, 'severidad', new.severidad, 'solicitante', new.solicitante, 'estado', new.estado));
    return new;
  elsif tg_op = 'UPDATE' then
    if new.estado is distinct from old.estado then
      insert into public.audit_log (user_id, user_email, username, action, entity, ticket_id, ticket_nro, details)
      values (auth.uid(), v_email, v_user, 'ticket_state_changed', 'ticket', new.id, new.nro,
        jsonb_build_object('from', old.estado, 'to', new.estado, 'cerrado_por', new.cerrado_por));
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (user_id, user_email, username, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, v_user, 'ticket_deleted', 'ticket', old.id, old.nro,
      jsonb_build_object('tipo', old.tipo, 'estado', old.estado, 'solicitante', old.solicitante));
    return old;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.log_note_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_email text := public.current_user_email();
  v_user text := public.current_user_username();
  v_nro integer;
begin
  if tg_op = 'INSERT' then
    select nro into v_nro from public.tickets where id = new.ticket_id;
    insert into public.audit_log (user_id, user_email, username, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, v_user, 'note_added', 'note', new.ticket_id, v_nro,
      jsonb_build_object('estado', new.estado, 'nota', left(coalesce(new.nota,''), 240)));
    return new;
  elsif tg_op = 'DELETE' then
    select nro into v_nro from public.tickets where id = old.ticket_id;
    insert into public.audit_log (user_id, user_email, username, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, v_user, 'note_deleted', 'note', old.ticket_id, v_nro,
      jsonb_build_object('estado', old.estado));
    return old;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.log_attachment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_email text := public.current_user_email();
  v_user text := public.current_user_username();
  v_nro integer;
  v_tid uuid;
begin
  if tg_op = 'INSERT' then
    v_tid := new.ticket_id;
    if v_tid is not null then
      select nro into v_nro from public.tickets where id = v_tid;
    end if;
    insert into public.audit_log (user_id, user_email, username, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, v_user, 'attachment_added', 'attachment', v_tid, v_nro,
      jsonb_build_object('name', new.name, 'mime', new.mime));
    return new;
  elsif tg_op = 'DELETE' then
    v_tid := old.ticket_id;
    if v_tid is not null then
      select nro into v_nro from public.tickets where id = v_tid;
    end if;
    insert into public.audit_log (user_id, user_email, username, action, entity, ticket_id, ticket_nro, details)
    values (auth.uid(), v_email, v_user, 'attachment_deleted', 'attachment', v_tid, v_nro,
      jsonb_build_object('name', old.name));
    return old;
  end if;
  return null;
end;
$function$;

-- 4. Función y triggers para reportes CG y AP
CREATE OR REPLACE FUNCTION public.log_report_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_email text := public.current_user_email();
  v_user text := public.current_user_username();
  v_entity text := TG_ARGV[0];
  v_action_prefix text;
begin
  v_action_prefix := case when v_entity = 'reporte_cg' then 'cg' else 'ap' end;

  if tg_op = 'INSERT' then
    insert into public.audit_log (user_id, user_email, username, action, entity, ticket_nro, details)
    values (auth.uid(), v_email, v_user, v_action_prefix || '_created', v_entity, new.nro,
      jsonb_build_object('solicitante', new.solicitante, 'colaborador', new.colaborador));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (user_id, user_email, username, action, entity, ticket_nro, details)
    values (auth.uid(), v_email, v_user, v_action_prefix || '_updated', v_entity, new.nro,
      jsonb_build_object('solicitante', new.solicitante));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (user_id, user_email, username, action, entity, ticket_nro, details)
    values (auth.uid(), v_email, v_user, v_action_prefix || '_deleted', v_entity, old.nro,
      jsonb_build_object('solicitante', old.solicitante));
    return old;
  end if;
  return null;
end;
$function$;

DROP TRIGGER IF EXISTS trg_audit_reportes_cg ON public.reportes_cg;
CREATE TRIGGER trg_audit_reportes_cg
AFTER INSERT OR UPDATE OR DELETE ON public.reportes_cg
FOR EACH ROW EXECUTE FUNCTION public.log_report_changes('reporte_cg');

DROP TRIGGER IF EXISTS trg_audit_reportes_ap ON public.reportes_ap;
CREATE TRIGGER trg_audit_reportes_ap
AFTER INSERT OR UPDATE OR DELETE ON public.reportes_ap
FOR EACH ROW EXECUTE FUNCTION public.log_report_changes('reporte_ap');

-- Asegurar que triggers de tickets/notes/attachments existan
DROP TRIGGER IF EXISTS trg_audit_tickets ON public.tickets;
CREATE TRIGGER trg_audit_tickets
AFTER INSERT OR UPDATE OR DELETE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.log_ticket_changes();

DROP TRIGGER IF EXISTS trg_audit_notes ON public.ticket_notes;
CREATE TRIGGER trg_audit_notes
AFTER INSERT OR DELETE ON public.ticket_notes
FOR EACH ROW EXECUTE FUNCTION public.log_note_changes();

DROP TRIGGER IF EXISTS trg_audit_attachments ON public.ticket_attachments;
CREATE TRIGGER trg_audit_attachments
AFTER INSERT OR DELETE ON public.ticket_attachments
FOR EACH ROW EXECUTE FUNCTION public.log_attachment_changes();
