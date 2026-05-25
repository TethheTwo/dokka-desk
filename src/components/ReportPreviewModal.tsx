import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Camera, FileText, X, Image as ImageIcon } from "lucide-react";
import { domToCanvas } from "modern-screenshot";
import { toast } from "sonner";
import { formatCode } from "@/lib/utils";

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

const SHEET_W = 900;
const SHEET_H = 720;
const BRAND = "#2f7fd6";
const BAR = "#5a8fc4";

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
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cachedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = stageRef.current;
    if (!el) return;
    const recalc = () => {
      setScale(Math.min(1, el.clientWidth / SHEET_W));
    };
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) cachedCanvasRef.current = null;
  }, [open]);

  if (!open) return null;

  const renderCanvas = async () => {
    if (cachedCanvasRef.current) return cachedCanvasRef.current;
    const node = sheetRef.current;
    if (!node) throw new Error("no node");
    const savedTransform = node.style.transform;
    node.style.transform = "none";
    const canvas = await domToCanvas(node, {
      backgroundColor: "#ffffff",
      width: SHEET_W,
      height: SHEET_H,
      scale: 5,
    });
    node.style.transform = savedTransform;
    cachedCanvasRef.current = canvas;
    return canvas;
  };

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

  const downloadPNG = async () => {
    try {
      setBusy("png");
      const c = await renderCanvas();
      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("no blob");
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
      const c = await renderCanvas();
      const img = c.toDataURL("image/png");
      const pdf = new (await import("jspdf")).jsPDF({
        unit: "pt",
        format: [SHEET_W, SHEET_H],
      });
      pdf.addImage(img, "PNG", 0, 0, SHEET_W, SHEET_H);
      pdf.save(`${fileBase()}.pdf`);
      toast.success("PDF descargado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    } finally {
      setBusy(null);
    }
  };

  const downloadCanvasAsFallback = (c: HTMLCanvasElement) => {
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `${fileBase()}.png`;
    a.click();
  };

  const copyToClipboard = async () => {
    try {
      setBusy("copy");
      const tid = toast.loading("Capturando reporte…");
      const c = await renderCanvas();
      toast.dismiss(tid);
      if (
        typeof window === "undefined" ||
        typeof (window as any).ClipboardItem === "undefined" ||
        !navigator.clipboard?.write
      ) {
        downloadCanvasAsFallback(c);
        toast.success("Tu navegador no permite copiar imágenes — se descargó como archivo");
        return;
      }
      await new Promise<void>((resolve) => {
        c.toBlob(async (blob) => {
          if (!blob) {
            downloadCanvasAsFallback(c);
            toast.success("Se descargó como archivo");
            resolve();
            return;
          }
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            toast.success("Reporte copiado como imagen al portapapeles");
          } catch {
            downloadCanvasAsFallback(c);
            toast.success("No se pudo copiar — se descargó como archivo");
          } finally {
            resolve();
          }
        }, "image/png");
      });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la captura");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-auto animate-in fade-in-0 duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-background rounded-xl shadow-2xl border border-border w-full max-w-[960px] animate-in zoom-in-95 fade-in-0 duration-200"
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
          <div
            ref={stageRef}
            className="mx-auto"
            style={{ width: "100%", maxWidth: `${SHEET_W}px` }}
          >
            <div
              className="relative bg-white shadow-lg border border-slate-300 rounded-sm overflow-hidden mx-auto"
              style={{ width: `${SHEET_W * scale}px`, height: `${SHEET_H * scale}px` }}
            >
              <div
                ref={sheetRef}
                style={{
                  width: `${SHEET_W}px`,
                  height: `${SHEET_H}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  background: "#ffffff",
                  color: "#0f172a",
                }}
              >
                <div style={{ width: "100%", height: "100%" }}>
                  {variant && data ? (
                    <FormSheet variant={variant} data={data} />
                  ) : (
                    <GenericSheet
                      title={title}
                      subtitle={subtitle}
                      nro={nro}
                      sections={sections ?? []}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Form sheet React components ---------- */

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
        padding: "18px 28px",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#0f172a",
        background: "#ffffff",
        fontSize: 11,
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: 13,
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 10,
        }}
      >
        {heading}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr",
          rowGap: 3,
          fontSize: 11,
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 600, color: BRAND }}>N° de Registro</div>
        <div style={{ color: "#0f172a", fontWeight: 600 }}>{data.nro ?? "—"}</div>
        <div style={{ fontWeight: 600, color: BRAND }}>Colaborador</div>
        <div style={{ color: "#0f172a" }}>{data.colaborador || "—"}</div>
      </div>

      <SectionBar>Datos del Siniestro</SectionBar>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 12, marginTop: 8 }}
      >
        <div />
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 3, fontSize: 13 }}>
          <LabelR>Fecha de solicitud</LabelR>
          <Val>{fmtDate(data.fecha_solicitud)}</Val>
          <LabelR>Fecha del siniestro</LabelR>
          <Val>{fmtDate(data.fecha_siniestro)}</Val>
          {variant === "cg" && (
            <>
              <LabelR>Daños Personales</LabelR>
              <Val>{data.danos_personales || "—"}</Val>
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "170px 1fr",
          columnGap: 8,
          rowGap: 4,
          fontSize: 11,
          marginTop: 8,
        }}
      >
        {variant === "ap" ? (
          <>
            <LabelL>Nombre del Accidentado</LabelL>
            <InputBox>{data.nombre_accidentado}</InputBox>
            <LabelL>Carnet del Accidentado</LabelL>
            <InputBox>{data.carnet_accidentado}</InputBox>
          </>
        ) : (
          <>
            <LabelL>Asegurado</LabelL>
            <InputBox>{data.asegurado}</InputBox>
          </>
        )}
        <LabelL>Solicitante</LabelL>
        <InputBox>{data.solicitante}</InputBox>
        <LabelL>Celular</LabelL>
        <InputBox>{data.celular}</InputBox>
        <LabelL>Departamento</LabelL>
        <InputBox>{data.departamento}</InputBox>
        <LabelL>Póliza</LabelL>
        <InputBox>{data.poliza}</InputBox>
        <LabelL>Dirección</LabelL>
        <InputBox>{data.direccion}</InputBox>
        <LabelL>Descripción</LabelL>
        <InputBox>{data.descripcion}</InputBox>
      </div>

      <div style={{ marginTop: 10 }}>
        <SectionBar>Datos del Ejecutivo</SectionBar>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 16,
          marginTop: 8,
          fontSize: 11,
        }}
      >
        <div
          style={{ display: "grid", gridTemplateColumns: "110px 1fr", columnGap: 8, rowGap: 5 }}
        >
          <LabelL>Nombre</LabelL>
          <InputBox>{data.ejecutivo_nombre}</InputBox>
          <LabelL>Celular</LabelL>
          <InputBox>{data.ejecutivo_celular}</InputBox>
          <LabelL>Intentos de llamada</LabelL>
          <InputBox>{data.intentos_llamada}</InputBox>
          <LabelL>Observaciones</LabelL>
          <InputBox tall>{data.observaciones}</InputBox>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr",
            rowGap: 5,
            alignSelf: "start",
          }}
        >
          <LabelR>Hubo tripartita</LabelR>
          <Val>{data.hubo_tripartita || "—"}</Val>
          <LabelR>Hora de contacto</LabelR>
          <Val>{data.hora_contacto || "—"}</Val>
        </div>
      </div>
    </div>
  );
}

function SectionBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        color: "#ffffff",
        fontSize: 11,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 2,
        background: BAR,
      }}
    >
      {children}
    </div>
  );
}
function LabelL({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 600, lineHeight: "20px", color: BRAND }}>{children}</div>;
}
function LabelR({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontWeight: 600,
        textAlign: "right",
        paddingRight: 8,
        lineHeight: "20px",
        color: BRAND,
      }}
    >
      {children}
    </div>
  );
}
function Val({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#0f172a", lineHeight: "20px" }}>{children}</div>;
}
function InputBox({ children, tall }: { children: React.ReactNode; tall?: boolean }) {
  const v = children === null || children === undefined || children === "" ? "" : String(children);
  return (
    <div
      style={{
        border: "1px solid #94a3b8",
        background: "#ffffff",
        padding: "3px 8px",
        color: "#0f172a",
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
        minHeight: tall ? 40 : 20,
        fontSize: 11,
      }}
    >
      {v}
    </div>
  );
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/* ---------- Generic sheet ---------- */

function GenericSheet({
  title,
  subtitle,
  nro,
  sections,
}: {
  title: string;
  subtitle?: string;
  nro: number | string;
  sections: ReportSection[];
}) {
  return (
    <div className="p-5 h-full flex flex-col" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      <div
        className="flex items-start justify-between border-b-2 pb-2 mb-3"
        style={{ borderColor: BRAND }}
      >
        <div>
          <div
            className="text-[10px] font-semibold tracking-widest uppercase"
            style={{ color: BRAND }}
          >
            DOKKA Desk
          </div>
          <h2 className="text-xl font-bold leading-tight">{title}</h2>
          {subtitle && <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Reporte N°</div>
          <div className="text-2xl font-bold leading-none" style={{ color: BRAND }}>
            {nro}
          </div>
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 content-start">
        {sections.map((s, i) => (
          <div key={i} className="border border-slate-300 rounded-sm overflow-hidden">
            <div className="bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-300">
              {s.title}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 p-2">
              {s.fields.map((f, j) => (
                <div key={j} className={f.full ? "col-span-2" : ""}>
                  <div className="text-[9px] uppercase tracking-wide text-slate-500 font-semibold leading-tight">
                    {f.label}
                  </div>
                  <div className="text-[11px] text-slate-900 break-words whitespace-pre-wrap leading-snug">
                    {f.value === null || f.value === undefined || f.value === ""
                      ? "—"
                      : String(f.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
