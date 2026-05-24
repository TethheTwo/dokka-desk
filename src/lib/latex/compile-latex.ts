import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ReportInput = z.object({
  variant: z.enum(["ap", "cg", "generic"]),
  nro: z.union([z.string(), z.number()]),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  fields: z.record(z.string(), z.string().nullable().optional()),
});

function replaceTex(src: string, data: Record<string, string | null | undefined>): string {
  let out = src;
  for (const [key, val] of Object.entries(data)) {
    const safe = (val ?? "").replace(/[_#%&{}]/g, "\\$&");
    out = out.replace(new RegExp(`__${key}__`, "g"), safe);
  }
  return out;
}

export const compileReportPDF = createServerFn({ method: "POST" })
  .inputValidator((input) => ReportInput.parse(input))
  .handler(async ({ data }) => {
    const { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } = await import("node:fs");
    const { execSync } = await import("node:child_process");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");

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
  .inputValidator((input) => ReportInput.parse(input))
  .handler(async ({ data }) => {
    const { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } = await import("node:fs");
    const { execSync } = await import("node:child_process");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");

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
