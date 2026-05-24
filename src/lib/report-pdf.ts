import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FormReportData } from "@/components/ReportPreviewModal";

const BRAND = "#2f7fd6";
const BAR = "#5a8fc4";

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function rgb(hex: string): [number, number, number] {
  const c = parseInt(hex.replace("#", ""), 16);
  return [(c >> 16) & 255, (c >> 8) & 255, c & 255];
}

export function downloadReportPDF(variant: "ap" | "cg", data: FormReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ── Header bar ──
  doc.setFillColor(...rgb(BRAND));
  doc.rect(0, 0, pageW, 56, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  const code = variant === "ap" ? "F-775" : "F-805";
  const heading =
    variant === "ap"
      ? `FORMULARIO PARA ACCIDENTES PERSONALES PATRIMONIALES   ${code}`
      : `FORMULARIO PARA CASOS GENERALES   ${code}`;
  doc.text(heading, pageW / 2, 24, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`N° de Registro: ${data.nro ?? "—"}`, pageW / 2, 42, { align: "center" });

  let y = 76;
  const mL = 40, mR = 40;
  const colW = pageW - mL - mR;

  // ── Colaborador ──
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Colaborador:", mL, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.colaborador || "—", mL + 90, y);
  y += 16;

  // ── Section: Datos del Siniestro ──
  function sectionBar(text: string) {
    doc.setFillColor(...rgb(BAR));
    doc.rect(mL, y, colW, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(text, mL + 6, y + 13);
    y += 24;
  }
  sectionBar("Datos del Siniestro");

  // Fechas
  const dates: [string, string][] = [
    ["Fecha de solicitud", fmtDate(data.fecha_solicitud)],
    ["Fecha del siniestro", fmtDate(data.fecha_siniestro)],
  ];
  if (variant === "cg" && data.danos_personales) {
    dates.push(["Daños Personales", data.danos_personales]);
  }
  const dateX = mL + colW * 0.45;
  doc.setFontSize(9);
  for (const [label, value] of dates) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(BRAND));
    doc.text(label + ":", dateX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(value, dateX + 85, y);
    y += 14;
  }
  y += 4;

  // ── Fields table ──
  const fields: [string, string][] = variant === "ap"
    ? [
        ["Nombre del Accidentado", data.nombre_accidentado],
        ["Carnet del Accidentado", data.carnet_accidentado],
      ]
    : [["Asegurado", data.asegurado]];

  fields.push(
    ["Solicitante", data.solicitante],
    ["Celular", data.celular],
    ["Departamento", data.departamento],
    ["Póliza", data.poliza],
    ["Dirección", data.direccion],
    ["Descripción", data.descripcion],
  );

  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: fields.map(([label, value]) => [label, value ?? "—"]),
    theme: "grid",
    headStyles: { fillColor: [47, 127, 214], textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
    columnStyles: { 0: { cellWidth: 120, fontStyle: "bold", textColor: [47, 127, 214] } },
    margin: { left: mL, right: mR },
    tableLineColor: [200, 200, 200],
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // ── Section: Datos del Ejecutivo ──
  if (y + 40 > pageH - 40) { doc.addPage(); y = 40; }
  sectionBar("Datos del Ejecutivo");

  const execFields: [string, string][] = [
    ["Nombre", data.ejecutivo_nombre],
    ["Celular", data.ejecutivo_celular],
    ["Intentos de llamada", data.intentos_llamada],
    ["Hubo tripartita", data.hubo_tripartita],
    ["Hora de contacto", data.hora_contacto],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: execFields.map(([label, value]) => [label, value ?? "—"]),
    theme: "grid",
    headStyles: { fillColor: [47, 127, 214], textColor: 255, fontSize: 9, fontStyle: "bold" },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 40] },
    columnStyles: { 0: { cellWidth: 120, fontStyle: "bold", textColor: [47, 127, 214] } },
    margin: { left: mL, right: mR },
    tableLineColor: [200, 200, 200],
  });
  y = (doc as any).lastAutoTable.finalY + 12;

  // Observaciones (full width box)
  if (y + 60 > pageH - 40) { doc.addPage(); y = 40; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...rgb(BRAND));
  doc.text("Observaciones:", mL, y + 10);
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(255, 255, 255);
  const boxH = 50;
  doc.roundedRect(mL, y + 14, colW, boxH, 3, 3, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const obsText = data.observaciones || "";
  const lines = doc.splitTextToSize(obsText, colW - 12);
  doc.text(lines, mL + 6, y + 28);

  // ── Page numbers ──
  const pageCount = doc.getNumberOfPages();
  const reportCode = variant === "ap" ? "AP" : "CG";
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `DOKKA Desk — Reporte ${reportCode}-${data.nro} — Página ${i} de ${pageCount}`,
      pageW / 2,
      pageH - 20,
      { align: "center" },
    );
  }

  doc.save(`reporte_${reportCode}-${data.nro}.pdf`);
}
