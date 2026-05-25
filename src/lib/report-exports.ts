import { format } from "date-fns";
import type { Ticket } from "@/lib/tickets-store";

const loadJsPDF = async () => {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { jsPDF, autoTable: (autoTableMod as any).default ?? autoTableMod };
};
type JsPDFInstance = InstanceType<Awaited<ReturnType<typeof loadJsPDF>>["jsPDF"]>;

const BRAND: [number, number, number] = [47, 127, 214];

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

export function rangeToday(): DateRange {
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { from, to, label: "dia-actual" };
}

export function rangeYesterday(): DateRange {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { from, to, label: "dia-anterior" };
}

export function rangeCustom(fromISO: string, toISO: string): DateRange {
  const f = new Date(fromISO + "T00:00:00");
  const t = new Date(toISO + "T23:59:59");
  return { from: f, to: t, label: `${fromISO}_a_${toISO}` };
}

export function inRange(iso: string | null | undefined, r: DateRange): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d >= r.from && d <= r.to;
}

function fileSuffix(range: DateRange): string {
  const d = format(range.from, "yyyy-MM-dd");
  if (!range.label || range.label === "dia-actual" || range.label === "dia-anterior") return d;
  return range.label;
}

/* -------------------- Estilos compartidos -------------------- */

const STYLES = {
  brand: "2F7FD6",
  brand_dark: "1F5A99",
  white: "FFFFFF",
  text: "1E293B",
  text_muted: "64748B",
  bg_light: "F8FAFC",
  bg_gray: "F1F5F9",
  border: "CBD5E1",
  green: "16A34A",
  red: "DC2626",
  amber: "D97706",
};

/* -------------------- Server-side Excel export -------------------- */

interface ExportSheet {
  name: string;
  title?: string;
  metadata?: string;
  metadata2?: string;
  headers?: string[];
  rows?: (string | number | null)[][];
  col_widths?: number[];
  blocks?: ExportBlock[];
  has_title_row?: boolean;
  has_meta_row?: boolean;
  header_row?: number;
  data_start_row?: number;
  header_row_height?: number;
  data_row_height?: number;
}

interface ExportBlock {
  type: "blank" | "section" | "table";
  title?: string;
  height?: number;
  headers?: string[];
  rows?: (string | number | null)[][];
}

interface ExportChart {
  type: "bar" | "line" | "pie";
  title: string;
  sheet: string;
  data: { min_col: number; min_row: number; max_col: number; max_row: number };
  cats: { min_col: number; min_row: number; max_col: number; max_row: number };
  position: { col: number; row: number };
  color: string;
  y_title?: string;
  x_title?: string;
  series_name?: string;
  width?: number;
  height?: number;
  show_labels?: boolean;
}

interface ExportPayload {
  filename: string;
  sheets: ExportSheet[];
  charts?: ExportChart[];
  creator?: string;
  styles: typeof STYLES;
}

