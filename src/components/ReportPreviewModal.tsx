import { useEffect, useRef, useState } from "react";
import { Camera, FileText, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCode } from "@/lib/utils";
import { compileReportPDF, compileReportPNG } from "@/lib/latex/compile-latex";

export interface ReportField {
  label: string;
  value: string | number | null | undefined;
  full?: boolean;
}
export interface ReportSection {
  title: string;
  fields: ReportField[];
}

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
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  nro: number | string;
  sections?: ReportSection[];
  variant?: "ap" | "cg";
  data?: FormReportData;
}

function buildFormFields(data: FormReportData, variant: "ap" | "cg") {
  return {
    FECHA_SOLICITUD: fmtDate(data.fecha_solicitud),
    FECHA_SINIESTRO: fmtDate(data.fecha_siniestro),
    ACCIDENTADO: variant === "ap" ? data.nombre_accidentado : null,
    CARNET: variant === "ap" ? data.carnet_accidentado : null,
    ASEGURADO: variant === "cg" ? data.asegurado : null,
    DANOS: variant === "cg" ? data.danos_personales : null,
    SOLICITANTE: data.solicitante,
    CELULAR: data.celular,
    DEPARTAMENTO: data.departamento,
    POLIZA: data.poliza,
    DIRECCION: data.direccion,
    DESCRIPCION: data.descripcion,
    EJECUTIVO: data.ejecutivo_nombre,
    EJ_CEL: data.ejecutivo_celular,
    INTENTOS: data.intentos_llamada,
    OBS: data.observaciones,
    TRI: data.hubo_tripartita,
    HORA: data.hora_contacto,
    FOOTER: "",
  };
}

function buildSectionsLatex(sections: ReportSection[]): string {
  return sections
    .map(
      (s) =>
        `\\sectionbar{${s.title}}\n\\begin{tabularx}{\\textwidth}{p{4cm}X}\n  ${s.fields
          .map((f) => `\\fieldlabel{${f.label}} & \\fieldbox{${f.value ?? "—"}} \\\\`)
          .join("\n  ")}\n\\end{tabularx}`,
    )
    .join("\n\n");
}

