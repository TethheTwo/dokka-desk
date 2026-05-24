import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type AdminRole = "administrador" | "supervisor" | "operador" | "addiuva";
const ROLE_VALUES = ["administrador", "supervisor", "operador", "addiuva"] as const;

async function ensureAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "administrador")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Solo administradores");
}

export const listManagedUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: true }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);
    const rolesByUser = new Map<string, AdminRole[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role as AdminRole);
      rolesByUser.set(r.user_id, arr);
    }
    return (profiles ?? []).map((p: any) => ({
      id: p.id as string,
      full_name: p.full_name as string,
      username: p.username as string,
      email: p.email as string,
      phone: (p.phone as string | null) ?? "",
      status: p.status as string,
      created_at: p.created_at as string,
      roles: rolesByUser.get(p.id) ?? [],
      avatar_url: (p.avatar_url as string | null) ?? undefined,
    }));
  });

export const createManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(255),
        password: z.string().min(5).max(128),
        full_name: z.string().trim().min(1).max(120),
        username: z
          .string()
          .trim()
          .min(1)
          .max(60)
          .regex(/^[A-Za-z0-9._-]+$/),
        phone: z.string().trim().max(40).optional().nullable(),
        roles: z.array(z.enum(ROLE_VALUES)).min(1).max(4),
        status: z.enum(["Activo", "Inactivo"]).default("Activo"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, username: data.username },
    });
    if (error || !created.user) throw new Error(error?.message ?? "No se pudo crear");
    const uid = created.user.id;
    // The handle_new_user trigger insertó un profile y un rol por defecto.
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.full_name,
        username: data.username,
        email: data.email,
        status: data.status,
        phone: data.phone ?? null,
      })
      .eq("id", uid);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin
      .from("user_roles")
      .insert(data.roles.map((role) => ({ user_id: uid, role })));
    return { id: uid };
  });

export const updateManagedProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().trim().min(1).max(120),
        username: z
          .string()
          .trim()
          .min(1)
          .max(60)
          .regex(/^[A-Za-z0-9._-]+$/)
          .optional(),
        email: z.string().email().max(255).optional(),
        phone: z.string().trim().max(40).optional().nullable(),
        status: z.enum(["Activo", "Inactivo"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const update: {
      full_name: string;
      username?: string;
      email?: string;
      phone?: string | null;
      status?: string;
    } = { full_name: data.full_name };
    if (data.username !== undefined) update.username = data.username;
    if (data.email !== undefined) update.email = data.email;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.status !== undefined) update.status = data.status;
    const { error } = await supabaseAdmin.from("profiles").update(update).eq("id", data.id);
    if (error) throw new Error(error.message);
    // Si cambia el email, también lo actualizamos en Auth
    if (data.email !== undefined) {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
        email: data.email,
      });
      if (authErr) throw new Error(authErr.message);
    }
    return { ok: true };
  });

export const setManagedRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        roles: z.array(z.enum(ROLE_VALUES)).min(1).max(4),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert(data.roles.map((role) => ({ user_id: data.id, role })));
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetManagedPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        password: z.string().min(5).max(128),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteManagedUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    if (data.id === context.userId) throw new Error("No puedes eliminar tu propia cuenta");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