async function exportViaServer(payload: ExportPayload): Promise<void> {
  const res = await fetch("/api/export/excel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `Server error: ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = payload.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ==================== TICKETS (listado) ==================== */

const TICKET_HEADERS = [
  "Nro",
  "Fecha de creación",
  "Solicitante",
  "Contratante",
  "Departamento",
  "Celular",
  "Póliza",
  "Tipo",
  "Tipo de asistencia",
  "Prioridad",
  "Estado",
  "Registrado por",
  "Cerrado por",
  "Fecha de cierre",
  "Notas (#)",
  "Notas (texto)",
  "Adjuntos",
];

const TICKET_COL_WIDTHS = [8, 18, 22, 22, 16, 16, 16, 18, 22, 12, 16, 18, 16, 18, 10, 50, 24];

function ticketRows(tickets: Ticket[]): (string | number | null)[][] {
  return tickets.map((t) => {
    const cerrada =
      t.estado === "Cerrado"
        ? t.notes.filter((n) => n.estado === "Cerrado").slice(-1)[0]?.fecha
        : null;
    return [
      t.nro,
      format(new Date(t.fechaCreacion), "dd/MM/yyyy HH:mm"),
      t.solicitante,
      t.contratante ?? "",
      t.departamento ?? "",
      t.celular ?? "",
      t.poliza ?? "",
      t.tipo,
      t.tipoAsistencia ?? "",
      t.severidad,
      t.estado,
      t.registradoPor,
      t.cerradoPor ?? "",
      cerrada ? format(new Date(cerrada), "dd/MM/yyyy HH:mm") : "",
      t.notes.length,
      t.notes
        .map(
          (n) => `[${format(new Date(n.fecha), "dd/MM HH:mm")} ${n.usuario}/${n.estado}] ${n.nota}`,
        )
        .join(" | "),
      t.attachments.map((a) => a.name).join(", "),
    ];
  });
}

export async function exportTicketsXLSX(tickets: Ticket[], range: DateRange, user = "Usuario") {
  const filtered = tickets.filter((t) => inRange(t.fechaCreacion, range));
  const metaStr = `${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}   •   ${format(new Date(), "dd/MM/yyyy HH:mm")}   •   Usuario: ${user}   •   Total: ${filtered.length}`;

  await exportViaServer({
    filename: `tickets_${fileSuffix(range)}.xlsx`,
    sheets: [
      {
        name: "Tickets",
        title: "Reporte de Tickets — DOKKA Desk",
        metadata: metaStr,
        headers: TICKET_HEADERS,
        rows: ticketRows(filtered),
        col_widths: TICKET_COL_WIDTHS,
      },
    ],
    creator: user,
    styles: STYLES,
  });
}

/* ==================== DASHBOARD (con charts nativos) ==================== */

export async function exportDashboardXLSX(tickets: Ticket[], range: DateRange, user = "Usuario") {
  const filtered = tickets.filter((t) => inRange(t.fechaCreacion, range));
  const meta1 = `${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}   •   Total: ${filtered.length}`;
  const meta2 = `${format(new Date(), "dd/MM/yyyy HH:mm")}   •   Usuario: ${user}`;

  // ---- Summary data ----
  const tipoMap = new Map<string, number>();
  filtered.forEach((t) => tipoMap.set(t.tipo, (tipoMap.get(t.tipo) ?? 0) + 1));
  const porTipo = Array.from(tipoMap, ([k, v]) => [k, v] as const).sort((a, b) => b[1] - a[1]);

  const userMap = new Map<string, number>();
  filtered.forEach((t) => {
    if (t.estado !== "Cerrado") return;
    const k = (t.cerradoPor || "").trim();
    if (!k || k === "-") return;
    userMap.set(k, (userMap.get(k) ?? 0) + 1);
  });
  const porUsuario = Array.from(userMap, ([k, v]) => [k, v] as const).sort((a, b) => b[1] - a[1]);

  const dayMap = new Map<string, number>();
  const ms = 24 * 60 * 60 * 1000;
  for (
    let d = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
    d <= range.to;
    d = new Date(d.getTime() + ms)
  ) {
    dayMap.set(format(d, "dd/MM"), 0);
  }
  filtered.forEach((t) => {
    const k = format(new Date(t.fechaCreacion), "dd/MM");
    if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) ?? 0) + 1);
  });
  const tendencia = Array.from(dayMap, ([k, v]) => [k, v] as const);

  // ---- Blocks for Resumen sheet ----
  const blocks: ExportBlock[] = [];

  // Tickets por tipo
  blocks.push({ type: "blank", height: 4 });
  blocks.push({ type: "section", title: "Tickets por tipo" });
  const tipoHeader: string[] = ["Tipo", "Cantidad"];
  const tipoRows =
    porTipo.length > 0 ? porTipo.map(([l, v]) => [l, v]) : [["—", 0]];
  blocks.push({ type: "table", headers: tipoHeader, rows: tipoRows });

  // Row calculations for chart data references
  let tipoDataStart = 0;
  let tipoDataEnd = 0;
  if (porTipo.length > 0) {
    tipoDataStart = 7; // title=1, meta=2, meta2=3, blank=4, section=5, header=6
    tipoDataEnd = tipoDataStart + porTipo.length - 1;
  }

  // Cerrados por usuario
  blocks.push({ type: "blank", height: 4 });
  blocks.push({ type: "section", title: "Tickets cerrados por usuario asignado" });
  const userHeader: string[] = ["Usuario", "Cantidad"];
  const userRows =
    porUsuario.length > 0 ? porUsuario.map(([l, v]) => [l, v]) : [["—", 0]];
  blocks.push({ type: "table", headers: userHeader, rows: userRows });

  let userDataStart = 0;
  let userDataEnd = 0;
  if (porUsuario.length > 0) {
    userDataStart = tipoDataEnd + 4; // after blank, section, header
    userDataEnd = userDataStart + porUsuario.length - 1;
  }

  // Tendencia diaria
  blocks.push({ type: "blank", height: 4 });
  blocks.push({ type: "section", title: "Tendencia diaria" });
  const tendHeader: string[] = ["Fecha", "Cantidad"];
  const tendRows = tendencia.map(([l, v]) => [l, v]);
  blocks.push({ type: "table", headers: tendHeader, rows: tendRows });

  let tendDataStart = 0;
  let tendDataEnd = 0;
  if (tendencia.length > 0) {
    tendDataStart = userDataEnd + 4; // after blank, section, header
    tendDataEnd = tendDataStart + tendencia.length - 1;
  }

  // Charts
  const charts: ExportChart[] = [];

  if (tipoDataStart > 0) {
    charts.push({
      type: "bar",
      title: "Tickets por tipo",
      sheet: "Resumen",
      data: { min_col: 2, min_row: tipoDataStart, max_col: 2, max_row: tipoDataEnd },
      cats: { min_col: 1, min_row: tipoDataStart, max_col: 1, max_row: tipoDataEnd },
      position: { col: 3, row: 1 },
      color: "2F7FD6",
      y_title: "Cantidad",
      x_title: "Tipo",
      series_name: "Tickets",
      height: 10,
    });
  }

  if (userDataStart > 0) {
    charts.push({
      type: "bar",
      title: "Cerrados por usuario",
      sheet: "Resumen",
      data: { min_col: 2, min_row: userDataStart, max_col: 2, max_row: userDataEnd },
      cats: { min_col: 1, min_row: userDataStart, max_col: 1, max_row: userDataEnd },
      position: { col: 3, row: 22 },
      color: "16A34A",
      y_title: "Cantidad",
      x_title: "Usuario",
      series_name: "Cerrados",
      height: 10,
    });
  }

  if (tendDataStart > 0) {
    charts.push({
      type: "line",
      title: "Tendencia diaria",
      sheet: "Resumen",
      data: { min_col: 2, min_row: tendDataStart, max_col: 2, max_row: tendDataEnd },
      cats: { min_col: 1, min_row: tendDataStart, max_col: 1, max_row: tendDataEnd },
      position: { col: 3, row: 43 },
      color: "D97706",
      y_title: "Cantidad",
      x_title: "Fecha",
      series_name: "Tendencia",
      height: 10,
      show_labels: false,
    });
  }

  await exportViaServer({
    filename: `reporte_${fileSuffix(range)}.xlsx`,
    sheets: [
      {
        name: "Registros",
        title: "Reporte de Tickets — DOKKA Desk",
        metadata: `${meta1}   •   ${meta2}`,
        headers: TICKET_HEADERS,
        rows: ticketRows(filtered),
        col_widths: TICKET_COL_WIDTHS,
      },
      {
        name: "Resumen",
        title: "Resumen de Tickets — DOKKA Desk",
        metadata: meta1,
        metadata2: meta2,
        col_widths: [46, 46],
        blocks,
      },
    ],
    charts,
    creator: user,
    styles: STYLES,
  });
}

