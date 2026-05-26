import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { AppTopBar } from "@/components/AppTopBar";
import { DownloadMenu } from "@/components/DownloadMenu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { exportAuditXLSX, type AuditRow as AuditRowExport } from "@/lib/report-exports";
import { formatCode } from "@/lib/utils";
import { getPaginationItems } from "@/lib/pagination";

export const Route = createFileRoute("/_authenticated/reportes/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoría — DOKKA Desk" },
      { name: "description", content: "Registro de acciones del sistema." },
    ],
  }),
  component: AuditoriaPage,
});

interface AuditRow {
  id: string;
  created_at: string;
  username: string | null;
  user_email: string | null;
  action: string;
  entity: string;
  ticket_nro: number | null;
  details: Record<string, unknown>;
}

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

const ACTION_COLOR: Record<string, string> = {
  ticket_created: "bg-emerald-100 text-emerald-700",
  ticket_deleted: "bg-red-100 text-red-700",
  ticket_state_changed: "bg-sky-100 text-sky-700",
  note_added: "bg-blue-100 text-blue-700",
  note_deleted: "bg-rose-100 text-rose-700",
  attachment_added: "bg-violet-100 text-violet-700",
  attachment_deleted: "bg-rose-100 text-rose-700",
  cg_created: "bg-emerald-100 text-emerald-700",
  cg_updated: "bg-sky-100 text-sky-700",
  cg_deleted: "bg-red-100 text-red-700",
  ap_created: "bg-emerald-100 text-emerald-700",
  ap_updated: "bg-sky-100 text-sky-700",
  ap_deleted: "bg-red-100 text-red-700",
};

function displayUser(r: { username: string | null; user_email: string | null }) {
  return r.username || (r.user_email ? r.user_email.split("@")[0] : "—");
}

function codeFromRow(r: { entity: string; ticket_nro: number | null }) {
  if (r.ticket_nro == null) return "—";
  const prefix = r.entity === "reporte_cg" ? "CG" : r.entity === "reporte_ap" ? "AP" : "TK";
  return formatCode(prefix as "TK" | "CG" | "AP", r.ticket_nro);
}

function AuditoriaPage() {
  const { roles, loading: authLoading } = useAuth();
  const canSee = roles.includes("administrador") || roles.includes("supervisor");

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<string>("");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!canSee) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (!active) return;
      if (error) {
        console.error(error);
        setRows([]);
      } else setRows((data ?? []) as AuditRow[]);
      setLoading(false);
    };
    void load();
    const ch = supabase
      .channel("audit-log-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        () => void load(),
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [canSee]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (action && r.action !== action) return false;
      if (q) {
        const blob = [
          displayUser(r),
          r.user_email ?? "",
          r.action,
          r.entity,
          codeFromRow(r),
          JSON.stringify(r.details ?? {}),
        ]
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [rows, action, search]);

  useEffect(() => {
    setPage(1);
  }, [search, action, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!authLoading && !canSee) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <AppTopBar />
        <main className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-xl font-semibold mb-2">Sin permisos</h1>
          <p className="text-muted-foreground">
            Solo administradores y supervisores pueden ver el registro de auditoría.
          </p>
          <Link to="/" className="text-[var(--brand-blue)] hover:underline mt-4 inline-block">
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <div className="bg-card border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <h1 className="text-lg font-semibold">Auditoría del sistema</h1>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
          <div className="border-t-2 border-[var(--brand-blue)]" />
          <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base">Registro de acciones</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {filtered.length} de {rows.length} registros
              </span>
              <DownloadMenu
                onPDF={async (r) => {
                  await exportAuditXLSX(filtered as unknown as AuditRowExport[], r);
                }}
                onExcel={async (r) => {
                  await exportAuditXLSX(filtered as unknown as AuditRowExport[], r);
                }}
              />
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                Acción:
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">Todas</option>
                  {Object.entries(ACTION_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm flex-1 min-w-[200px]">
                Buscar:
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Usuario, ticket, detalle…"
                  className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                Por página:
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                </select>
              </label>
            </div>

            <div className="overflow-x-auto border border-border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-semibold border-b border-border">Fecha</th>
                    <th className="px-3 py-2 font-semibold border-b border-border">Usuario</th>
                    <th className="px-3 py-2 font-semibold border-b border-border">Acción</th>
                    <th className="px-3 py-2 font-semibold border-b border-border">Ticket</th>
                    <th className="px-3 py-2 font-semibold border-b border-border">Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        Cargando…
                      </td>
                    </tr>
                  )}
                  {!loading && paged.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        Sin registros
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    paged.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-border last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-3 py-2 whitespace-nowrap text-xs">
                          {format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss")}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium">{displayUser(r)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs ${ACTION_COLOR[r.action] ?? "bg-muted text-foreground"}`}
                          >
                            {ACTION_LABEL[r.action] ?? r.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">{codeFromRow(r)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          <DetailCell details={r.details} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-2">
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
        </div>
      </main>
    </div>
  );
}

function DetailCell({ details }: { details: Record<string, unknown> }) {
  if (!details || Object.keys(details).length === 0) return <span>—</span>;
  return (
    <div className="space-y-0.5">
      {Object.entries(details).map(([k, v]) => (
        <div key={k}>
          <span className="font-semibold text-foreground/70">{k}:</span>{" "}
          <span>{typeof v === "string" ? v : JSON.stringify(v)}</span>
        </div>
      ))}
    </div>
  );
}
