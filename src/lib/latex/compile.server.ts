import { createServerFn } from "@tanstack/react-start";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

interface ReportData {
  variant: "ap" | "cg" | "generic";
  nro: number | string;
  title?: string;
  subtitle?: string;
  fields: Record<string, string | null | undefined>;
}

function replaceTex(src: string, data: Record<string, string | null | undefined>): string {
  let out = src;
  for (const [key, val] of Object.entries(data)) {
    const safe = (val ?? "").replace(/[_#%&{}]/g, "\\$&");
    out = out.replace(new RegExp(`__${key}__`, "g"), safe);
  }
  return out;
}

export const compileReportPDF = createServerFn({ method: "POST" })
  .validator((d: ReportData) => d)
  .handler(async ({ data }) => {
    const { variant, fields } = data;

    const texPath = join(__dirname, "templates", `form-${variant === "generic" ? "generic" : variant}.tex`);
    if (!existsSync(texPath)) throw new Error(`Template not found: ${texPath}`);

    let template = readFileSync(texPath, "utf-8");
    template = replaceTex(template, fields);

    const dir = mkdtempSync(join(tmpdir(), "latex-"));
    try {
      const texFile = join(dir, "report.tex");
      writeFileSync(texFile, template, "utf-8");

      execSync("pdflatex -interaction=nonstopmode -halt-on-error report.tex", {
        cwd: dir,
        stdio: "pipe",
        timeout: 30000,
      });

      const pdfPath = join(dir, "report.pdf");
      if (!existsSync(pdfPath)) throw new Error("PDF not generated");

      const pdfBuffer = readFileSync(pdfPath);
      return { pdf: pdfBuffer.toString("base64"), mime: "application/pdf" };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

export const compileReportPNG = createServerFn({ method: "POST" })
  .validator((d: ReportData) => d)
  .handler(async ({ data }) => {
    const pdf = await compileReportPDF({ data });
    const dir = mkdtempSync(join(tmpdir(), "latex-"));
    try {
      const pdfPath = join(dir, "report.pdf");
      writeFileSync(pdfPath, Buffer.from(pdf.pdf, "base64"));

      execSync("pdftoppm -png -r 150 report.pdf report", {
        cwd: dir,
        stdio: "pipe",
        timeout: 30000,
      });

      const pngPath = join(dir, "report-1.png");
      if (!existsSync(pngPath)) throw new Error("PNG not generated");

      const pngBuffer = readFileSync(pngPath);
      return { png: pngBuffer.toString("base64"), mime: "image/png" };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
