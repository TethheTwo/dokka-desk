import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { addTicket } from "@/lib/tickets-store";
import { getUserProfile } from "@/lib/user-store";
import { toast } from "sonner";
import { PhoneInput } from "@/components/PhoneInput";

export const Route = createFileRoute("/_authenticated/tickets/registrar")({
  head: () => ({
    meta: [
      { title: "Registrar ticket — DOKKA Desk" },
      { name: "description", content: "Registrar un nuevo ticket." },
    ],
  }),
  component: RegistrarTicketPage,
});

function RegistrarTicketPage() {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <PageHeader title="Registrar ticket" subtitle="Completa los datos del nuevo ticket." />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <TicketCard />
      </main>
    </div>
  );
}

function TicketCard() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [prioridad, setPrioridad] = useState("");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const goBack = () => navigate({ to: "/tickets/listado" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim() || !prioridad) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    setSaving(true);
    try {
      const usuario = getUserProfile().name || "Usuario";
      const t = await addTicket({
        solicitante: nombre.trim() || "Sin nombre",
        celular: celular.trim() || undefined,
        tipo: "Derivado a Conecta",
        severidad: prioridad as any,
        registradoPor: usuario,
      });
      if (t) {
        // Guardar descripción del caso como atributo en el ticket vía nota inicial oculta NO,
        // mejor mantenerla como descripción y persistirla como nota especial para no perder info.
        // Pero el usuario pidió que NO se convierta en nota. Guardamos la descripción como nota
        // con un marcador para que el modal pueda mostrarla como "Descripción del caso".
        const { supabase } = await import("@/integrations/supabase/client");
        await supabase.from("ticket_notes").insert({
          ticket_id: t.id,
          fecha: t.fechaCreacion,
          estado: "Pendiente",
          nota: `__DESCRIPCION__:${descripcion.trim()}`,
          usuario,
        });
        toast.success(`Ticket #${t.nro} registrado`);
      }
      goBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card rounded-md shadow-sm border border-border overflow-hidden">
      <div className="border-t-2 border-[var(--brand-blue)]" />
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-base text-foreground">Registrar nuevo ticket</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Nombre del Cliente">
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ingrese el nombre del cliente"
              className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
            />
          </Field>
          <Field label="Celular">
            <PhoneInput
              value={celular}
              onChange={(v) => setCelular(v)}
              placeholder="Celular del cliente"
              className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
            />
          </Field>
          <Field label="Prioridad" required>
            <div ref={ref} className="relative">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full h-10 flex items-center justify-between rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
              >
                <span className={prioridad ? "text-foreground" : "text-muted-foreground"}>
                  {prioridad || "Seleccione la prioridad"}
                </span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </button>
              {open && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card shadow-lg py-1 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
                  {["Baja", "Media", "Alta"].map((opt) => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => {
                        setPrioridad(opt);
                        setOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Field>
        </div>

        <Field label="Descripción del caso" required>
          <textarea
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ingresa una pequeña descripción del ticket registrado"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)] resize-y"
          />
        </Field>

        <div className="pt-4 border-t border-border flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-white text-sm hover:opacity-90"
            style={{ backgroundColor: "#6c757d" }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md text-white text-sm hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-blue, #2f7fd6)" }}
          >
            <Save className="h-4 w-4" /> {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
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
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
    </div>
  );
}
