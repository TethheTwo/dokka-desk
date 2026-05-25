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

function FormRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  const v = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="flex gap-3 py-[5px] border-b border-[#e6e8eb]/40 last:border-b-0">
      <span className="w-[130px] shrink-0 text-[9px] font-medium text-[#6b7280] uppercase tracking-wider">
        {label}
      </span>
      <span className="text-[12px] font-medium text-[#111827]">{v}</span>
    </div>
  );
}

export function ModernFormSheet({ variant, data }: Props) {
  const code = variant === "ap" ? "F-775" : "F-805";

  return (
    <div className="w-full h-full px-[18px] py-[14px] bg-white">
      <div className="border-t-[3px] border-[var(--brand-blue,#1d84f5)] mb-[10px]" />

      <div className="flex items-start justify-between mb-[4px]">
        <span className="text-[9px] font-semibold text-[#6b7280] uppercase tracking-[0.12em]">
          DOKKA Desk
        </span>
        <span className="text-[10px] font-bold text-[var(--brand-blue,#1d84f5)]">{code}</span>
      </div>

      <h2 className="text-[14px] font-bold text-[#111827] mb-[1px]">
        {variant === "ap" ? "Accidentes Personales Patrimoniales" : "Casos Generales"}
      </h2>

      <div className="flex flex-wrap gap-x-[14px] gap-y-[2px] mb-[10px] text-[9px] text-[#6b7280]">
        <span>
          Registro:{" "}
          <span className="font-semibold text-[#111827]">{data.nro ?? "—"}</span>
        </span>
        <span>
          Colaborador:{" "}
          <span className="font-semibold text-[#111827]">{data.colaborador || "—"}</span>
        </span>
        <span>
          Fecha:{" "}
          <span className="font-semibold text-[#111827]">{fmtDate(data.fecha_solicitud)}</span>
        </span>
      </div>

      <hr className="border-t border-[#e6e8eb] mb-[8px]" />

      <div className="text-[8px] font-bold text-[#6b7280] uppercase tracking-[0.1em] mb-[6px]">
        Datos del Siniestro
      </div>

      <FormRow label="Fecha de solicitud" value={fmtDate(data.fecha_solicitud)} />
      <FormRow label="Fecha del siniestro" value={fmtDate(data.fecha_siniestro)} />
      {variant === "ap" ? (
        <>
          <FormRow label="Nombre del accidentado" value={data.nombre_accidentado} />
          <FormRow label="Carnet del accidentado" value={data.carnet_accidentado} />
        </>
      ) : (
        <>
          <FormRow label="Asegurado" value={data.asegurado} />
          {data.danos_personales && <FormRow label="Daños personales" value={data.danos_personales} />}
        </>
      )}
      <FormRow label="Solicitante" value={data.solicitante} />
      <FormRow label="Celular" value={data.celular} />
      <FormRow label="Departamento" value={data.departamento} />
      <FormRow label="Póliza" value={data.poliza} />
      <FormRow label="Dirección" value={data.direccion} />

      <hr className="border-t border-[#e6e8eb] my-[8px]" />

      {data.descripcion && (
        <div className="rounded-md border-l-4 border-[var(--brand-blue,#1d84f5)] bg-[color-mix(in_oklab,var(--brand-blue,#1d84f5)_6%,transparent)] p-[10px] mb-[8px]">
          <div className="text-[8px] font-bold text-[var(--brand-blue,#1d84f5)] uppercase tracking-[0.1em] mb-[4px]">
            Descripción del Incidente
          </div>
          <p className="text-[11px] text-[#374151] leading-relaxed whitespace-pre-wrap">
            {data.descripcion}
          </p>
        </div>
      )}

      <hr className="border-t border-[#e6e8eb] my-[8px]" />

      <div className="text-[8px] font-bold text-[#6b7280] uppercase tracking-[0.1em] mb-[6px]">
        Datos del Ejecutivo
      </div>

      <FormRow label="Nombre" value={data.ejecutivo_nombre} />
      <FormRow label="Celular" value={data.ejecutivo_celular} />
      <FormRow label="Intentos de llamada" value={data.intentos_llamada} />
      <FormRow label="Hubo tripartita" value={data.hubo_tripartita} />
      <FormRow label="Hora de contacto" value={data.hora_contacto} />
      {data.observaciones && (
        <div className="flex gap-3 py-[5px]">
          <span className="w-[130px] shrink-0 text-[9px] font-medium text-[#6b7280] uppercase tracking-wider">
            Observaciones
          </span>
          <span className="text-[11px] text-[#374151] whitespace-pre-wrap leading-relaxed flex-1">
            {data.observaciones}
          </span>
        </div>
      )}
    </div>
  );
}
