import { useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "administrador" | "supervisor" | "operador" | "addiuva";

export interface AuthProfile {
  id: string;
  full_name: string;
  username: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string | null;
  phone?: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  roles: AppRole[];
  loading: boolean;
}

const initial: AuthState = {
  session: null,
  user: null,
  profile: null,
  roles: [],
  loading: true,
};

let state: AuthState = initial;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

function setState(patch: Partial<AuthState>) {
  state = { ...state, ...patch };
  emit();
}

async function loadProfileAndRoles(user: User) {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  setState({
    profile: (profile as AuthProfile) ?? null,
    roles: (roles ?? []).map((r) => r.role as AppRole),
    loading: false,
  });
}

let initialized = false;
export function initAuth() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    setState({ session, user: session?.user ?? null });
    if (session?.user) {
      // defer to avoid deadlocks
      setTimeout(() => {
        void loadProfileAndRoles(session.user);
      }, 0);
    } else {
      setState({ profile: null, roles: [], loading: false });
    }
  });

  void supabase.auth.getSession().then(({ data: { session } }) => {
    setState({ session, user: session?.user ?? null, loading: !!session });
    if (session?.user) void loadProfileAndRoles(session.user);
    else setState({ loading: false });
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => state,
    () => initial,
  );
}

export async function signIn(identifier: string, password: string) {
  const id = identifier.trim();
  let email = id;
  // Si no parece un correo, intentamos resolverlo como "usuario asignado".
  if (!id.includes("@")) {
    try {
      const { getEmailByUsername } = await import("@/lib/auth-public.functions");
      const res = await getEmailByUsername({ data: { username: id } });
      if (res?.email) email = res.email;
    } catch {
      // si falla la resolución, seguimos con el identificador original
    }
  }
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, fullName: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: { full_name: fullName, username: email.split("@")[0] },
    },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function updateProfile(patch: { full_name?: string; email?: string }) {
  if (!state.user) throw new Error("No session");
  const { error } = await supabase
    .from("profiles")
    .update({
      ...(patch.full_name !== undefined ? { full_name: patch.full_name } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
    })
    .eq("id", state.user.id);
  if (error) throw error;
  if (patch.email && patch.email !== state.user.email) {
    const { error: e2 } = await supabase.auth.updateUser({ email: patch.email });
    if (e2) throw e2;
  }
  if (state.user) await loadProfileAndRoles(state.user);
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function reloadProfile() {
  if (state.user) await loadProfileAndRoles(state.user);
}

export function useIsAuthenticated() {
  const { session, loading } = useAuth();
  return { isAuthenticated: !!session, loading };
}

// Compatibility wrapper for existing components that used the old user-store
const FALLBACK = {
  name: "",
  email: "",
  username: "",
  role: "Operador",
  status: "Activo",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useCurrentUserCompat() {
  const { user, profile, roles } = useAuth();
  if (!user) return FALLBACK;
  const roleLabel = roles.includes("administrador")
    ? "Administrador"
    : roles.includes("supervisor")
      ? "Supervisor"
      : roles.includes("addiuva")
        ? "Addiuva"
        : "Operador";
  return {
    name:
      profile?.full_name ||
      (user.user_metadata?.full_name as string | undefined) ||
      user.email ||
      "",
    email: profile?.email || user.email || "",
    username: profile?.username || (user.email?.split("@")[0] ?? ""),
    role: roleLabel,
    status: profile?.status || "Activo",
    createdAt: profile?.created_at || user.created_at,
    updatedAt: profile?.updated_at || user.created_at,
  };
}

export function getAuthState(): AuthState {
  return state;
}
