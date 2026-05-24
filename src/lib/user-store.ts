// Compatibility shim — real auth lives in src/lib/auth.ts
// We keep the original exports so existing components continue working.
import { useCurrentUserCompat, updateProfile, signOut, getAuthState } from "./auth";

export interface UserProfile {
  name: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const EMPTY: UserProfile = {
  name: "",
  email: "",
  username: "",
  role: "Operador",
  status: "Activo",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function useCurrentUser(): UserProfile {
  return useCurrentUserCompat();
}

export function getUserProfile(): UserProfile {
  const { user, profile, roles } = getAuthState();
  if (!user) return EMPTY;
  const role = roles.includes("administrador")
    ? "Administrador"
    : roles.includes("supervisor")
      ? "Supervisor"
      : "Operador";
  return {
    name: profile?.full_name || user.email || "",
    email: profile?.email || user.email || "",
    username: profile?.username || (user.email?.split("@")[0] ?? ""),
    role,
    status: profile?.status || "Activo",
    createdAt: profile?.created_at || user.created_at,
    updatedAt: profile?.updated_at || user.created_at,
  };
}

export async function setUserProfile(next: { name: string; email: string }) {
  await updateProfile({ full_name: next.name, email: next.email });
}

export function touchUserUpdatedAt() {
  // no-op: timestamps are managed by the database trigger.
}

export { signOut };
