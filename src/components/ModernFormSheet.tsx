export interface FormReportData {
  nro: number | string;
  colaborador?: string | null;
  fecha_solicitud?: string | null;
  fecha_siniestro?: string | null;
  danos_personales?: string | null;
  asegurado?: string | null;
  nombre_accidentado?: string | null;
  carnet_accidentado?: string | null;
  solicitante?: string | null;
  celular?: string | null;
  departamento?: string | null;
  poliza?: string | null;
  direccion?: string | null;
  descripcion?: string | null;
  ejecutivo_nombre?: string | null;
  ejecutivo_celular?: string | null;
  intentos_llamada?: string | null;
  observaciones?: string | null;
  hubo_tripartita?: string | null;
  hora_contacto?: string | null;
  created_at?: string | null;
}

interface Props {
  variant: "ap" | "cg";
  data: FormReportData;
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const v = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="flex flex-col gap-[3px] pb-[9px] mb-[9px] border-b border-gray-100 last:border-b-0 last:pb-0 last:mb-0">
      <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-[12px] font-semibold text-[#111827]">{v}</span>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#e6e8eb] rounded-lg bg-white overflow-hidden">
      <div className="px-[14px] py-[8px] border-b border-[#e6e8eb]">
        <h3 className="text-[10px] font-bold text-[#111827] uppercase tracking-widest">{title}</h3>
      </div>
      <div className="px-[14px] py-[10px]">{children}</div>
    </div>
  );
}

export function ModernFormSheet({ variant, data }: Props) {
  const code = variant === "ap" ? "F-775" : "F-805";
  const title = variant === "ap" ? "Accidentes Personales Patrimoniales" : "Casos Generales";

  return (
    <div className="w-full h-full flex flex-col gap-[16px] px-[18px] py-[14px] text-[#111827]">
      <div className="border border-[#e6e8eb] rounded-lg bg-white overflow-hidden">
        <div className="px-[14px] py-[10px]">
          <div className="flex items-center justify-between mb-[6px]">
            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.12em]">
              DOKKA Desk
            </span>
            <span className="text-[10px] font-bold text-[#1d84f5]">{code}</span>
          </div>
          <h1 className="text-[14px] font-bold leading-tight mb-[2px]">{title}</h1>
          <div className="flex flex-wrap gap-x-[14px] gap-y-[3px] mt-[6px] text-[10px]">
            <span className="text-gray-500">
              Registro: <span className="text-[#111827] font-semibold">{data.nro ?? "—"}</span>
            </span>
            <span className="text-gray-500">
              Colaborador:{" "}
              <span className="text-[#111827] font-semibold">{data.colaborador || "—"}</span>
            </span>
            <span className="text-gray-500">
              Fecha:{" "}
              <span className="text-[#111827] font-semibold">{fmtDate(data.fecha_solicitud)}</span>
            </span>
          </div>
        </div>
      </div>

      <InfoCard title="Datos del Siniestro">
        <InfoRow label="Fecha de solicitud" value={fmtDate(data.fecha_solicitud)} />
        <InfoRow label="Fecha del siniestro" value={fmtDate(data.fecha_siniestro)} />
        {variant === "ap" ? (
          <>
            <InfoRow label="Nombre del accidentado" value={data.nombre_accidentado} />
            <InfoRow label="Carnet del accidentado" value={data.carnet_accidentado} />
          </>
        ) : (
          <>
            <InfoRow label="Asegurado" value={data.asegurado} />
            {data.danos_personales && <InfoRow label="Daños personales" value={data.danos_personales} />}
          </>
        )}
        <InfoRow label="Solicitante" value={data.solicitante} />
        <InfoRow label="Celular" value={data.celular} />
        <InfoRow label="Departamento" value={data.departamento} />
        <InfoRow label="Póliza" value={data.poliza} />
        <InfoRow label="Dirección" value={data.direccion} />
      </InfoCard>

      {data.descripcion && (
        <div className="border border-[#e6e8eb] rounded-lg overflow-hidden bg-[#f8faff]">
          <div className="px-[14px] py-[8px] border-b border-[#e6e8eb]">
            <h3 className="text-[10px] font-bold text-[#111827] uppercase tracking-widest">
              Descripción del Incidente
            </h3>
          </div>
          <div className="px-[14px] py-[10px]">
            <p className="text-[11px] text-gray-800 leading-relaxed whitespace-pre-wrap">
              {data.descripcion}
            </p>
          </div>
        </div>
      )}

      <InfoCard title="Datos del Ejecutivo">
        <InfoRow label="Nombre" value={data.ejecutivo_nombre} />
        <InfoRow label="Celular" value={data.ejecutivo_celular} />
        <InfoRow label="Intentos de llamada" value={data.intentos_llamada} />
        <InfoRow label="Hubo tripartita" value={data.hubo_tripartita} />
        <InfoRow label="Hora de contacto" value={data.hora_contacto} />
        {data.observaciones && (
          <div className="flex flex-col gap-[3px] pt-[2px]">
            <span className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">
              Observaciones
            </span>
            <p className="text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed">
              {data.observaciones}
            </p>
          </div>
        )}
      </InfoCard>
    </div>
  );
}
