import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentUser, setUserProfile } from "@/lib/user-store";
import { reloadProfile } from "@/lib/auth";
import { updateMyEmail } from "@/lib/update-my-email.functions";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { AvatarCard } from "@/components/AvatarCard";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — DOKKA Desk" },
      { name: "description", content: "Configuración del perfil del usuario." },
    ],
  }),
  component: ConfiguracionPage,
});

function ConfiguracionPage() {
  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <PageHeader title="Configuración" subtitle="Administra tu perfil y credenciales." />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
        <AvatarCard />
        <ProfileCard />
        <PasswordCard />
      </main>
    </div>
  );
}

function ProfileCard() {
  const user = useCurrentUser();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const updateMyEmailFn = useServerFn(updateMyEmail);

  useEffect(() => {
    setName(user.name);
    setEmail(user.email);
  }, [user.name, user.email]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newName = name.trim();
    const newEmail = email.trim();
    try {
      if (newEmail !== user.email) {
        await updateMyEmailFn({ data: { email: newEmail } });
      }
      await setUserProfile({ name: newName, email: newEmail });
      await reloadProfile();
      toast.success("Perfil actualizado correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar el perfil");
    }
  };

  return (
    <div className="bg-card rounded-md shadow-sm border border-border p-6">
      <h2 className="text-base font-semibold text-foreground">Información del perfil</h2>
      <p className="text-xs text-[var(--brand-blue)] mt-1">
        Actualice el nombre completo y el correo electrónico de su cuenta.
      </p>
      <form onSubmit={handleSave} className="mt-5 space-y-4">
        <Field label="Nombre completo">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
          />
        </Field>
        <Field label="Correo electrónico">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
          />
        </Field>
        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center h-9 px-5 rounded-md bg-[#0f172a] text-white text-xs font-semibold tracking-wider uppercase hover:opacity-90"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!current || !next || !confirm) {
      toast.error("Complete todos los campos");
      return;
    }
    if (next !== confirm) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (next.length < 5) {
      toast.error("La nueva contraseña debe tener al menos 5 caracteres");
      return;
    }
    try {
      const { updatePassword } = await import("@/lib/auth");
      await updatePassword(next);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Contraseña actualizada correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo actualizar la contraseña");
    }
  };

  return (
    <div className="bg-card rounded-md shadow-sm border border-border p-6">
      <h2 className="text-base font-semibold text-foreground">Actualizar contraseña</h2>
      <p className="text-xs text-[var(--brand-blue)] mt-1">
        Asegúrese de que su cuenta utilice una contraseña larga y aleatoria para mantener su
        seguridad.
      </p>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field label="Contraseña actual">
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
          />
        </Field>
        <Field label="Nueva contraseña">
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
          />
        </Field>
        <Field label="Confirmar contraseña">
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
          />
        </Field>
        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center h-9 px-5 rounded-md bg-[#0f172a] text-white text-xs font-semibold tracking-wider uppercase hover:opacity-90"
          >
            Actualizar contraseña
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}
