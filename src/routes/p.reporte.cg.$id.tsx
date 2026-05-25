import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ModernFormSheet, type FormReportData } from "@/components/ModernFormSheet";
import { getPublicReport } from "@/lib/public-reports.functions";

export const Route = createFileRoute("/p/reporte/cg/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Reporte — Casos Generales" }] }),
  component: PublicCG,
});

function PublicCG() {
  const { id } = Route.useParams();
  const fetchReport = useServerFn(getPublicReport);
  const [data, setData] = useState<FormReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetchReport({ data: { variant: "cg", id } });
        setData((res?.report ?? null) as any);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, fetchReport]);

  return (
    <div className="min-h-screen bg-[#f7f8fa] py-8 px-4">
      <div className="mx-auto max-w-[560px]">
        {loading ? (
          <div className="text-center text-gray-500 py-20">Cargando reporte…</div>
        ) : !data ? (
          <div className="text-center text-gray-500 py-20">Reporte no encontrado.</div>
        ) : (
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden p-[2px]">
            <ModernFormSheet variant="cg" data={data} />
          </div>
        )}
        <p className="text-center text-xs text-gray-400 mt-6">
          DOKKA Desk — Vista pública del reporte
        </p>
      </div>
    </div>
  );
}
