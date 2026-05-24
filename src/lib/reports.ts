import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Ticket, TicketAttachment } from "@/lib/tickets-store";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "http://localhost:3000";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const BRAND = "#2f7fd6";

export function downloadTicketsCSV(tickets: Ticket[], filename = "tickets.csv") {
  const headers = [
    "Nro",
    "Fecha",
    "Solicitante",
    "Contratante",
    "Departamento",
    "Celular",
    "Poliza",
    "Tipo",
    "Tipo Asistencia",
    "Severidad",
    "Registrado por",
    "Estado",
    "Cerrado por",
    "Notas",
  ];
  const rows = tickets.map((t) => [
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
    t.registradoPor,
    t.estado,
    t.cerradoPor,
    String(t.notes.length),
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadTicketPDF(ticket: Ticket) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(BRAND);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("DOKKA Desk", 40, 28);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Reporte de ticket #${ticket.nro}`, 40, 46);

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageW - 40, 46, {
    align: "right",
  });

  let y = 90;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Datos del ticket", 40, y);
  y += 6;

  const info: [string, string][] = [
    ["Nro.", String(ticket.nro)],
    ["Fecha de registro", format(new Date(ticket.fechaCreacion), "dd/MM/yyyy HH:mm")],
    ["Tipo", ticket.tipo],
    ...(ticket.tipoAsistencia
      ? [["Tipo de asistencia", ticket.tipoAsistencia] as [string, string]]
      : []),
    ["Solicitante", ticket.solicitante],
    ...(ticket.contratante ? [["Contratante", ticket.contratante] as [string, string]] : []),
    ...(ticket.departamento ? [["Departamento", ticket.departamento] as [string, string]] : []),
    ...(ticket.celular ? [["Celular", ticket.celular] as [string, string]] : []),
    ...(ticket.poliza ? [["Póliza", ticket.poliza] as [string, string]] : []),
    ["Severidad", ticket.severidad],
    ["Estado actual", ticket.estado],
    ["Registrado por", ticket.registradoPor],
    ["Cerrado por", ticket.cerradoPor],
  ];

  autoTable(doc, {
    startY: y + 4,
    head: [["Campo", "Valor"]],
    body: info,
    theme: "grid",
    headStyles: { fillColor: [47, 127, 214], textColor: 255, fontSize: 10 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 140, fontStyle: "bold" } },
    margin: { left: 40, right: 40 },
  });

  let nextY = (doc as any).lastAutoTable.finalY + 24;

  // Notas
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text(`Historial de notas (${ticket.notes.length})`, 40, nextY);

  if (ticket.notes.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text("Sin notas registradas.", 40, nextY + 16);
    nextY += 30;
  } else {
    autoTable(doc, {
      startY: nextY + 6,
      head: [["Fecha", "Estado", "Usuario", "Nota"]],
      body: ticket.notes.map((n) => [
        format(new Date(n.fecha), "dd/MM/yyyy HH:mm"),
        n.estado,
        n.usuario,
        (n.nota || "(sin texto)") +
          (n.attachments.length
            ? `\n[Adjuntos: ${n.attachments.map((a) => a.name).join(", ")}]`
            : ""),
      ]),
      theme: "striped",
      headStyles: { fillColor: [47, 127, 214], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 9, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 80 },
        2: { cellWidth: 100 },
      },
      margin: { left: 40, right: 40 },
    });
    nextY = (doc as any).lastAutoTable.finalY + 24;
  }

  // Adjuntos
  const allAttachments: TicketAttachment[] = [
    ...ticket.attachments,
    ...ticket.notes.flatMap((n) => n.attachments),
  ];
  const imageAttachments = allAttachments.filter((a) => a.type.startsWith("image/"));

  if (allAttachments.length > 0) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(`Adjuntos (${allAttachments.length})`, 40, nextY);
    autoTable(doc, {
      startY: nextY + 6,
      head: [["Nombre", "Tipo"]],
      body: allAttachments.map((a) => [a.name, a.type]),
      theme: "grid",
      headStyles: { fillColor: [47, 127, 214], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 40, right: 40 },
    });
    nextY = (doc as any).lastAutoTable.finalY + 24;
  }

  // Imágenes adjuntas embebidas
  for (const img of imageAttachments) {
    try {
      const url = `${SUPABASE_URL}/storage/v1/object/ticket-attachments/${img.storage_path}`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const blob = await resp.blob();
      const base64 = await blobToBase64(blob);

      if (nextY + 220 > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        nextY = 40;
      }

      const maxW = doc.internal.pageSize.getWidth() - 80;
      doc.addImage(base64, "JPEG" as any, 40, nextY, maxW, 200);
      nextY += 210;

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(img.name, 40, nextY);
      nextY += 14;
    } catch (e) {
      console.error("Error embedding image in PDF:", img.name, e);
    }
  }

  // Pie de página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `DOKKA Desk — Ticket #${ticket.nro} — Página ${i} de ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  doc.save(`ticket-${ticket.nro}.pdf`);
}