/* ==================== ACCIDENTES PERSONALES ==================== */

export interface ReportAPRow {
  nro: number;
  colaborador: string | null;
  fecha_solicitud: string | null;
  fecha_siniestro: string | null;
  nombre_accidentado: string | null;
  carnet_accidentado: string | null;
  solicitante: string | null;
  celular: string | null;
  departamento: string | null;
  poliza: string | null;
  direccion: string | null;
  descripcion: string | null;
  ejecutivo_nombre: string | null;
  ejecutivo_celular: string | null;
  intentos_llamada: string | null;
  observaciones: string | null;
  hubo_tripartita: string | null;
  hora_contacto: string | null;
  created_at: string;
}

const AP_HEADERS = [
  "Ticket",
  "Fecha de registro",
  "Colaborador",
  "Fecha de solicitud",
  "Fecha del siniestro",
  "Nombre del accidentado",
  "Carnet del accidentado",
  "Solicitante",
  "Celular",
  "Departamento",
  "Póliza",
  "Dirección",
  "Descripción",
  "Ejecutivo (nombre)",
  "Ejecutivo (celular)",
  "Intentos de llamada",
  "Hubo tripartita",
  "Hora de contacto",
  "Observaciones",
];

const AP_COL_WIDTHS = [8, 18, 20, 18, 18, 22, 18, 22, 16, 16, 16, 22, 30, 20, 20, 18, 14, 14, 30];

