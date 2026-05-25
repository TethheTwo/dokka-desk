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

function F({ label, value }: { label: string; value: string | number | null | undefined }) {
  const v = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div>
      <div className="text-[9px] text-[#6b7280] font-medium">{label}</div>
      <div className="text-[12px] text-[#111827] font-medium mt-[1px]">{v}</div>
    </div>
  );
}

function Pair({
  a,
  b,
}: {
  a: { label: string; value: string | number | null | undefined };
  b: { label: string; value: string | number | null | undefined };
}) {
  return (
    <div className="flex flex-row mb-[8px]">
      <div className="w-1/2">
        <F label={a.label} value={a.value} />
      </div>
      <div className="w-1/2">
        <F label={b.label} value={b.value} />
      </div>
    </div>
  );
}

export function ModernFormSheet({ variant, data }: Props) {
  const code = variant === "ap" ? "F-775" : "F-805";

  return (
    <div className="w-full h-full px-[24px] py-[18px] bg-white text-[#111827]">
      <div className="border-t-[1.5px] border-[#1d84f5] mb-[12px]" />

      <div className="flex items-start justify-between mb-[2px]">
        <div>
          <div className="text-[9px] text-[#6b7280] font-medium tracking-[0.06em]">{code}</div>
          <h1 className="text-[15px] font-bold mt-[1px] leading-tight">
            {variant === "ap" ? "Accidentes Personales Patrimoniales" : "Casos Generales"}
          </h1>
        </div>
        <div className="text-right text-[9px] text-[#6b7280] leading-relaxed">
          <div>
            Registro:{" "}
            <span className="font-semibold text-[#111827]">{data.nro ?? "—"}</span>
          </div>
          <div>
            Colaborador:{" "}
            <span className="font-semibold text-[#111827]">{data.colaborador || "—"}</span>
          </div>
        </div>
      </div>

      <div className="text-[9px] text-[#6b7280] mb-[14px]">
        Fecha de solicitud:{" "}
        <span className="font-medium text-[#111827]">{fmtDate(data.fecha_solicitud)}</span>
      </div>

      <hr className="border-t border-[#d1d5db] mb-[12px]" />

      <Pair
        a={{ label: "Fecha de solicitud", value: fmtDate(data.fecha_solicitud) }}
        b={{ label: "Fecha del siniestro", value: fmtDate(data.fecha_siniestro) }}
      />
      {variant === "ap" ? (
        <Pair
          a={{ label: "Nombre del accidentado", value: data.nombre_accidentado }}
          b={{ label: "Carnet del accidentado", value: data.carnet_accidentado }}
        />
      ) : (
        <Pair
          a={{ label: "Asegurado", value: data.asegurado }}
          b={{ label: "Daños personales", value: data.danos_personales || "—" }}
        />
      )}
      <Pair
        a={{ label: "Solicitante", value: data.solicitante }}
        b={{ label: "Celular", value: data.celular }}
      />
      <Pair
        a={{ label: "Departamento", value: data.departamento }}
        b={{ label: "Póliza", value: data.poliza }}
      />
      <div className="mb-[8px]">
        <F label="Dirección" value={data.direccion} />
      </div>

      {data.descripcion && (
        <>
          <hr className="border-t border-[#d1d5db] mb-[10px]" />
          <div className="text-[9px] font-semibold text-[#6b7280] uppercase tracking-[0.06em] mb-[6px]">
            Descripci&oacute;n del Incidente
          </div>
          <p className="text-[11px] text-[#374151] leading-relaxed whitespace-pre-wrap mb-[10px]">
            {data.descripcion}
          </p>
        </>
      )}

      <hr className="border-t border-[#d1d5db] mb-[10px]" />

      <div className="text-[9px] font-semibold text-[#6b7280] uppercase tracking-[0.06em] mb-[8px]">
        Datos del Ejecutivo
      </div>

      <Pair
        a={{ label: "Nombre", value: data.ejecutivo_nombre }}
        b={{ label: "Celular", value: data.ejecutivo_celular }}
      />
      <Pair
        a={{ label: "Intentos de llamada", value: data.intentos_llamada }}
        b={{ label: "Hubo tripartita", value: data.hubo_tripartita }}
      />
      <div className="flex flex-row mb-[8px]">
        <div className="w-1/2">
          <F label="Hora de contacto" value={data.hora_contacto} />
        </div>
        <div className="w-1/2" />
      </div>

      {data.observaciones && (
        <div className="mt-[8px]">
          <div className="text-[9px] text-[#6b7280] font-medium">Observaciones</div>
          <div className="text-[11px] text-[#374151] leading-relaxed mt-[1px]">{data.observaciones}</div>
        </div>
      )}
    </div>
  );
}
