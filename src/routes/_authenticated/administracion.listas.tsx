import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/lib/auth";
import {
  useMasterList,
  addListItem,
  updateListItem,
  deleteListItem,
  type ListKey,
  type ListItem,
} from "@/lib/master-lists";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/administracion/listas")({
  ssr: false,
  head: () => ({ meta: [{ title: "Listas maestras — DOKKA Desk" }] }),
  component: ListasPage,
});

const TABS: { key: ListKey; label: string; withPhone?: boolean; withDept?: boolean }[] = [
  { key: "ejecutivos", label: "Ejecutivos", withPhone: true },
  { key: "correos", label: "Correos", withDept: true },
  { key: "asist_mascotas", label: "Asist. Mascotas" },
  { key: "asist_bici", label: "Asist. Bici" },
  { key: "asist_automotor", label: "Asist. Automotor" },
  { key: "asist_hogar", label: "Asist. Hogar" },
];

function ListasPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("administrador");
  const [active, setActive] = useState<ListKey>("ejecutivos");
  const items = useMasterList(active);
  const tab = TABS.find((t) => t.key === active)!;

  const [editing, setEditing] = useState<ListItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [dept, setDept] = useState("");

  const nameLabel = tab.withDept ? "Correo" : "Nombre";

  const openCreate = () => {
    setEditing(null);
    setCreating(true);
    setLabel("");
    setPhone("");
    setDept("");
  };
  const openEdit = (it: ListItem) => {
    setCreating(false);
    setEditing(it);
    setLabel(it.label);
    setPhone(((it.value as any)?.phone as string) ?? "");
    setDept(((it.value as any)?.department as string) ?? "");
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (!label.trim()) return;
    const value: Record<string, unknown> = {};
    if (tab.withPhone) value.phone = phone.trim();
    if (tab.withDept) value.department = dept.trim();
    if (creating) await addListItem(active, label.trim(), value);
    else if (editing) await updateListItem(editing.id, { label: label.trim(), value });
    close();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este elemento?")) return;
    await deleteListItem(id);
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <PageHeader
          title="Listas maestras"
          subtitle="Administrá los valores que alimentan los desplegables del sistema."
          actions={
            isAdmin && (
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--brand-blue)] text-white text-sm font-medium hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> Nuevo
              </button>
            )
          }
        />
        {!isAdmin && (
          <p className="mb-4 text-sm text-muted-foreground">
            Solo administradores pueden editar las listas.
          </p>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={
                "px-3 h-9 rounded-md text-sm border transition-colors " +
                (active === t.key
                  ? "bg-[var(--brand-blue)] text-white border-[var(--brand-blue)]"
                  : "bg-card text-foreground border-border hover:bg-muted")
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {tab.withDept && (
                  <th className="text-left px-4 py-3 font-semibold">Departamento</th>
                )}
                <th className="text-left px-4 py-3 font-semibold">{nameLabel}</th>
                {tab.withPhone && <th className="text-left px-4 py-3 font-semibold">Celular</th>}
                {isAdmin && <th className="text-right px-4 py-3 font-semibold w-32">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    Sin elementos.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    {tab.withDept && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {(it.value as any)?.department ?? "-"}
                      </td>
                    )}
                    <td className="px-4 py-3">{it.label}</td>
                    {tab.withPhone && (
                      <td className="px-4 py-3 text-muted-foreground">
                        {(it.value as any)?.phone ?? "-"}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(it)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4 text-[var(--brand-blue)]" />
                        </button>
                        <button
                          onClick={() => remove(it.id)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted ml-1"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      <Dialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{creating ? "Nuevo elemento" : "Editar elemento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {tab.withDept && (
              <div>
                <label className="block text-sm font-medium mb-1">Departamento</label>
                <input
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="Ej. Santa Cruz"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                  autoFocus
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">{nameLabel}</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={tab.withDept ? "correo@dominio.com" : ""}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                autoFocus={!tab.withDept}
              />
            </div>
            {tab.withPhone && (
              <div>
                <label className="block text-sm font-medium mb-1">Celular</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={close}
              className="h-10 px-4 rounded-md border border-border text-sm hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              className="h-10 px-4 rounded-md bg-[var(--brand-blue)] text-white text-sm font-medium hover:opacity-90"
            >
              Guardar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
