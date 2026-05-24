
-- Sequence for human-friendly ticket number
create sequence if not exists public.tickets_nro_seq start with 1;

-- Tickets table
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  nro integer not null unique default nextval('public.tickets_nro_seq'),
  solicitante text not null,
  contratante text,
  departamento text,
  celular text,
  poliza text,
  tipo text not null,
  tipo_asistencia text,
  severidad text not null default 'Media',
  registrado_por text not null default 'Addiuva',
  estado text not null default 'Pendiente',
  cerrado_por text not null default '-',
  fecha_creacion timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter sequence public.tickets_nro_seq owned by public.tickets.nro;
create index tickets_fecha_idx on public.tickets (fecha_creacion desc);

-- Ticket notes
create table public.ticket_notes (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  fecha timestamptz not null default now(),
  estado text not null,
  nota text not null default '',
  usuario text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index ticket_notes_ticket_idx on public.ticket_notes (ticket_id, fecha);

-- Attachments (ticket-level OR note-level)
create table public.ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets(id) on delete cascade,
  note_id uuid references public.ticket_notes(id) on delete cascade,
  name text not null,
  mime text not null default 'application/octet-stream',
  storage_path text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  check (ticket_id is not null or note_id is not null)
);
create index ticket_attachments_ticket_idx on public.ticket_attachments (ticket_id);
create index ticket_attachments_note_idx on public.ticket_attachments (note_id);

-- updated_at trigger on tickets
create trigger tickets_touch_updated_at
before update on public.tickets
for each row execute function public.touch_updated_at();

-- Enable RLS
alter table public.tickets enable row level security;
alter table public.ticket_notes enable row level security;
alter table public.ticket_attachments enable row level security;

-- Tickets policies
create policy "Tickets: autenticados leen"
  on public.tickets for select to authenticated using (true);
create policy "Tickets: autenticados crean"
  on public.tickets for insert to authenticated with check (auth.uid() is not null);
create policy "Tickets: autenticados actualizan"
  on public.tickets for update to authenticated using (true) with check (true);
create policy "Tickets: admin elimina"
  on public.tickets for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::public.app_role));

-- Notes policies
create policy "Notes: autenticados leen"
  on public.ticket_notes for select to authenticated using (true);
create policy "Notes: autenticados crean"
  on public.ticket_notes for insert to authenticated with check (auth.uid() is not null);
create policy "Notes: autenticados actualizan"
  on public.ticket_notes for update to authenticated using (true) with check (true);
create policy "Notes: admin elimina"
  on public.ticket_notes for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::public.app_role));

-- Attachments policies
create policy "Attach: autenticados leen"
  on public.ticket_attachments for select to authenticated using (true);
create policy "Attach: autenticados crean"
  on public.ticket_attachments for insert to authenticated with check (auth.uid() is not null);
create policy "Attach: admin elimina"
  on public.ticket_attachments for delete to authenticated
  using (public.has_role(auth.uid(), 'administrador'::public.app_role));

-- Realtime (idempotent: only if publication exists)
do $$
begin
  if exists (select from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.tickets;
    alter publication supabase_realtime add table public.ticket_notes;
    alter publication supabase_realtime add table public.ticket_attachments;
  end if;
end
$$;

-- Storage bucket (private)
insert into storage.buckets (id, name, public) values ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

-- Storage policies
create policy "Ticket files: autenticados leen"
  on storage.objects for select to authenticated
  using (bucket_id = 'ticket-attachments');
create policy "Ticket files: autenticados suben"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-attachments');
create policy "Ticket files: admin elimina"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ticket-attachments' and public.has_role(auth.uid(), 'administrador'::public.app_role));
