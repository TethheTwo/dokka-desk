import { useRef, useState } from "react";
import { Camera, Trash2, ZoomIn, X, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useAuth, reloadProfile } from "@/lib/auth";
import { uploadAvatar, deleteAvatar } from "@/lib/avatar";

export function AvatarCard() {
  const { profile, user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);

  const avatarUrl = profile?.avatar_url;
  const username = profile?.username || user?.email?.split("@")[0] || "";
  const initial = (profile?.full_name || username || "U").trim().charAt(0).toUpperCase();

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Máx. 5 MB");
      return;
    }
    try {
      setBusy(true);
      await uploadAvatar(f);
      await reloadProfile();
      toast.success("Foto de perfil actualizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!avatarUrl) return;
    if (!confirm("¿Eliminar la foto de perfil?")) return;
    try {
      setBusy(true);
      await deleteAvatar(avatarUrl);
      await reloadProfile();
      toast.success("Foto eliminada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card rounded-md shadow-sm border border-border p-6">
      <h2 className="text-base font-semibold text-foreground">Foto de perfil</h2>
      <p className="text-xs text-[var(--brand-blue)] mt-1">
        Sube, visualiza o elimina tu foto. JPG/PNG hasta 5&nbsp;MB.
      </p>

      <div className="mt-5 flex items-center gap-5">
        <button
          type="button"
          onClick={() => avatarUrl && setZoom(true)}
          className="relative h-24 w-24 rounded-full overflow-hidden border border-border bg-[var(--brand-blue)] text-white text-3xl font-semibold flex items-center justify-center group"
          title={avatarUrl ? "Ver foto" : "Sin foto"}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={username} className="h-full w-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
          {avatarUrl && (
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="h-5 w-5 text-white" />
            </span>
          )}
        </button>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-[var(--brand-blue)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60"
          >
            <UploadCloud className="h-4 w-4" /> {avatarUrl ? "Cambiar" : "Subir"} foto
          </button>
          {avatarUrl && (
            <>
              <button
                type="button"
                onClick={() => setZoom(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input text-xs font-semibold hover:bg-muted"
              >
                <ZoomIn className="h-4 w-4" /> Ampliar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" /> Eliminar
              </button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePick}
          />
        </div>
      </div>

      {zoom && avatarUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-in fade-in-0 duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setZoom(false);
          }}
        >
          <button
            onClick={() => setZoom(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white inline-flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={avatarUrl}
            alt="Foto de perfil"
            className="max-h-[88vh] max-w-[88vw] rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
          />
        </div>
      )}
    </div>
  );
}
