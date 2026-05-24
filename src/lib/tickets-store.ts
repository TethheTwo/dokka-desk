import { supabase } from "@/integrations/supabase/client";

export type Severidad = "Alta" | "Media" | "Baja";
export type Estado =
  | "Pendiente"
  | "En atención"
  | "Esperando Respuesta"
  | "Cliente no responde"
  | "Actualizado"
  | "Cerrado";
export type Tipo =
  | "Derivación Addiuva a Conecta"
  | "Derivado a Conecta"
  | "Asistencia Automotor"
  | "Asistencia Mascotas"
  | "Asistencia Bici"
  | "Asistencia Hogar"
  | "Asistencia Dental";

export interface TicketAttachment {
  id: string;
  name: string;
  type: string;
  storage_path: string;
}

export interface TicketNote {
  id: string;
  fecha: string;
  estado: Estado;
  nota: string;
  usuario: string;
  attachments: TicketAttachment[];
}

export interface Ticket {
  id: string;
  nro: number;
  solicitante: string;
  contratante?: string;
  departamento?: string;
  celular?: string;
  poliza?: string;
  tipo: Tipo;
  tipoAsistencia?: string;
  severidad: Severidad;
  registradoPor: string;
  estado: Estado;
  cerradoPor: string;
  fechaCreacion: string;
  attachments: TicketAttachment[];
  notes: TicketNote[];
}

const BUCKET = "ticket-attachments";

let tickets: Ticket[] = [];
const listeners = new Set<() => void>();
let initialized = false;
let refetchTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((fn) => fn());
}

function scheduleRefetch() {
  if (refetchTimer) clearTimeout(refetchTimer);
  refetchTimer = setTimeout(() => {
    refetchTimer = null;
    void fetchAll();
  }, 150);
}

async function fetchAll() {
  const [{ data: tRows }, { data: nRows }, { data: aRows }] = await Promise.all([
    supabase.from("tickets").select("*").order("fecha_creacion", { ascending: false }),
    supabase.from("ticket_notes").select("*").order("fecha", { ascending: true }),
    supabase.from("ticket_attachments").select("*"),
  ]);

  const attByTicket = new Map<string, TicketAttachment[]>();
  const attByNote = new Map<string, TicketAttachment[]>();
  for (const r of (aRows ?? []) as any[]) {
    const att: TicketAttachment = {
      id: r.id,
      name: r.name,
      type: r.mime,
      storage_path: r.storage_path,
    };
    if (r.note_id) {
      const arr = attByNote.get(r.note_id) ?? [];
      arr.push(att);
      attByNote.set(r.note_id, arr);
    } else if (r.ticket_id) {
      const arr = attByTicket.get(r.ticket_id) ?? [];
      arr.push(att);
      attByTicket.set(r.ticket_id, arr);
    }
  }

  const notesByTicket = new Map<string, TicketNote[]>();
  for (const r of (nRows ?? []) as any[]) {
    const note: TicketNote = {
      id: r.id,
      fecha: r.fecha,
      estado: r.estado as Estado,
      nota: r.nota,
      usuario: r.usuario,
      attachments: attByNote.get(r.id) ?? [],
    };
    const arr = notesByTicket.get(r.ticket_id) ?? [];
    arr.push(note);
    notesByTicket.set(r.ticket_id, arr);
  }

  tickets = ((tRows ?? []) as any[]).map((r) => ({
    id: r.id,
    nro: r.nro,
    solicitante: r.solicitante,
    contratante: r.contratante ?? undefined,
    departamento: r.departamento ?? undefined,
    celular: r.celular ?? undefined,
    poliza: r.poliza ?? undefined,
    tipo: r.tipo as Tipo,
    tipoAsistencia: r.tipo_asistencia ?? undefined,
    severidad: r.severidad as Severidad,
    registradoPor: r.registrado_por,
    estado: r.estado as Estado,
    cerradoPor: r.cerrado_por,
    fechaCreacion: r.fecha_creacion,
    attachments: attByTicket.get(r.id) ?? [],
    notes: notesByTicket.get(r.id) ?? [],
  }));
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  void fetchAll();
  supabase
    .channel("tickets-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, scheduleRefetch)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ticket_notes" },
      scheduleRefetch,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ticket_attachments" },
      scheduleRefetch,
    )
    .subscribe();
}

