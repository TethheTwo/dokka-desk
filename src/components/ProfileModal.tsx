import { useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import { useAuth, reloadProfile } from "@/lib/auth";
import { uploadAvatar, deleteAvatar } from "@/lib/avatar";

function formatDate(iso?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ROLE_LABEL: Record<string, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
  addiuva: "Addiuva",
};

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, user, roles } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  if (!open) return null;

  const username = profile?.username || (user?.email?.split("@")[0] ?? "—");
  const fullName = profile?.full_name || "-";
  const email = profile?.email || user?.email || "-";
  const status = profile?.status || "Activo";
  const role = roles.map((r) => ROLE_LABEL[r] ?? r).join(", ") || "Operador";
  const initial = (fullName !== "-" ? fullName : username).trim().charAt(0).toUpperCase();
  const avatarUrl = profile?.avatar_url;

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return alert("Selecciona una imagen");
    if (f.size > 5 * 1024 * 1024) return alert("Máx. 5 MB");
    setUploading(true);
    try {
      await uploadAvatar(f);
      await reloadProfile();
    } catch (err: any) {
      alert(err?.message ?? "Error al subir");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar foto de perfil?")) return;
    try {
      await deleteAvatar(avatarUrl);
      await reloadProfile();
    } catch (err: any) {
      alert(err?.message ?? "Error al eliminar");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in-0 duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-lg bg-card shadow-xl border border-border animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Mi Perfil</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 flex items-center gap-4 border-b border-border">
          <div className="relative shrink-0">
            <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center bg-[var(--brand-blue)] text-white text-2xl font-semibold">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[var(--brand-blue)] text-white flex items-center justify-center shadow-sm hover:opacity-90 disabled:opacity-50"
              title="Cambiar foto"
            >
              <Camera className="h-3 w-3" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePick}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold truncate">{fullName}</div>
            <div className="text-xs text-muted-foreground truncate">{username}</div>
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs text-[var(--brand-blue)] hover:underline disabled:opacity-50"
              >
                {uploading ? "Subiendo…" : avatarUrl ? "Cambiar foto" : "Subir foto"}
              </button>
              {avatarUrl && (
                <button
                  onClick={handleDelete}
                  className="text-xs text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Usuario asignado" value={username} />
          <Field label="Correo" value={email} />
          <Field label="Rol asignado" value={role} />
          <Field label="Estado">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white bg-[#2f9e44]">
              {status}
            </span>
          </Field>
          <Field label="Fecha de creación" value={formatDate(profile?.created_at)} />
          <Field label="Fecha de actualización" value={formatDate(profile?.updated_at)} />
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center h-10 px-4 rounded-lg text-white text-sm font-medium shadow-sm hover:opacity-95"
            style={{ backgroundColor: "var(--brand-blue, #2f7fd6)" }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children ? children : <div className="text-sm text-foreground">{value}</div>}
    </div>
  );
}
