import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  X,
  Paperclip,
  Send,
  FileText,
  Image as ImageIcon,
  FileDown,
  Search,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  addTicketNote,
  getTickets,
  openAttachment,
  removeTicket,
  subscribeTickets,
  updateTicketEstado,
  type Severidad,
  type Estado,
  type Ticket,
  type TicketAttachment,
} from "@/lib/tickets-store";
import { useCurrentUser } from "@/lib/user-store";
import { downloadTicketPDF } from "@/lib/reports";
import { exportTicketsPDF, exportTicketsXLSX } from "@/lib/report-exports";
import { DownloadMenu } from "@/components/DownloadMenu";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { usePermissions } from "@/lib/permissions";
import { formatCode } from "@/lib/utils";
import { getPaginationItems } from "@/lib/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/tickets/listado")({
  head: () => ({
    meta: [
      { title: "Listado de tickets — DOKKA Desk" },
      { name: "description", content: "Listado de tickets registrados." },
    ],
  }),
  component: ListadoTicketsPage,
});

function ListadoTicketsPage() {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <TicketsContent />
    </div>
  );
}

function TicketsContent() {
  return <TicketsCard />;
}

function TicketsCard() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canDelete = can("delete_tickets");
  const canDownload = can("download_records");
  const currentUser = useCurrentUser();
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("__all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [tickets, setTickets] = useState<Ticket[]>(() => getTickets());
  const [viewing, setViewing] = useState<Ticket | null>(null);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  useEffect(() => subscribeTickets(() => setTickets(getTickets())), []);

  // Mantener sincronizado el modal abierto cuando llegan notas en tiempo real
  useEffect(() => {
    setViewing((cur) => {
      if (!cur) return cur;
      const fresh = tickets.find((t) => t.nro === cur.nro);
      return fresh ?? cur;
    });
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (estadoFilter !== "__all" && t.estado !== estadoFilter) return false;
      if (!q) return true;
      const notesText = (t.notes ?? []).map((n) => n.nota).join(" ");
      return [
        t.nro,
        format(new Date(t.fechaCreacion), "dd/MM/yyyy HH:mm"),
        t.solicitante,
        t.tipo,
        t.severidad,
        t.registradoPor,
        t.estado,
        t.cerradoPor,
        notesText,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [search, tickets, estadoFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, estadoFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const cerrados = tickets.filter((t) => t.estado === "Cerrado").length;

  const sevPill = (s: Severidad) => {
    const map: Record<Severidad, string> = {
      Alta: "bg-orange-50 text-orange-700 ring-orange-200",
      Media: "bg-amber-50 text-amber-700 ring-amber-200",
      Baja: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
    return map[s];
  };

  const estadoPill = (e: Estado) => {
    const map: Record<Estado, string> = {
      Pendiente: "bg-rose-50 text-rose-700 ring-rose-200",
      "En atención": "bg-sky-50 text-sky-700 ring-sky-200",
      "Esperando Respuesta": "bg-indigo-50 text-indigo-700 ring-indigo-200",
      "Cliente no responde": "bg-cyan-50 text-cyan-700 ring-cyan-200",
      Actualizado: "bg-violet-50 text-violet-700 ring-violet-200",
      Cerrado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
    return map[e];
  };

  const ESTADOS: Estado[] = [
    "Pendiente",
    "En atención",
    "Esperando Respuesta",
    "Cliente no responde",
    "Actualizado",
    "Cerrado",
  ];

  const confirmDelete = (t: Ticket) => {
    if (t.estado === "Cerrado") {
      toast.error("No es posible eliminar casos cerrados", { duration: 3000 });
      return;
    }
    setTicketToDelete(t);
  };

  const handleDelete = async () => {
    if (!ticketToDelete) return;
    const ok = await removeTicket(ticketToDelete.nro);
    if (ok) toast.success(`Ticket #${ticketToDelete.nro} eliminado`, { duration: 3000 });
    else toast.error("No se pudo eliminar el ticket", { duration: 3000 });
    setTicketToDelete(null);
  };

  return (
    <>
      <PageHeader
        title="Tickets"
        subtitle={`${cerrados} de ${tickets.length} tickets`}
        actions={
          <div className="flex items-center gap-2">
            <DownloadMenu
              hidden={!canDownload}
              onPDF={(r) => exportTicketsPDF(tickets, r, currentUser.name || "Usuario")}
              onExcel={(r) => exportTicketsXLSX(tickets, r, currentUser.name || "Usuario")}
            />
            <button
              onClick={() => navigate({ to: "/tickets/registrar" })}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-white text-sm font-medium shadow-sm hover:opacity-95"
              style={{ backgroundColor: "var(--brand-blue, #2f7fd6)" }}
            >
              <Plus className="h-4 w-4" />
              Nuevo ticket
            </button>
          </div>
        }
      />
      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <div className="rounded-xl bg-card border border-border shadow-sm p-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar"
              className="w-full h-9 pl-10 pr-3 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/40"
            />
          </div>
          <div className="relative">
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="appearance-none h-9 pl-3 pr-9 rounded-md border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/40"
            >
              <option value="__all">Todos los estados</option>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3.5">Ticket</th>
                  <th className="px-5 py-3.5">Solicitante</th>
                  <th className="px-5 py-3.5">Tipo</th>
                  <th className="px-5 py-3.5">Prioridad</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Registrado por</th>
                  <th className="px-5 py-3.5">Cerrado por</th>
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.map((t) => {
                  const d = new Date(t.fechaCreacion);
                  return (
                    <tr key={t.nro} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 align-top font-medium text-[var(--brand-blue)]">
                        {formatCode("TK", t.nro)}
                      </td>
                      <td className="px-5 py-4 align-top text-slate-600">{t.solicitante}</td>
                      <td className="px-5 py-4 align-top text-slate-600">{t.tipo}</td>
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${sevPill(t.severidad)}`}
                        >
                          {t.severidad}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${estadoPill(t.estado)}`}
                        >
                          {t.estado}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-top text-slate-600">{t.registradoPor}</td>
                      <td className="px-5 py-4 align-top text-slate-600">{t.cerradoPor || "—"}</td>
                      <td className="px-5 py-4 align-top text-slate-500 leading-tight">
                        <div>{format(d, "dd MMM,")}</div>
                        <div className="text-xs">{format(d, "HH:mm")}</div>
                      </td>
                      <td className="px-5 py-4 align-top text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewing(t)}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-[var(--brand-blue)] hover:bg-slate-100"
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => confirmDelete(t)}
                              disabled={t.estado === "Cerrado"}
                              className={`h-8 w-8 inline-flex items-center justify-center rounded-lg ${t.estado === "Cerrado" ? "text-slate-300 cursor-not-allowed" : "text-slate-500 hover:text-rose-600 hover:bg-rose-50"}`}
                              title={
                                t.estado === "Cerrado"
                                  ? "No es posible eliminar casos cerrados"
                                  : "Eliminar"
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-slate-400">
                      Sin resultados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-border">
              {getPaginationItems(currentPage, totalPages).map((item, i) => {
                if (item.type === "prev") {
                  return (
                    <button
                      key="prev"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={item.disabled}
                      className="h-8 min-w-8 px-2 rounded-md text-sm border border-input hover:bg-muted disabled:opacity-40 flex items-center justify-center"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  );
                }
                if (item.type === "next") {
                  return (
                    <button
                      key="next"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={item.disabled}
                      className="h-8 min-w-8 px-2 rounded-md text-sm border border-input hover:bg-muted disabled:opacity-40 flex items-center justify-center"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  );
                }
                if (item.type === "ellipsis") {
                  return <span key={"e" + i} className="px-1 text-muted-foreground select-none">…</span>;
                }
                return (
                  <button
                    key={item.page}
                    onClick={() => setPage(item.page)}
                    className={`h-8 min-w-8 px-2 rounded-md text-sm transition-colors ${item.page === currentPage ? "bg-[var(--brand-blue)] text-white" : "text-foreground hover:bg-muted"}`}
                  >
                    {item.page}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {viewing && (
          <TicketDetailModal
            ticket={viewing}
            onClose={() => setViewing(null)}
            onChanged={(t) => setViewing(t)}
          />
        )}
        <AlertDialog
          open={!!ticketToDelete}
          onOpenChange={(open) => !open && setTicketToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar ticket?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente el ticket{" "}
                <strong>{ticketToDelete ? formatCode("TK", ticketToDelete.nro) : ""}</strong> de{" "}
                <strong>{ticketToDelete?.solicitante}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setTicketToDelete(null)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-32 text-muted-foreground">{k}:</div>
      <div className="flex-1 text-foreground">{v}</div>
    </div>
  );
}

const EDITABLE_ESTADOS: Estado[] = [
  "En atención",
  "Esperando Respuesta",
  "Cliente no responde",
  "Actualizado",
  "Cerrado",
];

function TicketDetailModal({
  ticket,
  onClose,
  onChanged,
}: {
  ticket: Ticket;
  onClose: () => void;
  onChanged: (t: Ticket) => void;
}) {
  const currentUser = useCurrentUser();
  const { can } = usePermissions();
  const isClosed = ticket.estado === "Cerrado";
  const canReopen = can("reopen_closed_cases");
  const locked = isClosed && !canReopen;
  const initialEstado: Estado = ticket.estado === "Pendiente" ? "En atención" : ticket.estado;
  const [estado, setEstado] = useState<Estado>(initialEstado);
  const [noteText, setNoteText] = useState("");
  const [noteFiles, setNoteFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setNoteFiles((p) => [...p, ...files]);
    e.target.value = "";
  };

  const handleSend = async () => {
    if (sending || locked) return;
    if (!noteText.trim() && noteFiles.length === 0) {
      toast.error("Escribe una nota o adjunta un archivo", { duration: 3000 });
      return;
    }
    setSending(true);
    try {
      const usuario = currentUser.username || currentUser.name || "Usuario";
      await addTicketNote(ticket.nro, {
        estado,
        nota: noteText.trim(),
        usuario,
        attachments: noteFiles,
      });
      if (estado !== ticket.estado) await updateTicketEstado(ticket.nro, estado, usuario);
      const updated = getTickets().find((t) => t.nro === ticket.nro);
      if (updated) onChanged(updated);
      setNoteText("");
      setNoteFiles([]);
      toast.success("Nota agregada", { duration: 3000 });
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-md shadow-xl border border-border w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-t-2 border-[var(--brand-blue)]" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h3 className="text-base font-semibold">
            Detalle de ticket {formatCode("TK", ticket.nro)} - {ticket.tipo}
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm overflow-y-auto flex-1">
          {(() => {
            const descNote = ticket.notes.find((n) => n.nota?.startsWith("__DESCRIPCION__:"));
            const desc = descNote ? descNote.nota.replace(/^__DESCRIPCION__:/, "").trim() : "";
            if (ticket.tipo === "Derivado a Conecta" && desc) {
              return (
                <div className="rounded-md border-l-4 border-[var(--brand-blue)] bg-[color-mix(in_oklab,var(--brand-blue)_6%,transparent)] p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-blue)] mb-1">
                    Descripción del caso
                  </div>
                  <div className="text-sm text-foreground whitespace-pre-wrap">{desc}</div>
                </div>
              );
            }
            return null;
          })()}
          <div className="space-y-2">
            {(() => {
              const d = new Date(ticket.fechaCreacion);
              const fecha = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
              return <Row k="Registrado el" v={fecha} />;
            })()}
            {ticket.departamento && <Row k="Departamento" v={ticket.departamento} />}
            <Row k="Solicitante" v={ticket.solicitante} />
            {ticket.contratante && <Row k="Contratante" v={ticket.contratante} />}
            {ticket.celular && <Row k="Celular" v={ticket.celular} />}
            {ticket.poliza && <Row k="Póliza" v={ticket.poliza} />}

            {ticket.tipoAsistencia && <Row k="Tipo de asistencia" v={ticket.tipoAsistencia} />}

            <Row k="Registrado por" v={ticket.registradoPor} />
            <div className="flex gap-3 items-center">
              <div className="w-32 text-muted-foreground">Estado:</div>
              <select
                value={estado}
                disabled={locked}
                onChange={(e) => setEstado(e.target.value as Estado)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {EDITABLE_ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Row k="Cerrado por" v={ticket.cerradoPor} />
          </div>

          <div>
            <div className="text-muted-foreground text-xs mb-1 font-semibold uppercase tracking-wide">
              Adjuntos del ticket
            </div>
            <div className="rounded border border-border bg-muted/20 p-3">
              {ticket.attachments.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sin adjuntos</div>
              ) : (
                <AttachmentList items={ticket.attachments} />
              )}
            </div>
          </div>

          <div>
            <div className="text-muted-foreground text-xs mb-1 font-semibold uppercase tracking-wide">
              Notas del ticket
            </div>

            {locked && (
              <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                No tienes permiso para modificar casos cerrados.
              </div>
            )}
            <div className="rounded border border-border bg-muted/10 p-3 space-y-2">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                disabled={locked}
                placeholder={
                  locked ? "Caso cerrado — sin permiso para editar" : "Escribe una nota…"
                }
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)] disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {noteFiles.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {noteFiles.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 rounded bg-card px-2 py-1 border border-border"
                    >
                      <span className="truncate">{f.name}</span>
                      <button
                        onClick={() => setNoteFiles((p) => p.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={locked}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-border bg-card hover:bg-muted text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Adjuntar"
                >
                  <Paperclip className="h-3.5 w-3.5 text-[var(--brand-blue)]" /> Adjuntar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={handleAttach}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || locked}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "var(--brand-blue, #2f7fd6)" }}
                >
                  <Send className="h-3.5 w-3.5" /> Enviar
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-foreground text-sm mb-2 font-semibold">Historial</div>
              <div className="rounded border border-border bg-card overflow-hidden">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr className="text-left text-foreground">
                        <th className="px-3 py-2 font-semibold w-32">Fecha</th>
                        <th className="px-3 py-2 font-semibold w-28">Estado</th>
                        <th className="px-3 py-2 font-semibold">Nota</th>
                        <th className="px-3 py-2 font-semibold w-48">Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ticket.notes.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-4 text-center text-muted-foreground italic"
                          >
                            Aún no hay notas registradas.
                          </td>
                        </tr>
                      )}
                      {[...ticket.notes]
                        .filter((n) => !n.nota?.startsWith("__DESCRIPCION__:"))
                        .reverse()
                        .map((n, idx) => {
                          const d = new Date(n.fecha);
                          const fecha = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                          return (
                            <tr
                              key={n.id}
                              className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                            >
                              <td className="px-3 py-3 align-top whitespace-pre-line text-foreground">
                                {fecha.replace(" ", "\n")}
                              </td>
                              <td className="px-3 py-3 align-top">
                                <HistoryBadge estado={n.estado} />
                              </td>
                              <td className="px-3 py-3 align-top text-foreground">
                                <div className="whitespace-pre-line">
                                  {n.nota || <em className="text-muted-foreground">(sin texto)</em>}
                                </div>
                                {n.attachments.length > 0 && (
                                  <ul className="mt-1.5 space-y-1">
                                    {n.attachments.map((a, i) => (
                                      <li key={i} className="flex items-center gap-1.5">
                                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                                        <button
                                          type="button"
                                          onClick={() => openAttachment(a)}
                                          className="text-[var(--brand-blue)] hover:underline truncate text-left"
                                        >
                                          {a.name}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </td>
                              <td className="px-3 py-3 align-top text-foreground">{n.usuario}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border bg-muted/20 shrink-0">
          <button
            onClick={() => downloadTicketPDF(ticket)}
            className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-input text-sm hover:bg-muted"
          >
            <FileDown className="h-3.5 w-3.5" /> Descargar PDF
          </button>
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-md border border-input text-sm hover:bg-muted"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryBadge({ estado }: { estado: Estado }) {
  const map: Record<Estado, string> = {
    Pendiente: "bg-emerald-500 text-white border-transparent",
    "En atención": "bg-sky-500 text-white border-transparent",
    "Esperando Respuesta": "bg-amber-200 text-amber-900 border-transparent",
    "Cliente no responde": "bg-cyan-500 text-white border-transparent",
    Actualizado: "bg-emerald-500 text-white border-transparent",
    Cerrado: "bg-rose-500 text-white border-transparent",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${map[estado]}`}
    >
      {estado}
    </span>
  );
}

function AttachmentList({ items }: { items: TicketAttachment[] }) {
  return (
    <ul className="space-y-1">
      {items.map((a, i) => {
        const isImg = a.type.startsWith("image/");
        return (
          <li key={i} className="flex items-center gap-2 text-xs">
            {isImg ? (
              <ImageIcon className="h-3.5 w-3.5 text-[var(--brand-blue)]" />
            ) : (
              <FileText className="h-3.5 w-3.5 text-[var(--brand-blue)]" />
            )}
            <button
              type="button"
              onClick={() => openAttachment(a)}
              className="text-[var(--brand-blue)] hover:underline truncate text-left"
            >
              {a.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
