import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { signIn, initAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import dokkaLoginLogo from "@/assets/dokka-desk-login.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — DOKKA Desk" },
      { name: "description", content: "Acceso al sistema DOKKA Desk." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    initAuth();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) throw error;
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (uid) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("status")
          .eq("id", uid)
          .maybeSingle();
        if (prof && prof.status !== "Activo") {
          await supabase.auth.signOut();
          throw new Error("Tu cuenta está inactiva. Contacta a un administrador.");
        }
      }
      toast.success("Sesión iniciada");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error de autenticación");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-sm p-8 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-center mb-4">
          <img
            src={dokkaLoginLogo}
            alt="DOKKA Desk"
            className="w-auto h-auto max-w-[240px] object-contain select-none"
            draggable={false}
          />
        </div>
        <p className="text-center text-sm text-muted-foreground mb-6">
          Inicie sesión para continuar
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              Correo electrónico o usuario asignado
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--brand-blue)]"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center h-10 px-5 rounded-md bg-[#0f172a] text-white text-xs font-semibold tracking-wider uppercase hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Procesando…" : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
