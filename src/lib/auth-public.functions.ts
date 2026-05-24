import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Resuelve un "usuario asignado" (username) al correo electrónico actual
 * registrado en auth.users. Permite que el login acepte ambos.
 * Solo retorna el email — sin PII adicional.
 */
export const getEmailByUsername = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        username: z
          .string()
          .trim()
          .min(1)
          .max(120)
          .regex(/^[A-Za-z0-9._@-]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: prof, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, username")
      .eq("username", data.username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!prof) return { email: null };

    // Buscar el email real en auth.users (puede haber cambiado y el profile estar desincronizado)
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(prof.id);
    return { email: authUser?.user?.email ?? prof.email };
  });
