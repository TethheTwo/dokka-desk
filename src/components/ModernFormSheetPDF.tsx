import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { FormReportData } from "./ModernFormSheet";

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

const C = {
  brand: "#1d84f5",
  label: "#6b7280",
  value: "#111827",
  muted: "#9ca3af",
  border: "#e6e8eb",
  descText: "#374151",
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.value,
  },
  accentBar: {
    borderTop: "3 solid " + C.brand,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  brandName: {
    fontSize: 9,
    fontWeight: 600,
    color: C.muted,
    letterSpacing: 1.5,
  },
  formCode: {
    fontSize: 10,
    fontWeight: 700,
    color: C.brand,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 1,
  },
  metaRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 10,
    fontSize: 9,
    color: C.label,
  },
  metaValue: {
    fontWeight: 700,
    color: C.value,
  },
  divider: {
    borderTop: "1 solid " + C.border,
    marginBottom: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: C.label,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 0,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 5,
    borderBottom: "1 solid " + C.border + "66",
  },
  rowLast: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 5,
    borderBottom: "none",
  },
  rowLabel: {
    width: 130,
    fontSize: 9,
    fontWeight: 500,
    color: C.label,
    letterSpacing: 0.5,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: 500,
    color: C.value,
    flexGrow: 1,
  },
  descBox: {
    borderRadius: 6,
    borderLeft: "4 solid " + C.brand,
    backgroundColor: "#f0f5ff",
    padding: 10,
    marginBottom: 8,
  },
  descTitle: {
    fontSize: 8,
    fontWeight: 700,
    color: C.brand,
    letterSpacing: 1,
    marginBottom: 4,
  },
  descText: {
    fontSize: 11,
    color: C.descText,
    lineHeight: 1.5,
  },
  obsRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 5,
  },
  obsLabel: {
    width: 130,
    fontSize: 9,
    fontWeight: 500,
    color: C.label,
    letterSpacing: 0.5,
  },
  obsText: {
    fontSize: 11,
    color: C.descText,
    lineHeight: 1.5,
    flexGrow: 1,
  },
});

function FormRowPDF({
  label,
  value,
  last,
}: {
  label: string;
  value: string | number | null | undefined;
  last?: boolean;
}) {
  const v = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <View style={last ? styles.rowLast : styles.row}>
      <Text style={styles.rowLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.rowValue}>{v}</Text>
    </View>
  );
}

export function ModernFormSheetPDF({ variant, data }: Props) {
  const code = variant === "ap" ? "F-775" : "F-805";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />

        <View style={styles.headerRow}>
          <Text style={styles.brandName}>DOKKA DESK</Text>
          <Text style={styles.formCode}>{code}</Text>
        </View>

        <Text style={styles.formTitle}>
          {variant === "ap"
            ? "Accidentes Personales Patrimoniales"
            : "Casos Generales"}
        </Text>

        <View style={styles.metaRow}>
          <Text>
            Registro:{" "}
            <Text style={styles.metaValue}>{data.nro ?? "—"}</Text>
          </Text>
          <Text>
            Colaborador:{" "}
            <Text style={styles.metaValue}>{data.colaborador || "—"}</Text>
          </Text>
          <Text>
            Fecha:{" "}
            <Text style={styles.metaValue}>{fmtDate(data.fecha_solicitud)}</Text>
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>DATOS DEL SINIESTRO</Text>

        <FormRowPDF label="Fecha de solicitud" value={fmtDate(data.fecha_solicitud)} />
        <FormRowPDF label="Fecha del siniestro" value={fmtDate(data.fecha_siniestro)} />
        {variant === "ap" ? (
          <>
            <FormRowPDF label="Nombre del accidentado" value={data.nombre_accidentado} />
            <FormRowPDF label="Carnet del accidentado" value={data.carnet_accidentado} />
          </>
        ) : (
          <>
            <FormRowPDF label="Asegurado" value={data.asegurado} />
            {data.danos_personales && (
              <FormRowPDF label="Daños personales" value={data.danos_personales} />
            )}
          </>
        )}
        <FormRowPDF label="Solicitante" value={data.solicitante} />
        <FormRowPDF label="Celular" value={data.celular} />
        <FormRowPDF label="Departamento" value={data.departamento} />
        <FormRowPDF label="Poliza" value={data.poliza} />
        <FormRowPDF label="Direccion" value={data.direccion} last />

        {data.descripcion && (
          <>
            <View style={styles.divider} />
            <View style={styles.descBox}>
              <Text style={styles.descTitle}>DESCRIPCION DEL INCIDENTE</Text>
              <Text style={styles.descText}>{data.descripcion}</Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>DATOS DEL EJECUTIVO</Text>

        <FormRowPDF label="Nombre" value={data.ejecutivo_nombre} />
        <FormRowPDF label="Celular" value={data.ejecutivo_celular} />
        <FormRowPDF label="Intentos de llamada" value={data.intentos_llamada} />
        <FormRowPDF label="Hubo tripartita" value={data.hubo_tripartita} />
        <FormRowPDF label="Hora de contacto" value={data.hora_contacto} last />
        {data.observaciones && (
          <View style={styles.obsRow}>
            <Text style={styles.obsLabel}>OBSERVACIONES</Text>
            <Text style={styles.obsText}>{data.observaciones}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