export function getTickets(): Ticket[] {
  return tickets;
}

export function subscribeTickets(fn: () => void): () => void {
  ensureInit();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

async function uploadFiles(files: File[], ticketId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  const out: { name: string; mime: string; storage_path: string }[] = [];
  for (const f of files) {
    const safeName = f.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${ticketId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, {
      contentType: f.type || "application/octet-stream",
      upsert: false,
    });
    if (error) throw error;
    out.push({ name: f.name, mime: f.type || "application/octet-stream", storage_path: path });
  }
  return out;
}

export async function addTicket(input: {
  solicitante: string;
  contratante?: string;
  departamento?: string;
  celular?: string;
  poliza?: string;
  tipo: Tipo;
  tipoAsistencia?: string;
  severidad?: Severidad;
  registradoPor?: string;
  attachments?: File[];
}): Promise<{ id: string; nro: number; fechaCreacion: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      solicitante: input.solicitante,
      contratante: input.contratante ?? null,
      departamento: input.departamento ?? null,
      celular: input.celular ?? null,
      poliza: input.poliza ?? null,
      tipo: input.tipo,
      tipo_asistencia: input.tipoAsistencia ?? null,
      severidad: input.severidad ?? "Media",
      registrado_por: input.registradoPor ?? "Addiuva",
      estado: "Pendiente",
      cerrado_por: "-",
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error || !data) {
    console.error("addTicket", error);
    return null;
  }
  if (input.attachments?.length) {
    try {
      const uploaded = await uploadFiles(input.attachments, data.id);
      await supabase.from("ticket_attachments").insert(
        uploaded.map((u) => ({
          ticket_id: data.id,
          name: u.name,
          mime: u.mime,
          storage_path: u.storage_path,
          created_by: user?.id ?? null,
        })),
      );
    } catch (e) {
      console.error("addTicket attachments", e);
    }
  }
  scheduleRefetch();
  return { id: data.id, nro: data.nro, fechaCreacion: data.fecha_creacion };
}

export async function removeTicket(nro: number): Promise<boolean> {
  const t = tickets.find((x) => x.nro === nro);
  if (!t || t.estado === "Cerrado") return false;
  const { error } = await supabase.from("tickets").delete().eq("id", t.id);
  if (error) {
    console.error("removeTicket", error);
    return false;
  }
  scheduleRefetch();
  return true;
}

export async function updateTicketEstado(nro: number, estado: Estado, usuario?: string) {
  const t = tickets.find((x) => x.nro === nro);
  if (!t) return;
  await supabase
    .from("tickets")
    .update({
      estado,
      cerrado_por: estado === "Cerrado" ? (usuario ?? t.cerradoPor) : "-",
    })
    .eq("id", t.id);
  scheduleRefetch();
}

export async function addTicketNote(
  nro: number,
  note: { estado: Estado; nota: string; usuario: string; attachments?: File[]; fecha?: string },
): Promise<{ id: string } | null> {
  const t = tickets.find((x) => x.nro === nro);
  if (!t) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("ticket_notes")
    .insert({
      ticket_id: t.id,
      fecha: note.fecha ?? new Date().toISOString(),
      estado: note.estado,
      nota: note.nota,
      usuario: note.usuario,
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error || !data) {
    console.error("addTicketNote", error);
    return null;
  }
  if (note.attachments?.length) {
    try {
      const uploaded = await uploadFiles(note.attachments, t.id);
      await supabase.from("ticket_attachments").insert(
        uploaded.map((u) => ({
          ticket_id: t.id,
          note_id: data.id,
          name: u.name,
          mime: u.mime,
          storage_path: u.storage_path,
          created_by: user?.id ?? null,
        })),
      );
    } catch (e) {
      console.error("addTicketNote attachments", e);
    }
  }
  await supabase
    .from("tickets")
    .update({
      estado: note.estado,
      cerrado_por: note.estado === "Cerrado" ? note.usuario : "-",
    })
    .eq("id", t.id);
  scheduleRefetch();
  return { id: data.id };
}

// Backward-compat: previously converted File -> base64 attachment.
// Now we pass File objects directly to addTicket / addTicketNote.
export function fileToAttachment(file: File): File {
  return file;
}

export async function openAttachment(a: TicketAttachment) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(a.storage_path, 60);
  if (error || !data) {
    console.error("openAttachment", error);
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