function apRows(rows: ReportAPRow[]): (string | number | null)[][] {
  return rows.map((r) => [
    r.nro,
    format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
    r.colaborador ?? "",
    r.fecha_solicitud ?? "",
    r.fecha_siniestro ?? "",
    r.nombre_accidentado ?? "",
    r.carnet_accidentado ?? "",
    r.solicitante ?? "",
    r.celular ?? "",
    r.departamento ?? "",
    r.poliza ?? "",
    r.direccion ?? "",
    r.descripcion ?? "",
    r.ejecutivo_nombre ?? "",
    r.ejecutivo_celular ?? "",
    r.intentos_llamada ?? "",
    r.hubo_tripartita ?? "",
    r.hora_contacto ?? "",
    r.observaciones ?? "",
  ]);
}

export async function exportAPXLSX(rows: ReportAPRow[], range: DateRange) {
  const filtered = rows.filter((r) => inRange(r.created_at, range));

  await exportViaServer({
    filename: `accidentes_personales_${fileSuffix(range)}.xlsx`,
    sheets: [
      {
        name: "Accidentes Personales",
        title: "Reporte de Accidentes Personales — DOKKA Desk",
        metadata: `${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}   •   Total: ${filtered.length}`,
        headers: AP_HEADERS,
        rows: apRows(filtered),
        col_widths: AP_COL_WIDTHS,
      },
    ],
    styles: STYLES,
  });
}

/* ==================== CASOS GENERALES ==================== */

export interface ReportCGRow {
  nro: number;
  colaborador: string | null;
  fecha_solicitud: string | null;
  fecha_siniestro: string | null;
  danos_personales: string | null;
  asegurado: string | null;
  solicitante: string | null;
  celular: string | null;
  departamento: string | null;
  poliza: string | null;
  direccion: string | null;
  descripcion: string | null;
  ejecutivo_nombre: string | null;
  ejecutivo_celular: string | null;
  intentos_llamada: string | null;
  observaciones: string | null;
  hubo_tripartita: string | null;
  hora_contacto: string | null;
  created_at: string;
}

