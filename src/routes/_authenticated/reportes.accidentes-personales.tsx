import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Search, Share2 } from "lucide-react";
import { format } from "date-fns";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { ReportPreviewModal } from "@/components/ReportPreviewModal";
import { ShareReportModal } from "@/components/ShareReportModal";
import { DownloadMenu } from "@/components/DownloadMenu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePermissions } from "@/lib/permissions";
import { useMasterList } from "@/lib/master-lists";
import { exportAPPDF, exportAPXLSX, type ReportAPRow } from "@/lib/report-exports";
import { PhoneInput } from "@/components/PhoneInput";
import { formatCode } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reportes/accidentes-personales")({
  ssr: false,
  head: () => ({ meta: [{ title: "Accidentes Personales — DOKKA Desk" }] }),
  component: APPage,
});

type Row = ReportAPRow & { id: string };

const DEPTOS = [
  "La Paz",
  "Santa Cruz",
  "Cochabamba",
  "Oruro",
  "Potosí",
  "Chuquisaca",
  "Tarija",
  "Beni",
  "Pando",
];
const YESNO = ["Sí", "No"];

const today = () => new Date().toISOString().slice(0, 10);

function APPage() {
  const { profile, user } = useAuth();
  const { can } = usePermissions();
  const canDownload = can("download_records");
  const canDeleteReport = can("delete_reports");
  const canShare = can("share_reports");

  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Row | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);
  const [toShare, setToShare] = useState<Row | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const ejecutivos = useMasterList("ejecutivos");

  const colaborador = profile?.full_name || profile?.username || user?.email || "";

  const empty = useMemo(
    () => ({
      colaborador,
      fecha_solicitud: today(),
      fecha_siniestro: today(),
      nombre_accidentado: "",
      carnet_accidentado: "",
      solicitante: "",
      celular: "",
      departamento: "",
      poliza: "",
      direccion: "",
      descripcion: "",
      ejecutivo_nombre: "",
      ejecutivo_celular: "",
      intentos_llamada: "",
      observaciones: "",
      hubo_tripartita: "",
      hora_contacto: "",
    }),
    [colaborador],
  );

  const [form, setForm] = useState(empty);
  useEffect(() => {
    setForm((f) => ({ ...f, colaborador }));
  }, [colaborador]);

  const load = async () => {
    const { data } = await supabase
      .from("reportes_ap")
      .select("*")
      .order("nro", { ascending: false });
    setRows((data ?? []) as unknown as Row[]);
  };
  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const onEjecutivo = (label: string) => {
    const it = ejecutivos.find((e) => e.label === label);
    setForm((f) => ({
      ...f,
      ejecutivo_nombre: label,
      ejecutivo_celular: (it?.value as any)?.phone ?? "",
    }));
  };

  const submit = async () => {
    if (!form.nombre_accidentado?.trim()) {
      toast.error("Ingresá el nombre del accidentado.");
      return;
    }
    setSaving(true);
    try {
      await supabase.from("reportes_ap").insert({ ...form, created_by: user?.id ?? null });
      setForm(empty);
      setOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await supabase.from("reportes_ap").delete().eq("id", toDelete.id);
    toast.success(`Reporte #${toDelete.nro} eliminado`);
    setToDelete(null);
    await load();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.nro,
        r.created_at && format(new Date(r.created_at), "dd/MM/yyyy HH:mm"),
        r.nombre_accidentado,
        r.carnet_accidentado,
        r.solicitante,
        r.departamento,
        r.ejecutivo_nombre,
        r.colaborador,
        r.celular,
        r.poliza,
        r.direccion,
        r.descripcion,
        r.observaciones,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <PageHeader
          title="Accidentes Personales"
          subtitle="Registro de siniestros de accidentes personales."
          actions={
            <div className="flex items-center gap-2">
              <DownloadMenu
                hidden={!canDownload}
                onPDF={(r) => exportAPPDF(rows as unknown as ReportAPRow[], r, colaborador)}
                onExcel={(r) => exportAPXLSX(rows as unknown as ReportAPRow[], r)}
              />
              <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--brand-blue)] text-white text-sm font-medium hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Nuevo registro
              </button>
            </div>
          }
        />

        <div className="rounded-xl bg-card border border-border shadow-sm p-3 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar"
              className="w-full h-9 pl-10 pr-3 rounded-md border border-input bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/40"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Accidentado</th>
                <th className="px-4 py-3">Carnet</th>
                <th className="px-4 py-3">Solicitante</th>
                <th className="px-4 py-3">Departamento</th>
                <th className="px-4 py-3">Ejecutivo</th>
                <th className="px-4 py-3">Colaborador</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
                    Sin registros.
                  </td>
                </tr>
              ) : (
                paged.map((r) => {
                  const d = r.created_at ? new Date(r.created_at) : null;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                      onClick={() => setPreview(r)}
                    >
                      <td className="px-4 py-3 font-medium text-[var(--brand-blue)]">
                        {formatCode("AP", r.nro)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 leading-tight">
                        {d ? (
                          <>
                            <div>{format(d, "dd/MM/yyyy")}</div>
                            <div className="text-xs">{format(d, "HH:mm")}</div>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">{r.nombre_accidentado ?? "-"}</td>
                      <td className="px-4 py-3">{r.carnet_accidentado ?? "-"}</td>
                      <td className="px-4 py-3">{r.solicitante ?? "-"}</td>
                      <td className="px-4 py-3">{r.departamento ?? "-"}</td>
                      <td className="px-4 py-3">{r.ejecutivo_nombre ?? "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.colaborador}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center justify-end gap-1">
                          {canShare && (
                            <button
                              onClick={() => setToShare(r)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-[var(--brand-blue)] hover:bg-[var(--brand-blue)]/10 transition-colors"
                              title="Compartir"
                            >
                              <Share2 className="h-4 w-4" />
                            </button>
                          )}
                          {canDeleteReport && (
                            <button
                              onClick={() => setToDelete(r)}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-8 min-w-8 px-2 rounded-md text-sm transition-colors ${
                  p === currentPage
                    ? "bg-[var(--brand-blue)] text-white"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-[var(--brand-blue)] shadow-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo registro — Accidentes Personales</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
            <Field label="Colaborador">
              <input disabled value={form.colaborador} className={inputCls + " opacity-70"} />
            </Field>
            <Field label="Fecha de solicitud">
              <input
                type="date"
                value={form.fecha_solicitud}
                onChange={(e) => setForm({ ...form, fecha_solicitud: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Fecha de siniestro">
              <input
                type="date"
                value={form.fecha_siniestro}
                onChange={(e) => setForm({ ...form, fecha_siniestro: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Nombre del accidentado">
              <input
                value={form.nombre_accidentado}
                onChange={(e) => setForm({ ...form, nombre_accidentado: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Carnet del accidentado">
              <input
                value={form.carnet_accidentado}
                onChange={(e) => setForm({ ...form, carnet_accidentado: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Solicitante">
              <input
                value={form.solicitante}
                onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Celular">
              <PhoneInput
                value={form.celular}
                onChange={(v) => setForm({ ...form, celular: v })}
                className={inputCls}
              />
            </Field>
            <Field label="Departamento">
              <SelectBox
                value={form.departamento}
                onChange={(v) => setForm({ ...form, departamento: v })}
                options={DEPTOS}
              />
            </Field>
            <Field label="Póliza">
              <input
                value={form.poliza}
                onChange={(e) => setForm({ ...form, poliza: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Dirección">
              <input
                value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Ejecutivo de cuenta">
              <SelectBox
                value={form.ejecutivo_nombre}
                onChange={onEjecutivo}
                options={ejecutivos.map((e) => e.label)}
              />
            </Field>
            <Field label="Celular del ejecutivo">
              <PhoneInput
                value={form.ejecutivo_celular}
                onChange={(v) => setForm({ ...form, ejecutivo_celular: v })}
                className={inputCls}
              />
            </Field>
            <Field label="Intentos de llamada">
              <input
                value={form.intentos_llamada}
                onChange={(e) => setForm({ ...form, intentos_llamada: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Hubo tripartita">
              <SelectBox
                value={form.hubo_tripartita}
                onChange={(v) => setForm({ ...form, hubo_tripartita: v })}
                options={YESNO}
              />
            </Field>
            <Field label="Hora de contacto">
              <input
                type="time"
                value={form.hora_contacto}
                onChange={(e) => setForm({ ...form, hora_contacto: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Descripción" full>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={3}
                className={inputCls + " py-2 h-auto"}
              />
            </Field>
            <Field label="Observaciones" full>
              <textarea
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                rows={3}
                className={inputCls + " py-2 h-auto"}
              />
            </Field>
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              className="h-10 px-4 rounded-md border border-border text-sm hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              disabled={saving}
              onClick={submit}
              className="h-10 px-4 rounded-md bg-[var(--brand-blue)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el reporte{" "}
              <strong>{toDelete ? formatCode("AP", toDelete.nro) : ""}</strong> de{" "}
              <strong>{toDelete?.nombre_accidentado ?? "—"}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportPreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Accidentes Personales"
        nro={preview?.nro ?? ""}
        variant="ap"
        data={preview ?? undefined}
      />

      {toShare && (
        <ShareReportModal
          open={!!toShare}
          onClose={() => setToShare(null)}
          variant="ap"
          data={toShare as any}
        />
      )}
    </div>
  );
}

const inputCls =
  "w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]";

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function SelectBox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className="h-10">
        <SelectValue placeholder="Seleccionar…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
