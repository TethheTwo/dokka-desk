import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";

export type Permission =
  | "view_tickets"
  | "view_asistencias"
  | "view_reporte"
  | "view_administracion"
  | "view_dashboard"
  | "view_auditoria"
  | "view_listas"
  | "delete_tickets"
  | "download_records"
  | "delete_reports"
  | "share_reports"
  | "reopen_closed_cases";

interface Row {
  role: AppRole;
  permission: string;
  allowed: boolean;
}

let cache: Row[] = [];
const listeners = new Set<() => void>();
let loaded = false;
let loading = false;
let channelStarted = false;

async function load() {
  if (loading) return;
  loading = true;
  const { data } = await supabase.from("role_permissions").select("role,permission,allowed");
  cache = (data ?? []) as Row[];
  loaded = true;
  loading = false;
  listeners.forEach((fn) => fn());
}

function ensureChannel() {
  if (channelStarted || typeof window === "undefined") return;
  channelStarted = true;
  supabase
    .channel("role-perms-rt")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "role_permissions" },
      () => void load(),
    )
    .subscribe();
}

export function refreshPermissions() {
  void load();
}

export function usePermissions() {
  const { roles } = useAuth();
  const [, set] = useState(0);

  useEffect(() => {
    if (!loaded) void load();
    ensureChannel();
    const fn = () => set((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const can = (p: Permission) => {
    if (roles.length === 0) return false;
    if (roles.includes("administrador")) return true;
    return cache.some((r) => roles.includes(r.role) && r.permission === p && r.allowed);
  };

  return { can, loaded };
}

export async function setRolePermission(role: AppRole, permission: Permission, allowed: boolean) {
  const { data: existing } = await supabase
    .from("role_permissions")
    .select("id")
    .eq("role", role)
    .eq("permission", permission)
    .maybeSingle();
  if (existing) {
    await supabase.from("role_permissions").update({ allowed }).eq("id", existing.id);
  } else {
    await supabase.from("role_permissions").insert({ role, permission, allowed });
  }
  await load();
}
