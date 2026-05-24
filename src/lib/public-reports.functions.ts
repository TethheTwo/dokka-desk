import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getPublicReport = createServerFn({ method: "GET" })
  .inputValidator((input: { variant: "ap" | "cg"; id: string }) => {
    if (input.variant !== "ap" && input.variant !== "cg") throw new Error("invalid variant");
    if (!input.id || typeof input.id !== "string" || input.id.length > 64)
      throw new Error("invalid id");
    return input;
  })
  .handler(async ({ data }): Promise<{ report: any }> => {
    const table = data.variant === "ap" ? "reportes_ap" : "reportes_cg";
    const isUuid = /^[0-9a-f-]{36}$/i.test(data.id);
    const q = supabaseAdmin.from(table).select("*");
    const { data: rows, error } = await (
      isUuid ? q.eq("id", data.id) : q.eq("nro", Number(data.id))
    ).limit(1);
    if (error) throw new Error(error.message);
    const report = rows?.[0] ?? null;
    return { report: report ? JSON.parse(JSON.stringify(report)) : null };
  });
