import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { useAuth, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { refreshPermissions, setRolePermission, type Permission } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/administracion/roles")({
  ssr: false,
  head: () => ({ meta: [{ title: "Roles y permisos — DOKKA Desk" }] }),
  component: RolesPage,
});

const ROLES: { key: AppRole; label: string }[] = [
  { key: "administrador", label: "Administrador" },
  { key: "supervisor", label: "Supervisor" },
  { key: "operador", label: "Operador" },
  { key: "addiuva", label: "Addiuva" },
];

const PERMS: { key: Permission; label: string }[] = [
  { key: "view_administracion", label: "Acceder a Administración" },
  { key: "view_tickets", label: "Ver Tickets" },
  { key: "view_asistencias", label: "Ver Asistencias" },
  { key: "view_reporte", label: "Ver Reporte" },
  { key: "view_dashboard", label: "Ver Dashboard" },
  { key: "view_auditoria", label: "Ver Auditoría" },
  { key: "view_listas", label: "Editar Listas maestras" },
  { key: "delete_tickets", label: "Eliminar Tickets" },
  { key: "download_records", label: "Descargar registro" },
  { key: "delete_reports", label: "Eliminar reportes" },
  { key: "share_reports", label: "Compartir reportes" },
  { key: "reopen_closed_cases", label: "Permitir reabrir casos Cerrados" },
];

function RolesPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("administrador");
  const [matrix, setMatrix] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("role_permissions").select("role,permission,allowed");
      const m: Record<string, boolean> = {};
      (data ?? []).forEach((r: any) => {
        m[`${r.role}|${r.permission}`] = !!r.allowed;
      });
      setMatrix(m);
    })();
  }, []);

  const toggle = async (role: AppRole, perm: Permission) => {
    if (!isAdmin) return;
    const key = `${role}|${perm}`;
    const next = !matrix[key];
    setMatrix((m) => ({ ...m, [key]: next }));
    setSaving(key);
    try {
      await setRolePermission(role, perm, next);
      refreshPermissions();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <PageHeader
          title="Roles y permisos"
          subtitle="Definí qué puede ver y hacer cada rol del sistema."
        />
        {!isAdmin && (
          <p className="mb-4 text-sm text-muted-foreground">
            Solo administradores pueden modificar permisos.
          </p>
        )}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Permiso</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="text-center px-4 py-3 font-semibold">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMS.map((p) => (
                <tr key={p.key} className="border-t border-border">
                  <td className="px-4 py-3">{p.label}</td>
                  {ROLES.map((r) => {
                    const key = `${r.key}|${p.key}`;
                    const checked = r.key === "administrador" ? true : !!matrix[key];
                    const disabled = !isAdmin || r.key === "administrador" || saving === key;
                    return (
                      <td key={key} className="text-center px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--brand-blue)]"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(r.key, p.key)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Administrador siempre tiene todos los permisos.{" "}
          <Link to="/administracion/usuarios" className="text-[var(--brand-blue)] hover:underline">
            Asignar roles a usuarios →
          </Link>
        </p>
      </main>
    </div>
  );
}