const CG_HEADERS = [
  "Ticket",
  "Fecha de registro",
  "Colaborador",
  "Fecha de solicitud",
  "Fecha del siniestro",
  "Daños personales",
  "Asegurado",
  "Solicitante",
  "Celular",
  "Departamento",
  "Póliza",
  "Dirección",
  "Descripción",
  "Ejecutivo (nombre)",
  "Ejecutivo (celular)",
  "Intentos de llamada",
  "Hubo tripartita",
  "Hora de contacto",
  "Observaciones",
];

const CG_COL_WIDTHS = [8, 18, 20, 18, 18, 16, 22, 22, 16, 16, 16, 22, 30, 20, 20, 18, 14, 14, 30];

function cgRows(rows: ReportCGRow[]): (string | number | null)[][] {
  return rows.map((r) => [
    r.nro,
    format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
    r.colaborador ?? "",
    r.fecha_solicitud ?? "",
    r.fecha_siniestro ?? "",
    r.danos_personales ?? "",
    r.asegurado ?? "",
    r.solicitante ?? "",
    r.celular ?? "",
    r.departamento ?? "",
    r.poliza ?? "",
    r.direccion ?? "",
    r.descripcion ?? "",
    r.ejecutivo_nombre ?? "",
    r.ejecutivo_celular ?? "",
    r.intentos_llamada ?? "",
    r.hubo_tripartita ?? "",
    r.hora_contacto ?? "",
    r.observaciones ?? "",
  ]);
}

export async function exportCGXLSX(rows: ReportCGRow[], range: DateRange) {
  const filtered = rows.filter((r) => inRange(r.created_at, range));

  await exportViaServer({
    filename: `casos_generales_${fileSuffix(range)}.xlsx`,
    sheets: [
      {
        name: "Casos Generales",
        title: "Reporte de Casos Generales — DOKKA Desk",
        metadata: `${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}   •   Total: ${filtered.length}`,
        headers: CG_HEADERS,
        rows: cgRows(filtered),
        col_widths: CG_COL_WIDTHS,
      },
    ],
    styles: STYLES,
  });
}

/* ==================== AUDITORÍA ==================== */

export interface AuditRow {
  created_at: string;
  username: string | null;
  user_email: string | null;
  action: string;
  entity: string;
  ticket_nro: number | null;
  details: Record<string, unknown> | null;
}

const AUDIT_HEADERS = ["Fecha", "Usuario", "Acción", "Ticket", "Detalle"];

const AUDIT_COL_WIDTHS = [22, 22, 28, 14, 80];

const ACTION_LABEL: Record<string, string> = {
  ticket_created: "Ticket creado",
  ticket_deleted: "Ticket eliminado",
  ticket_state_changed: "Cambio de estado",
  note_added: "Nota agregada",
  note_deleted: "Nota eliminada",
  attachment_added: "Adjunto agregado",
  attachment_deleted: "Adjunto eliminado",
  cg_created: "Caso General creado",
  cg_updated: "Caso General editado",
  cg_deleted: "Caso General eliminado",
  ap_created: "Accidente Personal creado",
  ap_updated: "Accidente Personal editado",
  ap_deleted: "Accidente Personal eliminado",
};

function codeFromAudit(r: AuditRow): string {
  if (r.ticket_nro == null) return "";
  const n = r.ticket_nro;
  const prefix = r.entity === "reporte_cg" ? "CG" : r.entity === "reporte_ap" ? "AP" : "TK";
  const min = Math.max(3, String(n).length);
  return `${prefix}-${String(n).padStart(min, "0")}`;
}

export async function exportAuditXLSX(rows: AuditRow[], range: DateRange) {
  const filtered = rows.filter((r) => inRange(r.created_at, range));
  const dataRows: (string | number | null)[][] = filtered.map((r) => [
    format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss"),
    r.username ?? (r.user_email ? r.user_email.split("@")[0] : "—"),
    ACTION_LABEL[r.action] ?? r.action,
    codeFromAudit(r),
    r.details
      ? Object.entries(r.details)
          .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
          .join(" · ")
      : "",
  ]);

  await exportViaServer({
    filename: `auditoria_${fileSuffix(range)}.xlsx`,
    sheets: [
      {
        name: "Auditoría",
        title: "Auditoría de Actividades — DOKKA Desk",
        metadata: `${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}   •   Total: ${filtered.length}`,
        headers: AUDIT_HEADERS,
        rows: dataRows,
        col_widths: AUDIT_COL_WIDTHS,
      },
    ],
    styles: STYLES,
  });
}

