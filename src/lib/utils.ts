import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Pads a canvas with white bars to achieve A4 **portrait** aspect ratio (210:297).
 * Source (900×720, ratio 1.25) is wider than A4 portrait (0.707) →
 * white bars added on top and bottom. Content is centered.
 */
export function padToA4(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const A4 = 210 / 297;
  const srcW = canvas.width;
  const srcH = canvas.height;
  const srcR = srcW / srcH;

  let dstW: number, dstH: number, ox: number, oy: number;

  if (srcR > A4) {
    dstW = srcW;
    dstH = Math.round(srcW / A4);
    ox = 0;
    oy = Math.round((dstH - srcH) / 2);
  } else {
    dstH = srcH;
    dstW = Math.round(srcH * A4);
    ox = Math.round((dstW - srcW) / 2);
    oy = 0;
  }

  const c = document.createElement("canvas");
  c.width = dstW;
  c.height = dstH;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dstW, dstH);
  ctx.drawImage(canvas, ox, oy);
  return c;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Permite solo dígitos y caracteres telefónicos válidos: + - ( ) y espacios.
 * Elimina todo lo demás (letras, símbolos no telefónicos).
 */
export function sanitizePhone(value: string): string {
  return (value ?? "").replace(/[^0-9+\-()\s]/g, "");
}

/**
 * Formato global de códigos. Ej: formatCode("TK", 5) -> "TK-005"
 * Si supera los 999, agrega más dígitos automáticamente.
 */
export function formatCode(
  prefix: "TK" | "CG" | "AP",
  n: number | string | null | undefined,
): string {
  if (n === null || n === undefined || n === "") return prefix + "-—";
  const num = typeof n === "number" ? n : parseInt(String(n), 10);
  if (Number.isNaN(num)) return `${prefix}-${n}`;
  const min = Math.max(3, String(num).length);
  return `${prefix}-${String(num).padStart(min, "0")}`;
}
