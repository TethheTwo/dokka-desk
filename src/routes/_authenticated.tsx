import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { initAuth, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
    // Bloquear usuarios inactivos
    const { data: prof } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", data.session.user.id)
      .maybeSingle();
    if (prof && prof.status !== "Activo") {
      await supabase.auth.signOut();
      throw redirect({ to: "/login", search: { redirect: "/" } });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login", search: { redirect: "/" } });
    }
  }, [session, loading, navigate]);

  return <Outlet />;
}
