import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FormSheet, type FormReportData } from "@/components/ReportPreviewModal";
import { getPublicReport } from "@/lib/public-reports.functions";

export const Route = createFileRoute("/p/reporte/ap/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reporte — Accidentes Personales" }] }),
  component: PublicAP,
});

function PublicAP() {
  const { id } = Route.useParams();
  const fetchReport = useServerFn(getPublicReport);
  const [data, setData] = useState<FormReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchReport({ data: { variant: "ap", id } });
        setData((res?.report ?? null) as any);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, fetchReport]);

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="mx-auto" style={{ maxWidth: 900 }}>
        {loading ? (
          <div className="text-center text-slate-500 py-20">Cargando reporte…</div>
        ) : !data ? (
          <div className="text-center text-slate-500 py-20">Reporte no encontrado.</div>
        ) : (
          <div
            className="bg-white shadow-lg border border-slate-300 rounded-sm overflow-hidden"
            style={{ width: 900, maxWidth: "100%" }}
          >
            <div style={{ width: 900, height: 720 }}>
              <FormSheet variant="ap" data={data} />
            </div>
          </div>
        )}
        <p className="text-center text-xs text-slate-400 mt-6">
          DOKKA Desk — Vista pública del reporte
        </p>
      </div>
    </div>
  );
}
