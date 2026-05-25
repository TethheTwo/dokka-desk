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

  // Adjuntos con imágenes embebidas en tabla
  const allAttachments: (TicketAttachment & { noteRef: string })[] = [
    ...ticket.attachments.map((a) => ({ ...a, noteRef: "Ticket" })),
    ...ticket.notes.flatMap((n) =>
      n.attachments.map((a) => ({
        ...a,
        noteRef: `${format(new Date(n.fecha), "dd/MM HH:mm")} - ${n.usuario}`,
      })),
    ),
  ];

  // Fetch images antes de construir la tabla
  const imageCache = new Map<string, string>();
  await Promise.all(
    allAttachments
      .filter((a) => a.type.startsWith("image/"))
      .map(async (a) => {
        try {
          const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/ticket-attachments/${a.storage_path}`);
          if (resp.ok) {
            const blob = await resp.blob();
            imageCache.set(a.storage_path, await blobToBase64(blob));
          }
        } catch {}
      }),
  );

  if (allAttachments.length > 0) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 40);
    doc.text(`Adjuntos (${allAttachments.length})`, 40, nextY);

    const maxImgH = 80;
    autoTable(doc, {
      startY: nextY + 6,
      head: [["Nota", "Archivo", "Vista previa"]],
      body: allAttachments.map((a) => [
        a.noteRef,
        a.name,
        a.type.startsWith("image/") ? "" : a.type,
      ]),
      theme: "grid",
      headStyles: { fillColor: [47, 127, 214], textColor: 255, fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 120 },
      },
      margin: { left: 40, right: 40 },
      didDrawCell: (data: any) => {
        if (data.column.index === 2 && data.cell.section === "body") {
          const attach = allAttachments[data.row.index];
          if (attach && attach.type.startsWith("image/")) {
            const b64 = imageCache.get(attach.storage_path);
            if (b64) {
              const pad = 3;
              const x = data.cell.x + pad;
              const y = data.cell.y + pad;
              const cellW = data.cell.width - pad * 2;
              const cellH = data.cell.height - pad * 2;
              try {
                const img = new Image();
                img.src = b64;
                const natW = img.naturalWidth || cellW;
                const natH = img.naturalHeight || cellH;
                const scale = Math.min(cellW / natW, cellH / natH, maxImgH / natH);
                const drawW = natW * scale;
                const drawH = natH * scale;
                const cx = x + (cellW - drawW) / 2;
                const cy = y + (cellH - drawH) / 2;
                doc.addImage(b64, "JPEG" as any, cx, cy, drawW, drawH);
              } catch {}
            }
          }
        }
      },
    });
    nextY = (doc as any).lastAutoTable.finalY + 24;
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
