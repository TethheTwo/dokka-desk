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
    const raw = val ?? "";
    const safe = key === "CONTENT" ? raw : raw.replace(/[_#%&{}]/g, "\\$&");
    out = out.replace(new RegExp(`__${key}__`, "g"), safe);
  }
  return out;
}

const TEMPLATE_AP = String.raw`\documentclass[a4paper,12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[spanish]{babel}
\usepackage{geometry}
\usepackage{tabularx}
\usepackage{array}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{etoolbox}

\geometry{margin=2cm}

\definecolor{brand}{HTML}{2f7fd6}
\definecolor{bar}{HTML}{5a8fc4}

\newcommand{\sectionbar}[1]{%
  \noindent\colorbox{bar}{\parbox{\dimexpr\linewidth-2\fboxsep\relax}{\textcolor{white}{\textbf{#1}}}}\\[4pt]
}

\newcommand{\fieldlabel}[1]{\textcolor{brand}{\textbf{#1}}}
\newcommand{\fieldbox}[1]{\fbox{\parbox{\dimexpr\linewidth-2\fboxsep-2\fboxrule\relax}{\raggedright #1}}}

\begin{document}
\thispagestyle{empty}

\begin{center}
\textbf{\large FORMULARIO PARA ACCIDENTES PERSONALES PATRIMONIALES   F-775}
\end{center}

\sectionbar{Datos del Siniestro}

\begin{tabularx}{\textwidth}{Xr@{\hspace{4mm}}X}
  & \fieldlabel{Fecha de solicitud} & __FECHA_SOLICITUD__ \\
  & \fieldlabel{Fecha del siniestro} & __FECHA_SINIESTRO__ \\
\end{tabularx}

\vspace{4mm}

\noindent
\begin{tabularx}{\textwidth}{p{4cm}X}
  \fieldlabel{Nombre del Accidentado} & \fieldbox{__ACCIDENTADO__} \\
  \fieldlabel{Carnet del Accidentado} & \fieldbox{__CARNET__} \\
  \fieldlabel{Solicitante} & \fieldbox{__SOLICITANTE__} \\
  \fieldlabel{Celular} & \fieldbox{__CELULAR__} \\
  \fieldlabel{Departamento} & \fieldbox{__DEPARTAMENTO__} \\
  \fieldlabel{Póliza} & \fieldbox{__POLIZA__} \\
  \fieldlabel{Dirección} & \fieldbox{__DIRECCION__} \\
  \fieldlabel{Descripción} & \fieldbox{__DESCRIPCION__} \\
\end{tabularx}

\sectionbar{Datos del Ejecutivo}

\noindent
\begin{tabularx}{\textwidth}{p{4cm}Xp{4cm}X}
  \fieldlabel{Nombre} & \fieldbox{__EJECUTIVO__} & \fieldlabel{Hubo tripartita} & \fieldbox{__TRI__} \\
  \fieldlabel{Celular} & \fieldbox{__EJ_CEL__} & \fieldlabel{Hora de contacto} & \fieldbox{__HORA__} \\
  \fieldlabel{Intentos de llamada} & \fieldbox{__INTENTOS__} \\
  \fieldlabel{Observaciones} & \multicolumn{3}{X}{\fieldbox{__OBS__}} \\
\end{tabularx}

\def\footertext{__FOOTER__}
\ifdefempty{\footertext}{}{\vfill\noindent\textcolor{gray}{\tiny \footertext}}

\end{document}`;

