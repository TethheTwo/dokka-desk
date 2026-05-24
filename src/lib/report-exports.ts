import { format } from "date-fns";
import type { Ticket } from "@/lib/tickets-store";

// Lazy loaders — these libs touch browser-only globals and must not run during SSR.
const loadXLSX = () => import("xlsx");
const loadJsPDF = async () => {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
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
  if (range.label === "dia-actual" || range.label === "dia-anterior") return d;
  return range.label;
}

/* -------------------- XLSX -------------------- */

function autosize(ws: any, rows: (string | number | null)[][]) {
  const widths: number[] = [];
  rows.forEach((row) => {
    row.forEach((c, i) => {
      const len = c == null ? 0 : String(c).length;
      widths[i] = Math.max(widths[i] ?? 10, Math.min(60, len + 2));
    });
  });
  (ws as any)["!cols"] = widths.map((w) => ({ wch: w }));
}

async function downloadXLSX(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null)[][],
) {
  const XLSX = await loadXLSX();
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  autosize(ws, aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

/* -------------------- PDF -------------------- */

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

/* ==================== TICKETS ==================== */

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
  const XLSX = await loadXLSX();
  const filtered = tickets.filter((t) => inRange(t.fechaCreacion, range));

  /* ---------- Hoja 1: Registros ---------- */
  const titleRow = ["Reporte de Tickets — DOKKA Desk"];
  const metaRow = [
    `Rango: ${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}`,
    `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    `Usuario: ${user}`,
    `Total: ${filtered.length}`,
  ];
  const aoa: (string | number | null)[][] = [
    titleRow,
    metaRow,
    [],
    TICKET_HEADERS,
    ...ticketRows(filtered),
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  autosize(ws, aoa);

  // Merges para título y meta
  (ws as any)["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: TICKET_HEADERS.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: TICKET_HEADERS.length - 1 } },
  ];
  // Estilo título
  const titleCell = (ws as any)[XLSX.utils.encode_cell({ r: 0, c: 0 })];
  if (titleCell) {
    titleCell.s = {
      font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2F7FD6" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
  const metaCell = (ws as any)[XLSX.utils.encode_cell({ r: 1, c: 0 })];
  if (metaCell) {
    metaCell.v = metaRow.join("     •     ");
    metaCell.s = {
      font: { italic: true, sz: 10, color: { rgb: "475569" } },
      fill: { fgColor: { rgb: "F1F5F9" } },
      alignment: { horizontal: "center", vertical: "center" },
    };
  }
  (ws as any)["!rows"] = [{ hpt: 28 }, { hpt: 20 }, { hpt: 8 }, { hpt: 22 }];
  // Encabezados de tabla
  TICKET_HEADERS.forEach((_, i) => {
    const c = (ws as any)[XLSX.utils.encode_cell({ r: 3, c: i })];
    if (c)
      c.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2F7FD6" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "1F5A99" } },
          bottom: { style: "thin", color: { rgb: "1F5A99" } },
          left: { style: "thin", color: { rgb: "1F5A99" } },
          right: { style: "thin", color: { rgb: "1F5A99" } },
        },
      };
  });
  // Filas alternadas (zebra)
  for (let r = 4; r < aoa.length; r++) {
    const zebra = (r - 4) % 2 === 1;
    for (let c = 0; c < TICKET_HEADERS.length; c++) {
      const cell = (ws as any)[XLSX.utils.encode_cell({ r, c })];
      if (cell)
        cell.s = {
          font: { sz: 10, color: { rgb: "1E293B" } },
          fill: { fgColor: { rgb: zebra ? "F8FAFC" : "FFFFFF" } },
          alignment: { vertical: "center", wrapText: true },
          border: {
            top: { style: "hair", color: { rgb: "E2E8F0" } },
            bottom: { style: "hair", color: { rgb: "E2E8F0" } },
            left: { style: "hair", color: { rgb: "E2E8F0" } },
            right: { style: "hair", color: { rgb: "E2E8F0" } },
          },
        };
    }
  }

  /* ---------- Hoja 2: Resumen ---------- */
  // Tickets por tipo
  const tipoMap = new Map<string, number>();
  filtered.forEach((t) => tipoMap.set(t.tipo, (tipoMap.get(t.tipo) ?? 0) + 1));
  const porTipo = Array.from(tipoMap, ([k, v]) => [k, v] as [string, number]).sort(
    (a, b) => b[1] - a[1],
  );

  // Tickets cerrados por usuario asignado
  const userMap = new Map<string, number>();
  filtered.forEach((t) => {
    if (t.estado !== "Cerrado") return;
    const k = (t.cerradoPor || "").trim();
    if (!k || k === "-") return;
    userMap.set(k, (userMap.get(k) ?? 0) + 1);
  });
  const porUsuario = Array.from(userMap, ([k, v]) => [k, v] as [string, number]).sort(
    (a, b) => b[1] - a[1],
  );

  // Tendencia diaria — todos los días del rango
  const dayMap = new Map<string, number>();
  const ms = 24 * 60 * 60 * 1000;
  for (
    let d = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate());
    d <= range.to;
    d = new Date(d.getTime() + ms)
  ) {
    dayMap.set(format(d, "dd/MM/yyyy"), 0);
  }
  filtered.forEach((t) => {
    const k = format(new Date(t.fechaCreacion), "dd/MM/yyyy");
    if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) ?? 0) + 1);
  });
  const tendencia = Array.from(dayMap, ([k, v]) => [k, v] as [string, number]);

  // Construcción visual de la hoja Resumen con "mini-barras" de bloques ▰
  const maxBar = 24;
  const makeBar = (v: number, max: number) => {
    if (max === 0) return "";
    const n = Math.max(1, Math.round((v / max) * maxBar));
    return "▰".repeat(n);
  };
  const maxTipo = Math.max(1, ...porTipo.map(([, v]) => v));
  const maxUser = Math.max(1, ...porUsuario.map(([, v]) => v));
  const maxDay = Math.max(1, ...tendencia.map(([, v]) => v));

  const sum: (string | number)[][] = [];
  sum.push(["Resumen de Tickets — DOKKA Desk"]);
  sum.push([
    `Rango: ${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}   •   Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}   •   Usuario: ${user}`,
  ]);
  sum.push([]);
  sum.push(["Tickets por tipo", "", ""]);
  sum.push(["Tipo", "Cantidad", "Gráfico"]);
  porTipo.forEach(([k, v]) => sum.push([k, v, makeBar(v, maxTipo)]));
  if (porTipo.length === 0) sum.push(["—", 0, ""]);
  sum.push([]);
  sum.push(["Tickets cerrados por usuario asignado", "", ""]);
  sum.push(["Usuario", "Cantidad", "Gráfico"]);
  porUsuario.forEach(([k, v]) => sum.push([k, v, makeBar(v, maxUser)]));
  if (porUsuario.length === 0) sum.push(["—", 0, ""]);
  sum.push([]);
  sum.push(["Tendencia diaria", "", ""]);
  sum.push(["Fecha", "Cantidad", "Gráfico"]);
  tendencia.forEach(([k, v]) => sum.push([k, v, makeBar(v, maxDay)]));

  const ws2 = XLSX.utils.aoa_to_sheet(sum);
  (ws2 as any)["!cols"] = [{ wch: 36 }, { wch: 14 }, { wch: 36 }];
  (ws2 as any)["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];

  const styleTitle = (row: number, bg = "2F7FD6", fg = "FFFFFF", sz = 14, bold = true) => {
    for (let c = 0; c < 3; c++) {
      const cell = (ws2 as any)[XLSX.utils.encode_cell({ r: row, c })];
      if (cell)
        cell.s = {
          font: { bold, sz, color: { rgb: fg } },
          fill: { fgColor: { rgb: bg } },
          alignment: { horizontal: c === 0 ? "center" : "left", vertical: "center" },
        };
    }
  };
  const styleSection = (row: number) => {
    for (let c = 0; c < 3; c++) {
      const cell = (ws2 as any)[XLSX.utils.encode_cell({ r: row, c })];
      if (cell)
        cell.s = {
          font: { bold: true, sz: 12, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "1F5A99" } },
          alignment: { vertical: "center" },
        };
    }
    (ws2 as any)["!merges"]!.push({ s: { r: row, c: 0 }, e: { r: row, c: 2 } });
  };
  const styleHeader = (row: number) => {
    for (let c = 0; c < 3; c++) {
      const cell = (ws2 as any)[XLSX.utils.encode_cell({ r: row, c })];
      if (cell)
        cell.s = {
          font: { bold: true, sz: 10, color: { rgb: "1E293B" } },
          fill: { fgColor: { rgb: "E2E8F0" } },
          alignment: { vertical: "center", horizontal: c === 1 ? "right" : "left" },
        };
    }
  };
  const styleBarRow = (row: number) => {
    for (let c = 0; c < 3; c++) {
      const cell = (ws2 as any)[XLSX.utils.encode_cell({ r: row, c })];
      if (cell)
        cell.s = {
          font: { sz: 10, color: c === 2 ? { rgb: "2F7FD6" } : { rgb: "1E293B" } },
          alignment: { vertical: "center", horizontal: c === 1 ? "right" : "left" },
        };
    }
  };

  styleTitle(0, "2F7FD6", "FFFFFF", 16, true);
  styleTitle(1, "F1F5F9", "475569", 10, false);

  // Locate section rows
  let cursor = 3;
  // Por tipo
  styleSection(cursor);
  cursor++;
  styleHeader(cursor);
  cursor++;
  const tipoCount = Math.max(porTipo.length, 1);
  for (let i = 0; i < tipoCount; i++) {
    styleBarRow(cursor++);
  }
  cursor++; // blank
  // Por usuario
  styleSection(cursor);
  cursor++;
  styleHeader(cursor);
  cursor++;
  const userCount = Math.max(porUsuario.length, 1);
  for (let i = 0; i < userCount; i++) {
    styleBarRow(cursor++);
  }
  cursor++; // blank
  // Tendencia
  styleSection(cursor);
  cursor++;
  styleHeader(cursor);
  cursor++;
  for (let i = 0; i < tendencia.length; i++) {
    styleBarRow(cursor++);
  }

  (ws2 as any)["!rows"] = [{ hpt: 26 }, { hpt: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Registros");
  XLSX.utils.book_append_sheet(wb, ws2, "Resumen");
  XLSX.writeFile(wb, `tickets_${fileSuffix(range)}.xlsx`);
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
  const f = rows.filter((r) => inRange(r.created_at, range));
  downloadXLSX(
    `accidentes_personales_${fileSuffix(range)}.xlsx`,
    "Accidentes",
    AP_HEADERS,
    apRows(f),
  );
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
  const f = rows.filter((r) => inRange(r.created_at, range));
  downloadXLSX(
    `casos_generales_${fileSuffix(range)}.xlsx`,
    "Casos Generales",
    CG_HEADERS,
    cgRows(f),
  );
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
  const XLSX = await loadXLSX();
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
  const aoa = [AUDIT_HEADERS, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Anchos profesionales por columna
  (ws as any)["!cols"] = [
    { wch: 22 }, // Fecha
    { wch: 22 }, // Usuario
    { wch: 28 }, // Acción
    { wch: 14 }, // Ticket
    { wch: 80 }, // Detalle
  ];

  // Estilo de encabezado (negrita + fondo corporativo)
  AUDIT_HEADERS.forEach((_, i) => {
    const cell = (ws as any)[XLSX.utils.encode_cell({ r: 0, c: i })];
    if (cell) {
      cell.s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "2F7FD6" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }
  });
  (ws as any)["!rows"] = [{ hpt: 22 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Auditoría");
  XLSX.writeFile(wb, `auditoria_${fileSuffix(range)}.xlsx`);
}