/* ==================== PDF (sin cambios) ==================== */

function pdfHeader(doc: JsPDFInstance, title: string, range: DateRange, user: string) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageW, 56, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("DOKKA Desk", 40, 26);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 40, 44);
  doc.setFontSize(9);
  doc.text(
    `Rango: ${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}    Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}    Usuario: ${user}`,
    pageW - 40,
    44,
    { align: "right" },
  );
  doc.setTextColor(40, 40, 40);
}

function pdfFooter(doc: JsPDFInstance) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `DOKKA Desk — Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 18,
      { align: "center" },
    );
  }
}

export async function exportTicketsPDF(tickets: Ticket[], range: DateRange, user: string) {
  const filtered = tickets.filter((t) => inRange(t.fechaCreacion, range));
  const { jsPDF, autoTable } = await loadJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  pdfHeader(doc, "Reporte de Tickets", range, user);
  autoTable(doc, {
    startY: 70,
    head: [
      [
        "Nro",
        "Fecha",
        "Solicitante",
        "Tipo",
        "Prioridad",
        "Estado",
        "Registrado por",
        "Cerrado por",
      ],
    ],
    body: filtered.map((t) => [
      t.nro,
      format(new Date(t.fechaCreacion), "dd/MM/yyyy HH:mm"),
      t.solicitante,
      t.tipo,
      t.severidad,
      t.estado,
      t.registradoPor,
      t.cerradoPor ?? "",
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 30, right: 30 },
  });
  pdfFooter(doc);
  doc.save(`tickets_${fileSuffix(range)}.pdf`);
}

export async function exportAPPDF(rows: ReportAPRow[], range: DateRange, user: string) {
  const f = rows.filter((r) => inRange(r.created_at, range));
  const { jsPDF, autoTable } = await loadJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  pdfHeader(doc, "Reporte de Accidentes Personales", range, user);
  autoTable(doc, {
    startY: 70,
    head: [
      [
        "Ticket",
        "Fecha",
        "Accidentado",
        "Carnet",
        "Solicitante",
        "Departamento",
        "Ejecutivo",
        "Colaborador",
      ],
    ],
    body: f.map((r) => [
      r.nro,
      format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
      r.nombre_accidentado ?? "",
      r.carnet_accidentado ?? "",
      r.solicitante ?? "",
      r.departamento ?? "",
      r.ejecutivo_nombre ?? "",
      r.colaborador ?? "",
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 30, right: 30 },
  });
  pdfFooter(doc);
  doc.save(`accidentes_personales_${fileSuffix(range)}.pdf`);
}

export async function exportCGPDF(rows: ReportCGRow[], range: DateRange, user: string) {
  const f = rows.filter((r) => inRange(r.created_at, range));
  const { jsPDF, autoTable } = await loadJsPDF();
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  pdfHeader(doc, "Reporte de Casos Generales", range, user);
  autoTable(doc, {
    startY: 70,
    head: [
      ["Ticket", "Fecha", "Asegurado", "Solicitante", "Departamento", "Ejecutivo", "Colaborador"],
    ],
    body: f.map((r) => [
      r.nro,
      format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
      r.asegurado ?? "",
      r.solicitante ?? "",
      r.departamento ?? "",
      r.ejecutivo_nombre ?? "",
      r.colaborador ?? "",
    ]),
    theme: "striped",
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 30, right: 30 },
  });
  pdfFooter(doc);
  doc.save(`casos_generales_${fileSuffix(range)}.pdf`);
}
