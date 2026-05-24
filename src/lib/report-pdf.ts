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

export function downloadReportPDF(variant: "ap" | "cg", data: FormReportData) {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Header bar
  doc.setFillColor(BRAND);
  doc.rect(0, 0, pageW, 52, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const code = variant === "ap" ? "F-775" : "F-805";
  const title =
    variant === "ap"
      ? `FORMULARIO PARA ACCIDENTES PERSONALES PATRIMONIALES   ${code}`
      : `FORMULARIO PARA CASOS GENERALES   ${code}`;
  doc.text(title, pageW / 2, 22, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`N° de Registro: ${data.nro ?? "—"}`, pageW / 2, 38, { align: "center" });

  doc.setTextColor(40, 40, 40);
  let y = 72;

  // Colaborador
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Colaborador:", 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.colaborador || "—", 130, y);
  y += 18;

  // Section: Datos del Siniestro
  doc.setFillColor(BAR);
  doc.rect(40, y, pageW - 80, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del Siniestro", 44, y + 13);
  y += 24;

  // Dates
  const dateFields: [string, string][] = [
    ["Fecha de solicitud", fmtDate(data.fecha_solicitud)],
    ["Fecha del siniestro", fmtDate(data.fecha_siniestro)],
  ];
  if (variant === "cg" && data.danos_personales) {
    dateFields.push(["Daños Personales", data.danos_personales]);
  }

  doc.setTextColor(40, 40, 40);
  for (const [label, value] of dateFields) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", 300, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 410, y);
    y += 14;
  }
  y += 4;

  // Fields table
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
    headStyles: { fillColor: [47, 127, 214], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 120, fontStyle: "bold" } },
    margin: { left: 40, right: 40 },
    tableLineColor: [180, 180, 180],
  });
  y = (doc as any).lastAutoTable.finalY + 16;

  // Section: Datos del Ejecutivo
  if (y + 40 > pageH - 40) {
    doc.addPage();
    y = 40;
  }
  doc.setFillColor(BAR);
  doc.rect(40, y, pageW - 80, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del Ejecutivo", 44, y + 13);
  y += 24;

  const execFields: [string, string][] = [
    ["Nombre", data.ejecutivo_nombre],
    ["Celular", data.ejecutivo_celular],
    ["Intentos de llamada", data.intentos_llamada],
    ["Observaciones", data.observaciones],
    ["Hubo tripartita", data.hubo_tripartita],
    ["Hora de contacto", data.hora_contacto],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Campo", "Valor"]],
    body: execFields.map(([label, value]) => [label, value ?? "—"]),
    theme: "grid",
    headStyles: { fillColor: [47, 127, 214], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 120, fontStyle: "bold" } },
    margin: { left: 40, right: 40 },
    tableLineColor: [180, 180, 180],
  });

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    const reportCode = variant === "ap" ? "AP" : "CG";
    doc.text(
      `DOKKA Desk — Reporte ${reportCode}-${data.nro} — Página ${i} de ${pageCount}`,
      pageW / 2,
      pageH - 20,
      { align: "center" },
    );
  }

  const reportCode = variant === "ap" ? "AP" : "CG";
  doc.save(`reporte_${reportCode}-${data.nro}.pdf`);
}
