import { useMemo, useRef, useState } from "react";
import { Copy, Mail, X, Check, ArrowLeft } from "lucide-react";
import { domToCanvas } from "modern-screenshot";
import { toast } from "sonner";
import { useMasterList } from "@/lib/master-lists";
import { FormSheet, type FormReportData } from "@/components/ReportPreviewModal";
import { formatCode } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  variant: "ap" | "cg";
  data: FormReportData;
}

const CC_FIXED = "nacionalseguros@conecta.com.bo";

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso as any);
  if (isNaN(d.getTime())) return String(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ShareReportModal({ open, onClose, variant, data }: Props) {
  const correos = useMasterList("correos");
  const [copied, setCopied] = useState(false);
  const [emailPicker, setEmailPicker] = useState(false);
  const [sharing, setSharing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const code = formatCode(variant === "ap" ? "AP" : "CG", (data as any).nro);

  const link = useMemo(() => {
    if (typeof window === "undefined") return "";
    const id = (data as any).id ?? data.nro;
    return `${window.location.origin}/p/reporte/${variant}/${id}`;
  }, [data, variant]);

  const ejecutivo = data.ejecutivo_nombre || "";
  const dept = (data.departamento || "").trim().toLowerCase();
  const destinatario = useMemo(() => {
    const match = correos.find(
      (c) =>
        String((c.value as any)?.department ?? "")
          .trim()
          .toLowerCase() === dept,
    );
    return match?.label ?? "";
  }, [correos, dept]);

  if (!open) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No se pudo copiar el link");
    }
  };

  const captureReport = async (): Promise<Blob> => {
    const node = captureRef.current;
    if (!node) throw new Error("no node");
    const canvas = await domToCanvas(node, {
      scale: 5,
      backgroundColor: "#ffffff",
      width: 595,
      height: 842,
    });
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png");
    });
  };

  const shareWhatsApp = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const blob = await captureReport();
      const file = new File([blob], `reporte-${code}.png`, { type: "image/png" });
      const nav = navigator as any;
      const shortText = `Reporte ${code}${ejecutivo ? " · " + ejecutivo : ""}`;
      if (nav.share && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], text: shortText, title: "Reporte" });
          return;
        } catch {
          /* usuario canceló */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-${code}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("Imagen descargada. Adjuntala en el chat de WhatsApp.", { duration: 5000 });
      window.open(
        `https://wa.me/?text=${encodeURIComponent(shortText)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar la imagen del reporte");
    } finally {
      setSharing(false);
    }
  };

  const buildEmailParts = (mode: "html" | "text" = "text") => {
    const hora = fmtTime((data as any).created_at);
    const subject =
      variant === "cg"
        ? `F-805 Atención de Casos Generales/${data.asegurado ?? ""}/${data.departamento ?? ""}/${ejecutivo}`
        : `F-775 Atención de Accidentes Personales NSPF/${data.nombre_accidentado ?? ""}/${data.departamento ?? ""}/${ejecutivo}`;

    const sep = "────────────────────────────";
    const introTxt =
      variant === "cg"
        ? "Por medio del presente, se informa que se recibió una comunicación a través de la línea 800, mediante la cual se reportó el siguiente Caso General:"
        : "Por medio del presente, se informa que se recibió una comunicación a través de la línea 800, mediante la cual se reportó el siguiente Accidente Personal:";

    const datosTxt =
      variant === "cg"
        ? [
            `Asegurado: ${data.asegurado ?? ""}`,
            `Solicitante: ${data.solicitante ?? ""}`,
            `Celular: ${data.celular ?? ""}`,
            `Departamento: ${data.departamento ?? ""}`,
            `Póliza: ${data.poliza ?? ""}`,
            `Dirección: ${data.direccion ?? ""}`,
          ].join("\n")
        : [
            `Asegurado: ${data.nombre_accidentado ?? ""}`,
            `Carnet: ${data.carnet_accidentado ?? ""}`,
            `Solicitante: ${data.solicitante ?? ""}`,
            `Celular: ${data.celular ?? ""}`,
            `Departamento: ${data.departamento ?? ""}`,
            `Póliza: ${data.poliza ?? ""}`,
            `Dirección: ${data.direccion ?? ""}`,
          ].join("\n");

    const descTitle = variant === "cg" ? "DESCRIPCIÓN DEL CASO" : "DESCRIPCIÓN DEL ACCIDENTE";

    const bodyText = [
      "Estimados:",
      "Saludos cordiales.",
      "",
      introTxt,
      "",
      sep,
      "DATOS REGISTRADOS",
      sep,
      datosTxt,
      "",
      sep,
      descTitle,
      sep,
      `Descripción: ${data.descripcion ?? ""}`,
      "",
      sep,
      "DATOS DEL REPORTE",
      sep,
      `Reportado a: ${ejecutivo}`,
      `Hora del reporte: ${hora}`,
      `Link del reporte: ${link}`,
    ].join("\n");

    const sectionStyle =
      "margin:18px 0 6px;font-size:14px;font-weight:700;letter-spacing:.04em;color:#0f172a;text-transform:uppercase;";
    const hrStyle = "border:none;border-top:1px solid #cbd5e1;margin:0 0 10px;";
    const rowStyle = "margin:3px 0;font-size:13px;line-height:1.5;color:#0f172a;";
    const labelStyle = "font-weight:600;color:#334155;";

    const rowHTML = (label: string, value: string) =>
      `<p style="${rowStyle}"><span style="${labelStyle}">${label}:</span> ${value || ""}</p>`;

    const datosHTML =
      variant === "cg"
        ? [
            rowHTML("Asegurado", data.asegurado ?? ""),
            rowHTML("Solicitante", data.solicitante ?? ""),
            rowHTML("Celular", data.celular ?? ""),
            rowHTML("Departamento", data.departamento ?? ""),
            rowHTML("Póliza", data.poliza ?? ""),
            rowHTML("Dirección", data.direccion ?? ""),
          ].join("")
        : [
            rowHTML("Asegurado", data.nombre_accidentado ?? ""),
            rowHTML("Carnet", data.carnet_accidentado ?? ""),
            rowHTML("Solicitante", data.solicitante ?? ""),
            rowHTML("Celular", data.celular ?? ""),
            rowHTML("Departamento", data.departamento ?? ""),
            rowHTML("Póliza", data.poliza ?? ""),
            rowHTML("Dirección", data.direccion ?? ""),
          ].join("");

    const bodyHTML = `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:680px;">
  <p style="margin:0 0 4px;font-size:14px;"><strong>Estimados:</strong></p>
  <p style="margin:0 0 12px;font-size:13px;">Saludos cordiales.</p>
  <p style="margin:0 0 12px;font-size:13px;line-height:1.5;">${introTxt}</p>

  <h3 style="${sectionStyle}">Datos Registrados</h3>
  <hr style="${hrStyle}" />
  ${datosHTML}

  <h3 style="${sectionStyle}">${descTitle}</h3>
  <hr style="${hrStyle}" />
  ${rowHTML("Descripción", data.descripcion ?? "")}

  <h3 style="${sectionStyle}">Datos del Reporte</h3>
  <hr style="${hrStyle}" />
  ${rowHTML("Reportado a", ejecutivo)}
  ${rowHTML("Hora del reporte", hora)}
  <p style="${rowStyle}"><span style="${labelStyle}">Link del reporte:</span> <a href="${link}" style="color:#2f7fd6;">${link}</a></p>
</div>`.trim();

    return { subject, body: mode === "html" ? bodyHTML : bodyText, to: destinatario, cc: CC_FIXED };
  };

  const ensureRecipient = () => {
    if (!destinatario) {
      toast.warning("No existe correo configurado para este departamento");
      return false;
    }
    return true;
  };

  const openMailto = () => {
    if (!ensureRecipient()) return;
    const { subject, body, to, cc } = buildEmailParts("text");
    const url = `mailto:${encodeURIComponent(to)}?cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  const openOutlookWeb = () => {
    if (!ensureRecipient()) return;
    const { subject, body, to, cc } = buildEmailParts("text");
    const url = `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openGmail = () => {
    if (!ensureRecipient()) return;
    const { subject, body, to, cc } = buildEmailParts("text");
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&cc=${encodeURIComponent(cc)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in-0 duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Hidden capture target */}
      <div
        ref={captureRef}
        aria-hidden
        style={{
          position: "fixed",
          left: "-10000px",
          top: 0,
          width: 595,
          height: 842,
          background: "#fff",
        }}
      >
        <div style={{ width: 595, height: 842 }}>
          <FormSheet variant={variant} data={data} />
        </div>
      </div>

      <div
        className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-md animate-in zoom-in-95 fade-in-0 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 pt-5 pb-3 text-center border-b border-border">
          {emailPicker && (
            <button
              onClick={() => setEmailPicker(false)}
              className="absolute left-3 top-3 inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
              aria-label="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h3 className="text-base font-semibold tracking-tight">
            {emailPicker ? "Elegí tu cliente de correo" : "Compartir Reporte"}
          </h3>
          <button
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!emailPicker ? (
          <div className="px-6 py-5">
            <div className="text-xs font-semibold text-muted-foreground mb-3">Compartir</div>
            <div className="flex items-start justify-center gap-8">
              <button
                onClick={shareWhatsApp}
                disabled={sharing}
                className="group flex flex-col items-center gap-2 focus:outline-none disabled:opacity-60"
              >
                <span className="h-14 w-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-105 group-active:scale-95">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
                    <path d="M19.05 4.91A10 10 0 0 0 12 2C6.48 2 2 6.48 2 12c0 1.76.46 3.45 1.34 4.95L2 22l5.2-1.36A10 10 0 0 0 12 22c5.52 0 10-4.48 10-10 0-2.67-1.04-5.18-2.95-7.09Zm-7.05 15.2c-1.56 0-3.08-.42-4.42-1.21l-.31-.18-3.09.81.83-3-.2-.32a8.13 8.13 0 1 1 7.19 3.9Zm4.47-6.1c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.92-1.18-.71-.63-1.18-1.4-1.32-1.64-.14-.24-.02-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.4 1.37.51.57.18 1.09.16 1.5.1.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
                  </svg>
                </span>
                <span className="text-xs text-foreground">
                  {sharing ? "Generando…" : "WhatsApp"}
                </span>
              </button>
              <button
                onClick={() => setEmailPicker(true)}
                className="group flex flex-col items-center gap-2 focus:outline-none"
              >
                <span className="h-14 w-14 rounded-full bg-slate-500 text-white flex items-center justify-center shadow-md transition-transform group-hover:scale-105 group-active:scale-95">
                  <Mail className="h-6 w-6" />
                </span>
                <span className="text-xs text-foreground text-center leading-tight">
                  Correo
                  <br />
                  electrónico
                </span>
              </button>
            </div>

            <div className="mt-6 flex items-center gap-2 rounded-full border border-input bg-muted/30 pl-4 pr-1.5 py-1.5">
              <input
                readOnly
                value={link}
                className="flex-1 bg-transparent text-xs text-foreground/80 outline-none truncate"
              />
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-background border border-border text-xs font-medium hover:bg-muted transition-colors"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>

            {destinatario && (
              <p className="mt-3 text-[11px] text-muted-foreground text-center">
                Destinatario sugerido por departamento:{" "}
                <span className="font-medium text-foreground">{destinatario}</span>
              </p>
            )}
          </div>
        ) : (
          <div className="px-6 py-5 space-y-2 animate-in fade-in-0 slide-in-from-right-2 duration-200">
            <EmailOption
              label="Outlook clásico"
              hint="Aplicación de escritorio (mailto)"
              color="#0072C6"
              initials="O"
              onClick={openMailto}
            />
            <EmailOption
              label="Outlook Web / Microsoft 365"
              hint="Compone en outlook.office.com"
              color="#0078D4"
              initials="O"
              onClick={openOutlookWeb}
            />
            <EmailOption
              label="Gmail"
              hint="Compone en mail.google.com"
              color="#EA4335"
              initials="G"
              onClick={openGmail}
            />
            {!destinatario && (
              <p className="pt-2 text-[11px] text-amber-600 text-center">
                No existe correo configurado para este departamento.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmailOption({
  label,
  hint,
  color,
  initials,
  onClick,
}: {
  label: string;
  hint: string;
  color: string;
  initials: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl border border-border hover:bg-muted transition-colors text-left"
    >
      <span
        className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm shrink-0"
        style={{ backgroundColor: color }}
      >
        {initials}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
