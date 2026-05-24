import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { FormSheet, type FormReportData } from "@/components/ReportPreviewModal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reporte/cg/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reporte — Casos Generales" }] }),
  component: CGPreviewPage,
});

function CGPreviewPage() {
  const { id } = Route.useParams();
  const [data, setData] = useState<FormReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const isUuid = /^[0-9a-f-]{36}$/i.test(id);
      const q = supabase.from("reportes_cg").select("*");
      const { data: rows } = await (isUuid ? q.eq("id", id) : q.eq("nro", Number(id))).limit(1);
      setData((rows?.[0] ?? null) as any);
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <AppTopBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link
          to="/reportes/casos-generales"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-blue)] hover:underline mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al listado
        </Link>
        {loading ? (
          <div className="text-center text-muted-foreground py-20">Cargando reporte…</div>
        ) : !data ? (
          <div className="text-center text-muted-foreground py-20">Reporte no encontrado.</div>
        ) : (
          <div
            className="bg-white shadow-lg border border-slate-300 rounded-sm overflow-hidden mx-auto"
            style={{ width: 900, maxWidth: "100%" }}
          >
            <div style={{ width: 900, height: 720 }}>
              <FormSheet variant="cg" data={data} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
