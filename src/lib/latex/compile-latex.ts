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
\usepackage[spanish,es-tabla]{babel}
\usepackage{geometry}
\usepackage{tabularx}
\usepackage{array}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{etoolbox}
\usepackage{fontspec}

\setmainfont{Liberation Sans}[
  Extension=.ttf,
  BoldFont=LiberationSans-Bold,
  ItalicFont=LiberationSans-Italic,
  BoldItalicFont=LiberationSans-BoldItalic,
]

\geometry{margin=2cm, bottom=2.5cm}

\setlength{\parindent}{0pt}
\setlength{\tabcolsep}{6pt}
\renewcommand{\arraystretch}{1.3}

\definecolor{brand}{HTML}{2f7fd6}
\definecolor{bar}{HTML}{5a8fc4}

\newcommand{\sectionbar}[1]{%
  \noindent\colorbox{bar}{\parbox{\dimexpr\linewidth-2\fboxsep\relax}{\textcolor{white}{\textbf{#1}}}}\\[6pt]
}

\newcommand{\fieldlabel}[1]{\textcolor{brand}{\textbf{#1}}}
\newcommand{\fieldbox}[1]{\fbox{\parbox{\dimexpr\linewidth-2\fboxsep-2\fboxrule\relax}{\raggedright\strut #1\strut}}}

\begin{document}
\thispagestyle{empty}

\begin{center}
\textbf{\large FORMULARIO PARA ACCIDENTES PERSONALES PATRIMONIALES   F-775}
\end{center}

\vspace{4mm}

\sectionbar{Datos del Siniestro}

\begin{tabularx}{\textwidth}{Xr@{\hspace{6mm}}X}
  & \fieldlabel{Fecha de solicitud} & __FECHA_SOLICITUD__ \\
  & \fieldlabel{Fecha del siniestro} & __FECHA_SINIESTRO__ \\
\end{tabularx}

\vspace{6mm}

\noindent
\begin{tabularx}{\textwidth}{p{4.5cm}X}
  \fieldlabel{Nombre del Accidentado} & \fieldbox{__ACCIDENTADO__} \\[2pt]
  \fieldlabel{Carnet del Accidentado} & \fieldbox{__CARNET__} \\[2pt]
  \fieldlabel{Solicitante} & \fieldbox{__SOLICITANTE__} \\[2pt]
  \fieldlabel{Celular} & \fieldbox{__CELULAR__} \\[2pt]
  \fieldlabel{Departamento} & \fieldbox{__DEPARTAMENTO__} \\[2pt]
  \fieldlabel{Póliza} & \fieldbox{__POLIZA__} \\[2pt]
  \fieldlabel{Dirección} & \fieldbox{__DIRECCION__} \\[2pt]
  \fieldlabel{Descripción} & \fieldbox{__DESCRIPCION__} \\[2pt]
\end{tabularx}

\sectionbar{Datos del Ejecutivo}

\noindent
\begin{tabularx}{\textwidth}{p{4.5cm}Xp{4cm}X}
  \fieldlabel{Nombre} & \fieldbox{__EJECUTIVO__} & \fieldlabel{Hubo tripartita} & \fieldbox{__TRI__} \\[2pt]
  \fieldlabel{Celular} & \fieldbox{__EJ_CEL__} & \fieldlabel{Hora de contacto} & \fieldbox{__HORA__} \\[2pt]
  \fieldlabel{Intentos de llamada} & \fieldbox{__INTENTOS__} \\[2pt]
  \fieldlabel{Observaciones} & \multicolumn{3}{X}{\fieldbox{__OBS__}} \\[2pt]
\end{tabularx}

\def\footertext{__FOOTER__}
\ifdefempty{\footertext}{}{\vfill\noindent\textcolor{gray}{\tiny \footertext}}

\end{document}`;

const TEMPLATE_CG = String.raw`\documentclass[a4paper,12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[spanish,es-tabla]{babel}
\usepackage{geometry}
\usepackage{tabularx}
\usepackage{array}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{etoolbox}
\usepackage{fontspec}

\setmainfont{Liberation Sans}[
  Extension=.ttf,
  BoldFont=LiberationSans-Bold,
  ItalicFont=LiberationSans-Italic,
  BoldItalicFont=LiberationSans-BoldItalic,
]

\geometry{margin=2cm, bottom=2.5cm}

\setlength{\parindent}{0pt}
\setlength{\tabcolsep}{6pt}
\renewcommand{\arraystretch}{1.3}

\definecolor{brand}{HTML}{2f7fd6}
\definecolor{bar}{HTML}{5a8fc4}

\newcommand{\sectionbar}[1]{%
  \noindent\colorbox{bar}{\parbox{\dimexpr\linewidth-2\fboxsep\relax}{\textcolor{white}{\textbf{#1}}}}\\[6pt]
}

\newcommand{\fieldlabel}[1]{\textcolor{brand}{\textbf{#1}}}
\newcommand{\fieldbox}[1]{\fbox{\parbox{\dimexpr\linewidth-2\fboxsep-2\fboxrule\relax}{\raggedright\strut #1\strut}}}

\begin{document}
\thispagestyle{empty}

\begin{center}
\textbf{\large FORMULARIO PARA CASOS GENERALES   F-805}
\end{center}

\vspace{4mm}

\sectionbar{Datos del Siniestro}

\begin{tabularx}{\textwidth}{Xr@{\hspace{6mm}}X}
  & \fieldlabel{Fecha de solicitud} & __FECHA_SOLICITUD__ \\
  & \fieldlabel{Fecha del siniestro} & __FECHA_SINIESTRO__ \\
  & \fieldlabel{Daños Personales} & __DANOS__ \\
\end{tabularx}

\vspace{6mm}

\noindent
\begin{tabularx}{\textwidth}{p{4.5cm}X}
  \fieldlabel{Asegurado} & \fieldbox{__ASEGURADO__} \\[2pt]
  \fieldlabel{Solicitante} & \fieldbox{__SOLICITANTE__} \\[2pt]
  \fieldlabel{Celular} & \fieldbox{__CELULAR__} \\[2pt]
  \fieldlabel{Departamento} & \fieldbox{__DEPARTAMENTO__} \\[2pt]
  \fieldlabel{Póliza} & \fieldbox{__POLIZA__} \\[2pt]
  \fieldlabel{Dirección} & \fieldbox{__DIRECCION__} \\[2pt]
  \fieldlabel{Descripción} & \fieldbox{__DESCRIPCION__} \\[2pt]
\end{tabularx}

\sectionbar{Datos del Ejecutivo}

\noindent
\begin{tabularx}{\textwidth}{p{4.5cm}Xp{4cm}X}
  \fieldlabel{Nombre} & \fieldbox{__EJECUTIVO__} & \fieldlabel{Hubo tripartita} & \fieldbox{__TRI__} \\[2pt]
  \fieldlabel{Celular} & \fieldbox{__EJ_CEL__} & \fieldlabel{Hora de contacto} & \fieldbox{__HORA__} \\[2pt]
  \fieldlabel{Intentos de llamada} & \fieldbox{__INTENTOS__} \\[2pt]
  \fieldlabel{Observaciones} & \multicolumn{3}{X}{\fieldbox{__OBS__}} \\[2pt]
\end{tabularx}

\def\footertext{__FOOTER__}
\ifdefempty{\footertext}{}{\vfill\noindent\textcolor{gray}{\tiny \footertext}}

\end{document}`;

const TEMPLATE_GENERIC = String.raw`\documentclass[a4paper,12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage[spanish,es-tabla]{babel}
\usepackage{geometry}
\usepackage{tabularx}
\usepackage{array}
\usepackage{xcolor}
\usepackage{hyperref}
\usepackage{etoolbox}
\usepackage{fontspec}

\setmainfont{Liberation Sans}[
  Extension=.ttf,
  BoldFont=LiberationSans-Bold,
  ItalicFont=LiberationSans-Italic,
  BoldItalicFont=LiberationSans-BoldItalic,
]

\geometry{margin=2cm, bottom=2.5cm}

\setlength{\parindent}{0pt}
\setlength{\tabcolsep}{6pt}
\renewcommand{\arraystretch}{1.3}

\definecolor{brand}{HTML}{2f7fd6}

\newcommand{\sectionbar}[1]{%
  \noindent\colorbox{brand}{\parbox{\dimexpr\linewidth-2\fboxsep\relax}{\textcolor{white}{\textbf{#1}}}}\\[6pt]
}

\begin{document}
\thispagestyle{empty}

\noindent\textcolor{brand}{\textbf{DOKKA Desk}}\\[2pt]
{\huge\textbf{__TITLE__}}\\[2pt]
\def\subtitletext{__SUBTITLE__}
\ifdefempty{\subtitletext}{}{\textcolor{gray}{\subtitletext}\\[4pt]}
\noindent\hfill\textbf{Reporte N°}\\[-2pt]
\hfill{\huge\textcolor{brand}{\textbf{__NRO__}}}

\vspace{6mm}
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

async function compilePDF(data: { variant: string; nro: string | number; fields: Record<string, string | null | undefined> }): Promise<{ pdf: string }> {
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

    execSync("xelatex -interaction=nonstopmode -halt-on-error report.tex", {
      cwd: dir, stdio: "pipe", timeout: 30000,
    });

    try {
      execSync("xelatex -interaction=nonstopmode -halt-on-error report.tex", {
        cwd: dir, stdio: "pipe", timeout: 30000,
      });
    } catch {}

    const pdfPath = join(dir, "report.pdf");
    if (!existsSync(pdfPath)) throw new Error("PDF not generated");

    const pdfBuffer = readFileSync(pdfPath);
    return { pdf: pdfBuffer.toString("base64") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function compilePNG(pdfData: { pdf: string }): Promise<{ png: string }> {
  const { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } = await import("node:fs");
  const { execSync } = await import("node:child_process");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");

  const dir = mkdtempSync(join(tmpdir(), "latex-"));
  try {
    const pdfPath = join(dir, "report.pdf");
    writeFileSync(pdfPath, Buffer.from(pdfData.pdf, "base64"));

    execSync("pdftoppm -png -r 150 report.pdf report", {
      cwd: dir, stdio: "pipe", timeout: 30000,
    });

    const pngPath = join(dir, "report-1.png");
    if (!existsSync(pngPath)) throw new Error("PNG not generated");

    const pngBuffer = readFileSync(pngPath);
    return { png: pngBuffer.toString("base64") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const compileReportPDF = createServerFn({ method: "POST" })
  .inputValidator((input) => ReportInput.parse(input))
  .handler(async ({ data }) => {
    try {
      return await compilePDF(data);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200));
    }
  });

export const compileReportPNG = createServerFn({ method: "POST" })
  .inputValidator((input) => ReportInput.parse(input))
  .handler(async ({ data }) => {
    try {
      const pdf = await compilePDF(data);
      return await compilePNG(pdf);
    } catch (e) {
      throw new Error(e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200));
    }
  });