const TEMPLATE_CG = String.raw`\documentclass[a4paper,12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[spanish]{babel}
\usepackage{geometry}
\usepackage{tabularx}
\usepackage{array}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{etoolbox}

\geometry{margin=2cm}

\definecolor{brand}{HTML}{2f7fd6}
\definecolor{bar}{HTML}{5a8fc4}

\newcommand{\sectionbar}[1]{%
  \noindent\colorbox{bar}{\parbox{\dimexpr\linewidth-2\fboxsep\relax}{\textcolor{white}{\textbf{#1}}}}\\[4pt]
}

\newcommand{\fieldlabel}[1]{\textcolor{brand}{\textbf{#1}}}
\newcommand{\fieldbox}[1]{\fbox{\parbox{\dimexpr\linewidth-2\fboxsep-2\fboxrule\relax}{\raggedright #1}}}

\begin{document}
\thispagestyle{empty}

\begin{center}
\textbf{\large FORMULARIO PARA CASOS GENERALES   F-805}
\end{center}

\sectionbar{Datos del Siniestro}

\begin{tabularx}{\textwidth}{Xr@{\hspace{4mm}}X}
  & \fieldlabel{Fecha de solicitud} & __FECHA_SOLICITUD__ \\
  & \fieldlabel{Fecha del siniestro} & __FECHA_SINIESTRO__ \\
  & \fieldlabel{Daños Personales} & __DANOS__ \\
\end{tabularx}

\vspace{4mm}

\noindent
\begin{tabularx}{\textwidth}{p{4cm}X}
  \fieldlabel{Asegurado} & \fieldbox{__ASEGURADO__} \\
  \fieldlabel{Solicitante} & \fieldbox{__SOLICITANTE__} \\
  \fieldlabel{Celular} & \fieldbox{__CELULAR__} \\
  \fieldlabel{Departamento} & \fieldbox{__DEPARTAMENTO__} \\
  \fieldlabel{Póliza} & \fieldbox{__POLIZA__} \\
  \fieldlabel{Dirección} & \fieldbox{__DIRECCION__} \\
  \fieldlabel{Descripción} & \fieldbox{__DESCRIPCION__} \\
\end{tabularx}

\sectionbar{Datos del Ejecutivo}

\noindent
\begin{tabularx}{\textwidth}{p{4cm}Xp{4cm}X}
  \fieldlabel{Nombre} & \fieldbox{__EJECUTIVO__} & \fieldlabel{Hubo tripartita} & \fieldbox{__TRI__} \\
  \fieldlabel{Celular} & \fieldbox{__EJ_CEL__} & \fieldlabel{Hora de contacto} & \fieldbox{__HORA__} \\
  \fieldlabel{Intentos de llamada} & \fieldbox{__INTENTOS__} \\
  \fieldlabel{Observaciones} & \multicolumn{3}{X}{\fieldbox{__OBS__}} \\
\end{tabularx}

\def\footertext{__FOOTER__}
\ifdefempty{\footertext}{}{\vfill\noindent\textcolor{gray}{\tiny \footertext}}

\end{document}`;

const TEMPLATE_GENERIC = String.raw`\documentclass[a4paper,12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[spanish]{babel}
\usepackage{geometry}
\usepackage{tabularx}
\usepackage{array}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{etoolbox}

\geometry{margin=2cm}

\definecolor{brand}{HTML}{2f7fd6}

\begin{document}
\thispagestyle{empty}

\noindent\textcolor{brand}{\textbf{DOKKA Desk}}\\[2pt]
{\huge\textbf{__TITLE__}}\\[2pt]
\def\subtitletext{__SUBTITLE__}
\ifdefempty{\subtitletext}{}{\textcolor{gray}{\subtitletext}\\[4pt]}
\noindent\hfill\textbf{Reporte N°}\\[-2pt]
\hfill{\huge\textcolor{brand}{\textbf{__NRO__}}}

\vspace{4mm}
\hrule
\vspace{4mm}

__CONTENT__

\def\footertext{__FOOTER__}
\ifdefempty{\footertext}{}{\vfill\noindent\textcolor{gray}{\tiny \footertext}}

\end{document}`;

function getTemplate(variant: string): string {
  if (variant === "ap") return TEMPLATE_AP;
  if (variant === "cg") return TEMPLATE_CG;
  return TEMPLATE_GENERIC;
}

export const compileReportPDF = createServerFn({ method: "POST" })
  .inputValidator((input) => ReportInput.parse(input))
  .handler(async ({ data }) => {
    const { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } = await import("node:fs");
    const { execSync } = await import("node:child_process");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");

    const { variant, fields } = data;
    let template = getTemplate(variant);
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
