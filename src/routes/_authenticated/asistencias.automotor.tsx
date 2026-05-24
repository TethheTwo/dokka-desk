import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { useRef, useState, useEffect } from "react";
import {
  ChevronDown,
  Save,
  Paperclip,
  X,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { addTicket, addTicketNote, fileToAttachment, type Severidad } from "@/lib/tickets-store";
import { getUserProfile } from "@/lib/user-store";
import { SelectMasterList } from "@/components/SelectMasterList";
import { PhoneInput } from "@/components/PhoneInput";

export const Route = createFileRoute("/_authenticated/asistencias/automotor")({
  head: () => ({
    meta: [
      { title: "Asistencia Automotor — DOKKA Desk" },
      { name: "description", content: "Registrar nueva asistencia automotor." },
    ],
  }),
  component: AsistenciaAutomotorPage,
});

function AsistenciaAutomotorPage() {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <PageHeader title="Asistencia Automotor" subtitle="Registrar nueva asistencia automotor." />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <AsistenciaCard />
      </main>
    </div>
  );
}

const DEPARTAMENTOS = [
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

const TEXT_FIELDS: { key: string; label: string; placeholder: string }[] = [
  { key: "solicitante", label: "Nombre del solicitante", placeholder: "Nombre del solicitante" },
  { key: "contratante", label: "Nombre del Contratante", placeholder: "Nombre del contratante" },
  { key: "celular", label: "Celular", placeholder: "Número de celular" },
  { key: "poliza", label: "Póliza", placeholder: "Número de póliza" },
  { key: "placa", label: "Placa", placeholder: "Placa del vehículo" },
  { key: "marca", label: "Marca", placeholder: "Marca del vehículo" },
  { key: "modelo", label: "Modelo", placeholder: "Modelo del vehículo" },
];

const ADDRESS_FIELDS: { key: string; label: string; placeholder: string; required: boolean }[] = [
  {
    key: "direccionAsiste",
    label: "Dirección donde se asiste",
    placeholder: "Dirección donde se asiste",
    required: true,
  },
  {
    key: "direccionLleva",
    label: "Dirección donde se llevará",
    placeholder: "Dirección donde se llevará",
    required: false,
  },
];

function AsistenciaCard() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>({
    rudasGiran: "",
    vigente: "",
  });
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const resetForm = () => {
    setForm({ rudasGiran: "", vigente: "" });
    setAttachments([]);
  };

  const handleCancel = () => {
    resetForm();
    navigate({ to: "/tickets/listado" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const atts = attachments;
    const usuario = getUserProfile().name || "Usuario";
    const ticket = await addTicket({
      solicitante: (form.solicitante ?? "").trim() || "Sin nombre",
      contratante: (form.contratante ?? "").trim() || undefined,
      departamento: (form.departamento ?? "").trim() || undefined,
      celular: (form.celular ?? "").trim() || undefined,
      poliza: (form.poliza ?? "").trim() || undefined,
      tipo: "Asistencia Automotor",
      tipoAsistencia: (form.tipoAsistencia ?? "").trim() || undefined,
      severidad: "Media" as Severidad,
      registradoPor: usuario,
      attachments: atts,
    });
    const extras: { label: string; value: string }[] = [
      { label: "Placa", value: (form.placa ?? "").trim() },
      { label: "Marca", value: (form.marca ?? "").trim() },
      { label: "Modelo", value: (form.modelo ?? "").trim() },
      { label: "Ruedas giran", value: (form.rudasGiran ?? "").trim() },
      { label: "Dirección donde se asiste", value: (form.direccionAsiste ?? "").trim() },
      { label: "Dirección donde se llevará", value: (form.direccionLleva ?? "").trim() },
      { label: "Se encuentra vigente", value: (form.vigente ?? "").trim() },
    ].filter((f) => f.value);
    if (extras.length) {
      const nota = extras.map((f) => `${f.label}: ${f.value}`).join("\n");
      if (ticket)
        await addTicketNote(ticket.nro, {
          fecha: ticket.fechaCreacion,
          estado: "Pendiente",
          nota,
          usuario,
          attachments: [],
        });
    }
    resetForm();
    navigate({ to: "/tickets/listado" });
  };

  return (
    <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
      <div className="border-t-2 border-[var(--brand-blue)]" />
      <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">
          Registrar nueva asistencia automotor
        </h2>
        <button
          type="button"
          onClick={() => setAttachOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border bg-white hover:bg-muted text-sm font-medium text-foreground transition-colors"
        >
          <Paperclip className="h-4 w-4 text-[var(--brand-blue)]" />
          Adjuntos
          {attachments.length > 0 && (
            <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--brand-blue)] text-white text-xs font-semibold">
              {attachments.length}
            </span>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Departamento" required>
            <SelectDepartamento
              value={form.departamento}
              onChange={(v) => set("departamento", v)}
            />
          </Field>

          {TEXT_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} required>
              {f.key === "celular" ? (
                <PhoneInput
                  value={form[f.key] ?? ""}
                  onChange={(v) => set(f.key, v)}
                  placeholder={f.placeholder}
                  className="form-input"
                />
              ) : (
                <input
                  type="text"
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="form-input"
                />
              )}
            </Field>
          ))}

          <Field label="Ruedas giran" required>
            <SelectSiNo value={form.rudasGiran} onChange={(v) => set("rudasGiran", v)} />
          </Field>

          {ADDRESS_FIELDS.map((f) => (
            <Field key={f.key} label={f.label} required={f.required}>
              <input
                type="text"
                value={form[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="form-input"
              />
            </Field>
          ))}

          <Field label="Tipo de asistencia" required>
            <SelectMasterList
              listKey="asist_automotor"
              value={form.tipoAsistencia ?? ""}
              onChange={(v) => set("tipoAsistencia", v)}
              placeholder="Seleccione el tipo de asistencia"
            />
          </Field>

          <Field label="Se encuentra vigente" required>
            <SelectSiNo value={form.vigente} onChange={(v) => set("vigente", v)} />
          </Field>
        </div>

        <div className="pt-4 border-t border-border flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center px-4 py-2 rounded-sm bg-[var(--btn-gray)] hover:bg-[var(--btn-gray-hover)] text-white text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-sm bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-white text-sm font-medium transition-colors"
          >
            <Save className="h-4 w-4" />
            Guardar
          </button>
        </div>
      </form>

      {attachOpen && (
        <AttachmentsModal
          files={attachments}
          onChange={setAttachments}
          onClose={() => setAttachOpen(false)}
        />
      )}
    </div>
  );
}

function AttachmentsModal({
  files,
  onChange,
  onClose,
}: {
  files: File[];
  onChange: (f: File[]) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const ACCEPT = "image/*,application/pdf,.doc,.docx,.xls,.xlsx";

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    onChange([...files, ...incoming]);
  };

  const removeAt = (i: number) => onChange(files.filter((_, idx) => idx !== i));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length) {
        e.preventDefault();
        onChange([...files, ...imageFiles]);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [files, onChange]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-lg shadow-xl border border-border overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Adjuntar archivos</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`cursor-pointer rounded-md border-2 border-dashed px-4 py-8 text-center transition-colors ${
              dragOver
                ? "border-[var(--brand-blue)] bg-[color-mix(in_oklab,var(--brand-blue)_8%,transparent)]"
                : "border-border bg-muted/40 hover:bg-muted"
            }`}
          >
            <UploadCloud className="mx-auto h-10 w-10 text-[var(--brand-blue)]" />
            <p className="mt-3 text-sm text-foreground">
              Arrastra, selecciona o pega una imagen con{" "}
              <kbd className="px-1.5 py-0.5 rounded-sm border border-border bg-muted text-xs font-sans">
                Ctrl
              </kbd>{" "}
              +{" "}
              <kbd className="px-1.5 py-0.5 rounded-sm border border-border bg-muted text-xs font-sans">
                V
              </kbd>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Imágenes, PDF y documentos</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <ul className="max-h-40 overflow-y-auto divide-y divide-border rounded-md border border-border">
              {files.map((f, i) => {
                const isImg = f.type.startsWith("image/");
                return (
                  <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                    {isImg ? (
                      <ImageIcon className="h-4 w-4 text-[var(--brand-blue)] shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-foreground">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(f.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Quitar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-3 py-1.5 rounded-sm bg-[var(--btn-gray)] hover:bg-[var(--btn-gray-hover)] text-white text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-3 py-1.5 rounded-sm bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-white text-sm font-medium transition-colors"
          >
            Subir archivos
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectDepartamento({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input appearance-none pr-10 text-muted-foreground"
      >
        <option value="">Seleccione un departamento</option>
        {DEPARTAMENTOS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function SelectSiNo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input appearance-none pr-10 text-muted-foreground"
      >
        <option value="">Seleccione una opción</option>
        <option value="si">Sí</option>
        <option value="no">No</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-[var(--brand-blue)]"> *</span>}
      </label>
      {children}
    </div>
  );
}