export function ReportPreviewModal({
  open,
  onClose,
  title,
  subtitle,
  nro,
  sections,
  variant,
  data,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const cachedPdf = useRef<string | null>(null);
  const cachedPng = useRef<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const buildFields = (): Record<string, string | null | undefined> => {
    if (variant && data) return buildFormFields(data, variant);
    return {
      TITLE: title,
      SUBTITLE: subtitle ?? "",
      NRO: String(nro ?? ""),
      CONTENT: buildSectionsLatex(sections ?? []),
      FOOTER: "",
    };
  };

  useEffect(() => {
    if (!open) return;
    setLoadError(false);
    if (cachedPng.current) {
      setPreviewUrl(cachedPng.current);
      return;
    }
    setLoading(true);
    compileReportPNG({
      data: { variant: variant ?? "generic", nro, title, subtitle, fields: buildFields() },
    })
      .then((r: { png: string; mime: string }) => {
        const url = `data:image/png;base64,${r.png}`;
        cachedPng.current = url;
        setPreviewUrl(url);
      })
      .catch((e: unknown) => {
        console.error(e);
        setLoadError(true);
        toast.error("No se pudo generar la vista previa");
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPreviewUrl(null);
      setLoadError(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const fileBase = () => {
    const prefix = variant === "ap" ? "AP" : variant === "cg" ? "CG" : "RP";
    const code = formatCode(prefix as "AP" | "CG", nro as number);
    const slug =
      variant === "ap"
        ? "reporte_accidentes_personales"
        : variant === "cg"
          ? "reporte_casos_generales"
          : `reporte-${nro}`;
    return `${slug}_${code}`;
  };

  const ensurePngBlob = async (): Promise<Blob> => {
    const url = cachedPng.current;
    if (!url) throw new Error("No cached PNG");
    const resp = await fetch(url);
    return resp.blob();
  };

  const downloadPNG = async () => {
    try {
      setBusy("png");
      const blob = await ensurePngBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("Imagen descargada");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la imagen");
    } finally {
      setBusy(null);
    }
  };

  const downloadPDF = async () => {
    try {
      setBusy("pdf");
      const pdfData = cachedPdf.current;
      if (!pdfData) {
        const r = await compileReportPDF({
          data: { variant: variant ?? "generic", nro, title, subtitle, fields: buildFields() },
        });
        cachedPdf.current = r.pdf;
      }
      const bytes = Uint8Array.from(atob(cachedPdf.current!), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileBase()}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("PDF descargado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    } finally {
      setBusy(null);
    }
  };

  const copyToClipboard = async () => {
    try {
      setBusy("copy");
      const tid = toast.loading("Capturando reporte…");
      const blob = await ensurePngBlob();
      toast.dismiss(tid);
      if (
        typeof window === "undefined" ||
        typeof (window as any).ClipboardItem === "undefined" ||
        !navigator.clipboard?.write
      ) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileBase()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast.success("Tu navegador no permite copiar imágenes — se descargó como archivo");
        return;
      }
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Reporte copiado como imagen al portapapeles");
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileBase()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        toast.success("No se pudo copiar — se descargó como archivo");
      }
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la captura");
    } finally {
      setBusy(null);
    }
  };

  const SHEET_ASPECT = 595 / 842;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto animate-in fade-in-0 duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-background rounded-xl shadow-2xl border border-border w-full max-w-[720px] animate-in zoom-in-95 fade-in-0 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="text-sm font-semibold">Vista previa del reporte</div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border-2 border-[#2f7fd6] text-[#2f7fd6] text-xs font-semibold hover:bg-[#2f7fd6]/10 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" /> Captura
            </button>
            <button
              onClick={downloadPNG}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <ImageIcon className="h-3.5 w-3.5" /> Imagen
            </button>
            <button
              onClick={downloadPDF}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-rose-600 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" /> PDF
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-muted/40 rounded-b-xl">
          <div className="mx-auto" style={{ width: "100%", maxWidth: "595px" }}>
            <div
              className="relative bg-white shadow-lg border border-slate-300 rounded-sm overflow-hidden mx-auto"
              style={{ width: "100%" }}
            >
              {loading && (
                <div
                  className="flex items-center justify-center text-slate-400"
                  style={{ aspectRatio: `${SHEET_ASPECT}` }}
                >
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
              {loadError && (
                <div
                  className="flex items-center justify-center text-red-400 text-sm"
                  style={{ aspectRatio: `${SHEET_ASPECT}` }}
                >
                  Error al generar la vista previa
                </div>
              )}
              {previewUrl && (
                <img
                  ref={imgRef}
                  src={previewUrl}
                  alt="Vista previa del reporte"
                  className="block w-full h-auto"
                  style={{ display: "block" }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/* ---------- React FormSheet (kept for public report pages) ---------- */

const _BRAND = "#2f7fd6";
const _BAR = "#5a8fc4";

function _SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: "#ffffff",
        fontSize: 13,
        fontWeight: 600,
        padding: "6px 10px",
        borderRadius: 2,
        background: _BAR,
      }}
    >
      {children}
    </div>
  );
}
function _LabelL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 600, lineHeight: "24px", color: _BRAND }}>{children}</div>;
}
function _LabelR({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 600,
        textAlign: "right",
        paddingRight: 10,
        lineHeight: "24px",
        color: _BRAND,
      }}
    >
      {children}
    </div>
  );
}
function _Val({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#0f172a", lineHeight: "24px" }}>{children}</div>;
}
function _InputBox({ children, tall }: { children: React.ReactNode; tall?: boolean }) {
  const v = children === null || children === undefined || children === "" ? "" : String(children);
  return (
    <div
      style={{
        border: "1px solid #94a3b8",
        background: "#ffffff",
        padding: "4px 10px",
        color: "#0f172a",
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
        minHeight: tall ? 56 : 24,
        fontSize: 13,
      }}
    >
      {v}
    </div>
  );
}

export function FormSheet({ variant, data }: { variant: "ap" | "cg"; data: FormReportData }) {
  const code = variant === "ap" ? "F-775" : "F-805";
  const heading =
    variant === "ap"
      ? `FORMULARIO PARA ACCIDENTES PERSONALES PATRIMONIALES   ${code}`
      : `FORMULARIO PARA CASOS GENERALES   ${code}`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "26px 40px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Calibri, Arial, sans-serif",
        color: "#0f172a",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: 16,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 16,
        }}
      >
        {heading}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr",
          rowGap: 4,
          fontSize: 13,
          marginBottom: 10,
        }}
      >
        <div style={{ fontWeight: 600, color: _BRAND }}>N° de Registro</div>
        <div style={{ color: "#0f172a", fontWeight: 600 }}>{data.nro ?? "—"}</div>
        <div style={{ fontWeight: 600, color: _BRAND }}>Colaborador</div>
        <div style={{ color: "#0f172a" }}>{data.colaborador || "—"}</div>
      </div>

      <_SectionBar>Datos del Siniestro</_SectionBar>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 16, marginTop: 10 }}
      >
        <div />
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 4, fontSize: 13 }}>
          <_LabelR>Fecha de solicitud</_LabelR>
          <_Val>{fmtDate(data.fecha_solicitud)}</_Val>
          <_LabelR>Fecha del siniestro</_LabelR>
          <_Val>{fmtDate(data.fecha_siniestro)}</_Val>
          {variant === "cg" && (
            <>
              <_LabelR>Daños Personales</_LabelR>
              <_Val>{data.danos_personales || "—"}</_Val>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "170px 1fr",
          columnGap: 10,
          rowGap: 6,
          fontSize: 13,
          marginTop: 10,
        }}
      >
        {variant === "ap" ? (
          <>
            <_LabelL>Nombre del Accidentado</_LabelL>
            <_InputBox>{data.nombre_accidentado}</_InputBox>
            <_LabelL>Carnet del Accidentado</_LabelL>
            <_InputBox>{data.carnet_accidentado}</_InputBox>
          </>
        ) : (
          <>
            <_LabelL>Asegurado</_LabelL>
            <_InputBox>{data.asegurado}</_InputBox>
          </>
        )}
        <_LabelL>Solicitante</_LabelL>
        <_InputBox>{data.solicitante}</_InputBox>
        <_LabelL>Celular</_LabelL>
        <_InputBox>{data.celular}</_InputBox>
        <_LabelL>Departamento</_LabelL>
        <_InputBox>{data.departamento}</_InputBox>
        <_LabelL>Póliza</_LabelL>
        <_InputBox>{data.poliza}</_InputBox>
        <_LabelL>Dirección</_LabelL>
        <_InputBox>{data.direccion}</_InputBox>
        <_LabelL>Descripción</_LabelL>
        <_InputBox>{data.descripcion}</_InputBox>
      </div>

      <div style={{ marginTop: 14 }}>
        <_SectionBar>Datos del Ejecutivo</_SectionBar>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 24,
          marginTop: 10,
          fontSize: 13,
        }}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "170px 1fr", columnGap: 10, rowGap: 6 }}
        >
          <_LabelL>Nombre</_LabelL>
          <_InputBox>{data.ejecutivo_nombre}</_InputBox>
          <_LabelL>Celular</_LabelL>
          <_InputBox>{data.ejecutivo_celular}</_InputBox>
          <_LabelL>Intentos de llamada</_LabelL>
          <_InputBox>{data.intentos_llamada}</_InputBox>
          <_LabelL>Observaciones</_LabelL>
          <_InputBox tall>{data.observaciones}</_InputBox>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "140px 1fr",
            rowGap: 6,
            alignSelf: "start",
          }}
        >
          <_LabelR>Hubo tripartita</_LabelR>
          <_Val>{data.hubo_tripartita || "—"}</_Val>
          <_LabelR>Hora de contacto</_LabelR>
          <_Val>{data.hora_contacto || "—"}</_Val>
        </div>
      </div>
    </div>
  );
}
