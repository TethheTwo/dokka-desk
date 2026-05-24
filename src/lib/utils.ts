import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
