import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MIN_INTERVAL_MS = 300_000; // 5 minutos entre cambios de email

export const updateMyEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email().max(255),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // 1. Obtener perfil actual (email viejo + timestamp)
    const { data: currentProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("email, updated_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);
    if (!currentProfile) throw new Error("Perfil no encontrado");

    const newEmail = data.email.toLowerCase().trim();
    const oldEmail = currentProfile.email?.toLowerCase().trim() ?? "";

    // Si es el mismo email, no-op
    if (newEmail === oldEmail) return { ok: true };

    // 2. Rate limiting: evitar cambios frecuentes
    const lastChange = currentProfile.updated_at ? new Date(currentProfile.updated_at).getTime() : 0;
    if (Date.now() - lastChange < MIN_INTERVAL_MS) {
      const remaining = Math.ceil((MIN_INTERVAL_MS - (Date.now() - lastChange)) / 1000 / 60);
      throw new Error(`Debe esperar ${remaining} minuto(s) antes de cambiar su correo nuevamente`);
    }

    // 3. Verificar que el email no esté en uso por otro usuario
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", newEmail)
      .neq("id", context.userId)
      .maybeSingle();
    if (existing) throw new Error("Este correo ya está siendo usado por otro usuario");

    // 4. Actualizar profiles
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ email: newEmail })
      .eq("id", context.userId);
    if (updateErr) throw new Error(updateErr.message);

    // 5. Actualizar auth.users (inmediato, sin confirmación)
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      email: newEmail,
    });
    if (authErr) throw new Error(authErr.message);

    // 6. Log de auditoría (servidor)
    console.log(`[AUDIT] Email change user=${context.userId} from=${oldEmail} to=${newEmail}`);

    return { ok: true };
  });
