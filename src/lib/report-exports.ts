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
  if (!range.label || range.label === "dia-actual" || range.label === "dia-anterior") return d;
  return range.label;
}

/* -------------------- XLSX (exceljs) -------------------- */

/** Convierte un hex RGB (ej. "2F7FD6") a argb de exceljs (ej. "FF2F7FD6") */
function a(argb: string) {
  return `FF${argb.replace("#", "")}`;
}

/** Estilos predefinidos */
const C = {
  brand: a("2F7FD6"),
  brandDark: a("1F5A99"),
  white: a("FFFFFF"),
  text: a("1E293B"),
  textMuted: a("64748B"),
  bgLight: a("F8FAFC"),
  bgGray: a("F1F5F9"),
  border: a("CBD5E1"),
  green: a("16A34A"),
  red: a("DC2626"),
  amber: a("D97706"),
};

function borderStyle() {
  return {
    top: { style: "thin" as const, color: { argb: C.border } },
    bottom: { style: "thin" as const, color: { argb: C.border } },
    left: { style: "thin" as const, color: { argb: C.border } },
    right: { style: "thin" as const, color: { argb: C.border } },
  };
}

/** Helper para exportaciones simples con xlsx (AP, CG) */
async function downloadXLSX(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null)[][],
) {
  const XLSX = await loadXLSX();
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const widths: number[] = [];
  aoa.forEach((row) => {
    row.forEach((c, i) => {
      const len = c == null ? 0 : String(c).length;
      widths[i] = Math.max(widths[i] ?? 10, Math.min(60, len + 2));
    });
  });
  (ws as any)["!cols"] = widths.map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

/** Genera un blob PNG de un gráfico de barras usando canvas 2D */
function renderChartBlob(
  data: { label: string; value: number }[],
  title: string,
  barColor: string,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const W = 700;
    const H = 320;
    const DPR = 2;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas not available"));

    ctx.scale(DPR, DPR);
    const pad = { t: 30, r: 30, b: 50, l: 120 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const barGap = 6;

    // Fondo
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);

    // Título
    ctx.fillStyle = "#1E293B";
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, W / 2, 20);

    const max = Math.max(...data.map((d) => d.value), 1);
    const barW = Math.max(8, Math.min(50, (chartW - barGap * (data.length - 1)) / data.length));

    // Eje Y (grid)
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "#64748B";
    ctx.textAlign = "right";
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.t + chartH - (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(W - pad.r, y);
      ctx.stroke();
      ctx.fillText(String(Math.round((max / gridLines) * i)), pad.l - 8, y + 4);
    }

    // Barras
    data.forEach((d, i) => {
      const barH = (d.value / max) * chartH;
      const x = pad.l + i * (barW + barGap);
      const y = pad.t + chartH - barH;

      // Gradiente
      const grad = ctx.createLinearGradient(x, y, x, pad.t + chartH);
      grad.addColorStop(0, barColor);
      grad.addColorStop(1, barColor + "88");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
      ctx.fill();

      // Etiqueta
      ctx.fillStyle = "#1E293B";
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "center";
      const label = d.label.length > 14 ? d.label.slice(0, 13) + "…" : d.label;
      ctx.fillText(label, x + barW / 2, H - pad.b + 16);

      // Valor
      ctx.fillStyle = "#475569";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillText(String(d.value), x + barW / 2, y - 5);
    });

    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Failed to generate chart blob"));
      resolve(blob.arrayBuffer());
    }, "image/png");
  });
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
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = user;
  wb.created = new Date();

  const filtered = tickets.filter((t) => inRange(t.fechaCreacion, range));
  const metaStr = `${format(range.from, "dd/MM/yyyy")} — ${format(range.to, "dd/MM/yyyy")}   •   ${format(new Date(), "dd/MM/yyyy HH:mm")}   •   Usuario: ${user}   •   Total: ${filtered.length}`;

  const COL_WIDTHS = [8, 18, 22, 22, 16, 16, 16, 18, 22, 12, 16, 18, 16, 18, 10, 50, 24];

  // ---- Sheet 1: Registros ----
  const ws = wb.addWorksheet("Registros");

  // Row 1: Title
  const r1 = ws.getRow(1);
  r1.height = 34;
  const c1 = r1.getCell(1);
  c1.value = "Reporte de Tickets — DOKKA Desk";
  c1.font = { bold: true, size: 16, color: { argb: C.white } };
  c1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.brand } };
  c1.alignment = { horizontal: "center", vertical: "middle" };

  // Row 2: Metadata
  const r2 = ws.getRow(2);
  r2.height = 22;
  const c2 = r2.getCell(1);
  c2.value = metaStr;
  c2.font = { italic: true, size: 10, color: { argb: C.textMuted } };
  c2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.bgGray } };
  c2.alignment = { horizontal: "center", vertical: "middle" };

  // Row 4: Column headers
  const r4 = ws.getRow(4);
  r4.height = 24;
  TICKET_HEADERS.forEach((h, i) => {
    const cell = r4.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.brand } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = borderStyle();
  });

  // Data rows
  const dataRows = ticketRows(filtered);
  dataRows.forEach((row, ri) => {
    const exRow = ws.getRow(5 + ri);
    exRow.height = 20;
    const zebra = ri % 2 === 1;
    row.forEach((val, ci) => {
      const cell = exRow.getCell(ci + 1);
      cell.value = val;
      cell.font = { size: 9, color: { argb: C.text } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: zebra ? C.bgLight : C.white },
      };
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = borderStyle();
    });
  });

  // Merge title & meta across all columns
  ws.mergeCells(1, 1, 1, TICKET_HEADERS.length);
  ws.mergeCells(2, 1, 2, TICKET_HEADERS.length);

  // Column widths
  COL_WIDTHS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // ---- Sheet 2: Resumen ----
  const ws2 = wb.addWorksheet("Resumen");
  let r = 1;

  function addTitleRow(text: string, bg: string, fg: string, fontSize: number, bold = true) {
    const row = ws2.getRow(r);
    row.height = fontSize > 12 ? 32 : 22;
    const cell = row.getCell(1);
    cell.value = text;
    cell.font = { bold, size: fontSize, color: { argb: fg } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    ws2.mergeCells(r, 1, r, 4);
    r++;
  }

  function addSection(text: string) {
    const row = ws2.getRow(r);
    row.height = 24;
    const cell = row.getCell(1);
    cell.value = text;
    cell.font = { bold: true, size: 12, color: { argb: C.white } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.brandDark } };
    cell.alignment = { vertical: "middle" };
    ws2.mergeCells(r, 1, r, 4);
    r++;
  }

  function addHeaderRow(headers: string[]) {
    const row = ws2.getRow(r);
    row.height = 22;
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, size: 10, color: { argb: C.text } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.bgGray } };
      cell.alignment = { vertical: "middle", horizontal: i > 0 ? "right" : "left" };
      cell.border = borderStyle();
    });
    r++;
  }

  function addDataRow(values: (string | number)[], alignRight = true) {
    const row = ws2.getRow(r);
    row.height = 20;
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v;
      cell.font = { size: 10, color: { argb: C.text } };
      cell.alignment = { vertical: "middle", horizontal: i > 0 && alignRight ? "right" : "left" };
      cell.border = borderStyle();
    });
    r++;
  }

  function blankRow() { r++; }

  // Title
  addTitleRow("Resumen de Tickets — DOKKA Desk", C.brand, C.white, 16);
  const metaRow = ws2.getRow(r);
  metaRow.height = 22;
  const metaCell = metaRow.getCell(1);
  metaCell.value = metaStr;
  metaCell.font = { italic: true, size: 10, color: { argb: C.textMuted } };
  metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.bgGray } };
  metaCell.alignment = { horizontal: "center", vertical: "middle" };
  ws2.mergeCells(r, 1, r, 4);
  r++;
  blankRow();

  // ---- Tickets por tipo ----
  const tipoMap = new Map<string, number>();
  filtered.forEach((t) => tipoMap.set(t.tipo, (tipoMap.get(t.tipo) ?? 0) + 1));
  const porTipo = Array.from(tipoMap, ([k, v]) => ({ label: k, value: v })).sort(
    (a, b) => b.value - a.value,
  );

  addSection("Tickets por tipo");
  addHeaderRow(["Tipo", "Cantidad", "", ""]);
  porTipo.forEach((d) => addDataRow([d.label, d.value, "", ""]));
  if (porTipo.length === 0) addDataRow(["—", 0, "", ""]);
  blankRow();

  // ---- Tickets cerrados por usuario ----
  const userMap = new Map<string, number>();
  filtered.forEach((t) => {
    if (t.estado !== "Cerrado") return;
    const k = (t.cerradoPor || "").trim();
    if (!k || k === "-") return;
    userMap.set(k, (userMap.get(k) ?? 0) + 1);
  });
  const porUsuario = Array.from(userMap, ([k, v]) => ({ label: k, value: v })).sort(
    (a, b) => b.value - a.value,
  );

  addSection("Tickets cerrados por usuario asignado");
  addHeaderRow(["Usuario", "Cantidad", "", ""]);
  porUsuario.forEach((d) => addDataRow([d.label, d.value, "", ""]));
  if (porUsuario.length === 0) addDataRow(["—", 0, "", ""]);
  blankRow();

  // ---- Tendencia diaria ----
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
  const tendenciaData = Array.from(dayMap, ([k, v]) => ({ label: k, value: v }));

  addSection("Tendencia diaria");
  addHeaderRow(["Fecha", "Cantidad", "", ""]);
  tendenciaData.forEach((d) => addDataRow([d.label, d.value, "", ""]));

  // Column widths for Resumen
  ws2.getColumn(1).width = 36;
  ws2.getColumn(2).width = 14;
  ws2.getColumn(3).width = 24;
  ws2.getColumn(4).width = 24;

  // ---- Embed chart images ----
  try {
    if (porTipo.length > 0) {
      const chartBuf = await renderChartBlob(porTipo, "Tickets por tipo", "#2F7FD6");
      const imgId = wb.addImage({ buffer: chartBuf as any, extension: "png" });
      ws2.addImage(imgId, { tl: { col: 4.5, row: 0 }, ext: { width: 700, height: 320 } });
    }
    if (porUsuario.length > 0) {
      const chartBuf2 = await renderChartBlob(porUsuario, "Cerrados por usuario", "#16A34A");
      const imgId2 = wb.addImage({ buffer: chartBuf2 as any, extension: "png" });
      const startR = porTipo.length > 0 ? 0 : 0;
      ws2.addImage(imgId2, {
        tl: { col: 4.5, row: porTipo.length > 0 ? 13 : 5 },
        ext: { width: 700, height: 320 },
      });
    }
  } catch {
    // Charts are a nice-to-have; silently fall back if canvas fails
  }

  // Descargar
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tickets_${fileSuffix(range)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
