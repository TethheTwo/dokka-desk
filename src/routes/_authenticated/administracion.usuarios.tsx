import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil as PencilIcon, KeyRound as KeyIcon, Trash2 as TrashIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { AppTopBar } from "@/components/AppTopBar";
import { PhoneInput } from "@/components/PhoneInput";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listManagedUsers,
  createManagedUser,
  updateManagedProfile,
  setManagedRoles,
  resetManagedPassword,
  deleteManagedUser,
  type AdminRole,
} from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/administracion/usuarios")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gestión de usuarios — DOKKA Desk" },
      { name: "description", content: "Administración de usuarios y roles." },
    ],
  }),
  component: UsuariosAdminPage,
});

const ALL_ROLES: AdminRole[] = ["administrador", "supervisor", "operador", "addiuva"];
const ROLE_LABEL: Record<AdminRole, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
  addiuva: "Addiuva",
};

type Row = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  roles: AdminRole[];
  avatar_url?: string | null;
};

function UsuariosAdminPage() {
  const { roles, loading: authLoading } = useAuth();
  const isAdmin = roles.includes("administrador");

  const fetchAll = useServerFn(listManagedUsers);
  const createFn = useServerFn(createManagedUser);
  const updateProfileFn = useServerFn(updateManagedProfile);
  const setRolesFn = useServerFn(setManagedRoles);
  const resetFn = useServerFn(resetManagedPassword);
  const deleteFn = useServerFn(deleteManagedUser);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [resetTarget, setResetTarget] = useState<Row | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const data = await fetchAll();
      setRows(data as Row[]);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  if (!authLoading && !isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <AppTopBar />
        <main className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h1 className="text-xl font-semibold mb-2">Sin permisos</h1>
          <p className="text-muted-foreground">
            Solo administradores pueden acceder a la gestión de usuarios.
          </p>
          <Link to="/" className="text-[var(--brand-blue)] hover:underline mt-4 inline-block">
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  async function quickSetRole(r: Row, role: AdminRole | "") {
    try {
      await setRolesFn({ data: { id: r.id, roles: role ? [role] : ([] as any) } });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Error al cambiar rol");
    }
  }

  async function setStatus(r: Row, next: "Activo" | "Inactivo") {
    if (next === r.status) return;
    try {
      await updateProfileFn({
        data: { id: r.id, full_name: r.full_name, status: next as any },
      });
      await reload();
    } catch (e: any) {
      alert(e?.message ?? "Error");
    }
  }

  function initial(name: string, email: string) {
    const src = (name || email || "?").trim();
    return src.charAt(0).toUpperCase();
  }

  // Paleta de colores deterministas para avatares
  const AVATAR_COLORS = [
    "#2f7fd6",
    "#16a34a",
    "#9333ea",
    "#ea580c",
    "#0891b2",
    "#db2777",
    "#ca8a04",
  ];
  function avatarColor(id: string) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <div className="bg-card border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestión de usuarios, roles y accesos
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-white text-sm font-medium shadow-sm hover:opacity-95"
            style={{ backgroundColor: "var(--brand-blue, #2f7fd6)" }}
          >
            <span className="text-lg leading-none">+</span> Nuevo usuario
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-3 rounded-md border border-red-300 bg-red-50 text-red-800 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-muted-foreground py-10">Cargando…</div>
        ) : rows.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">Sin usuarios</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rows.map((r) => {
              const primaryRole = r.roles[0];
              const isActive = r.status === "Activo";
              return (
                <div
                  key={r.id}
                  className={`bg-card border border-border rounded-xl p-5 shadow-sm transition ${
                    isActive ? "" : "opacity-75"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {r.avatar_url ? (
                      <img
                        src={r.avatar_url}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className="h-11 w-11 rounded-full flex items-center justify-center text-white text-base font-semibold shrink-0"
                        style={{ backgroundColor: avatarColor(r.id) }}
                      >
                        {initial(r.full_name, r.email)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold truncate" title={r.full_name || r.email}>
                            {r.full_name || r.email.split("@")[0]}
                          </div>
                          <div className="text-xs text-muted-foreground truncate" title={r.email}>
                            {r.email}
                          </div>
                          {r.username && (
                            <div className="text-xs text-muted-foreground truncate">
                              {r.username}
                            </div>
                          )}
                        </div>
                        {primaryRole && (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-xs whitespace-nowrap shrink-0">
                            {ROLE_LABEL[primaryRole]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Select
                      value={primaryRole ?? "__none__"}
                      onValueChange={(v) =>
                        quickSetRole(r, v === "__none__" ? "" : (v as AdminRole))
                      }
                    >
                      <SelectTrigger className="w-full h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sin rol</SelectItem>
                        {ALL_ROLES.map((rol) => (
                          <SelectItem key={rol} value={rol}>
                            {ROLE_LABEL[rol]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEditing(r)}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-input text-sm hover:bg-muted/50"
                    >
                      <PencilIcon className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => setResetTarget(r)}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-input text-sm hover:bg-muted/50"
                    >
                      <KeyIcon className="h-3.5 w-3.5" /> Contraseña
                    </button>
                    <div className="relative">
                      <span
                        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 z-10 h-2 w-2 rounded-full ${
                          isActive ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      <Select
                        value={isActive ? "Activo" : "Inactivo"}
                        onValueChange={(v) => setStatus(r, v as "Activo" | "Inactivo")}
                      >
                        <SelectTrigger className="w-full h-9 pl-7">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Activo">Activo</SelectItem>
                          <SelectItem value="Inactivo">Inactivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm(`¿Eliminar a ${r.email}? Esta acción no se puede deshacer.`))
                          return;
                        try {
                          await deleteFn({ data: { id: r.id } });
                          await reload();
                        } catch (e: any) {
                          alert(e?.message ?? "Error");
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-white text-sm bg-red-600 hover:bg-red-700"
                    >
                      <TrashIcon className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showNew && (
        <NewUserModal
          onClose={() => setShowNew(false)}
          onSave={async (payload) => {
            await createFn({ data: payload });
            setShowNew(false);
            await reload();
          }}
        />
      )}

      {editing && (
        <EditUserModal
          row={editing}
          onClose={() => setEditing(null)}
          onSave={async (p) => {
            await updateProfileFn({ data: { id: editing.id, ...p } });
          }}
          afterSave={async () => {
            setEditing(null);
            await reload();
          }}
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          row={resetTarget}
          onClose={() => setResetTarget(null)}
          onSave={async (password) => {
            await resetFn({ data: { id: resetTarget.id, password } });
            setResetTarget(null);
            alert("Contraseña actualizada");
          }}
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3 text-sm">
      <span className="block mb-1 text-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue,#2f7fd6)]/40";

function NewUserModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: {
    email: string;
    password: string;
    full_name: string;
    username: string;
    phone: string;
    roles: AdminRole[];
    status: "Activo" | "Inactivo";
  }) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AdminRole>("operador");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit =
    fullName.trim().length > 0 && username.trim().length > 0 && email.trim().length > 0 && !saving;

  return (
    <ModalShell
      title="Nuevo usuario"
      description="Crea una nueva cuenta y asigna un rol."
      onClose={onClose}
    >
      <div className="space-y-3">
        <Field label="Nombre completo">
          <input
            className={inputCls}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </Field>
        <Field label="Usuario">
          <input
            className={inputCls}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field label="Correo">
          <input
            type="email"
            className={inputCls}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <div>
          <Field label="Contraseña">
            <input
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <p className="-mt-2 mb-1 text-xs text-muted-foreground">Mínimo 5 caracteres.</p>
        </div>
        <Field label="Teléfono">
          <PhoneInput className={inputCls} value={phone} onChange={(v) => setPhone(v)} />
        </Field>
        <Field label="Rol">
          <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
            <SelectTrigger className="w-full h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_ROLES.map((rol) => (
                <SelectItem key={rol} value={rol}>
                  {ROLE_LABEL[rol]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      {err && <div className="text-sm text-red-700 mt-2">{err}</div>}
      <DialogFooter className="pt-4">
        <button
          onClick={onClose}
          className="h-9 px-4 rounded-md border border-input text-sm hover:bg-muted/50"
        >
          Cancelar
        </button>
        <button
          disabled={!canSubmit}
          onClick={async () => {
            setErr(null);
            const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
            if (!emailOk) {
              setErr("Ingresa un correo válido.");
              return;
            }
            if (password.length < 5) {
              setErr("La contraseña debe tener al menos 5 caracteres.");
              return;
            }
            setSaving(true);
            try {
              await onSave({
                email: email.trim(),
                password,
                full_name: fullName.trim(),
                username: username.trim(),
                phone: phone.trim(),
                roles: [role],
                status: "Activo",
              });
            } catch (e: any) {
              setErr(e?.message ?? "Error");
            } finally {
              setSaving(false);
            }
          }}
          className="h-9 px-4 rounded-md text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: "var(--brand-blue, #2f7fd6)" }}
        >
          {saving ? "Creando…" : "Crear usuario"}
        </button>
      </DialogFooter>
    </ModalShell>
  );
}

function EditUserModal({
  row,
  onClose,
  onSave,
  afterSave,
}: {
  row: Row;
  onClose: () => void;
  onSave: (p: { full_name: string; email: string; phone: string }) => Promise<void>;
  afterSave: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(row.full_name);
  const [email, setEmail] = useState(row.email);
  const [phone, setPhone] = useState(row.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <ModalShell title="Editar usuario" onClose={onClose}>
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        Actualiza la información del usuario.
      </p>
      <Field label="Nombre completo">
        <input
          className={inputCls}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </Field>
      <Field label="Correo">
        <input
          type="email"
          className={inputCls}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Teléfono">
        <PhoneInput className={inputCls} value={phone} onChange={(v) => setPhone(v)} />
      </Field>
      {err && <div className="text-sm text-red-700 mb-2">{err}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="h-9 px-4 rounded-md border border-input text-sm">
          Cancelar
        </button>
        <button
          disabled={saving || !fullName.trim() || !email.trim()}
          onClick={async () => {
            setErr(null);
            setSaving(true);
            try {
              await onSave({
                full_name: fullName.trim(),
                email: email.trim(),
                phone: phone.trim(),
              });
              await afterSave();
            } catch (e: any) {
              setErr(e?.message ?? "Error");
            } finally {
              setSaving(false);
            }
          }}
          className="h-9 px-4 rounded-md text-white text-sm disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-blue, #2f7fd6)" }}
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </ModalShell>
  );
}

function ResetPasswordModal({
  row,
  onClose,
  onSave,
}: {
  row: Row;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <ModalShell title="Restablecer contraseña" onClose={onClose}>
      <p className="text-sm text-muted-foreground -mt-2 mb-4">
        Define una nueva contraseña para{" "}
        <span className="font-semibold text-foreground">{row.email}</span>.
      </p>
      <Field label="Nueva contraseña">
        <input
          type="text"
          autoFocus
          className={inputCls}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <p className="text-xs text-muted-foreground -mt-2 mb-3">Mínimo 5 caracteres.</p>
      {err && <div className="text-sm text-red-700 mb-2">{err}</div>}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="h-9 px-4 rounded-md border border-input text-sm">
          Cancelar
        </button>
        <button
          disabled={saving || password.length < 5}
          onClick={async () => {
            setErr(null);
            setSaving(true);
            try {
              await onSave(password);
            } catch (e: any) {
              setErr(e?.message ?? "Error");
            } finally {
              setSaving(false);
            }
          }}
          className="h-9 px-4 rounded-md text-white text-sm disabled:opacity-50"
          style={{ backgroundColor: "var(--brand-blue, #2f7fd6)" }}
        >
          {saving ? "Guardando…" : "Actualizar"}
        </button>
      </div>
    </ModalShell>
  );
}

function RoleCheckboxes({
  value,
  onChange,
}: {
  value: AdminRole[];
  onChange: (v: AdminRole[]) => void;
}) {
  return (
    <div className="mb-3">
      <div className="text-sm mb-1">Roles</div>
      <div className="grid grid-cols-2 gap-2">
        {ALL_ROLES.map((r) => {
          const checked = value.includes(r);
          return (
            <label
              key={r}
              className="flex items-center gap-2 text-sm border border-input rounded-md px-2 py-1 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => {
                  if (e.target.checked) onChange([...value, r]);
                  else onChange(value.filter((x) => x !== r));
                }}
              />
              {ROLE_LABEL[r]}
            </label>
          );
        })}
      </div>
    </div>
  );
}
