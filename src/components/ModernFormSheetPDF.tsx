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
  text: "#374151",
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.value,
  },
  accent: {
    borderTop: "1.5 solid " + C.brand,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  formCode: {
    fontSize: 9,
    color: C.label,
    fontWeight: 500,
    letterSpacing: 0.5,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: 700,
    marginTop: 1,
  },
  rightMeta: {
    textAlign: "right" as const,
    fontSize: 9,
    color: C.label,
    lineHeight: 1.6,
  },
  metaValue: {
    fontWeight: 600,
    color: C.value,
  },
  headerDate: {
    fontSize: 9,
    color: C.label,
    marginBottom: 14,
  },
  divider: {
    borderTop: "1 solid #d1d5db",
    marginBottom: 12,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: C.label,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 8,
    marginTop: 0,
  },
  fieldRow: {
    width: "50%" as const,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 9,
    color: C.label,
    fontWeight: 500,
  },
  fieldValue: {
    fontSize: 12,
    color: C.value,
    fontWeight: 500,
    marginTop: 1,
  },
  fieldWide: {
    width: "100%" as const,
    marginBottom: 8,
  },
  gridRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 24,
  },
  descSection: {
    marginBottom: 10,
  },
  descTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: C.label,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  descText: {
    fontSize: 11,
    color: C.text,
    lineHeight: 1.5,
  },
  obsText: {
    fontSize: 11,
    color: C.text,
    lineHeight: 1.5,
    marginTop: 1,
  },
});

function FieldPDF({
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
    <View style={last ? { width: "50%", marginBottom: 0 } : styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{v}</Text>
    </View>
  );
}

export function ModernFormSheetPDF({ variant, data }: Props) {
  const code = variant === "ap" ? "F-775" : "F-805";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accent} />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.formCode}>{code}</Text>
            <Text style={styles.formTitle}>
              {variant === "ap"
                ? "Accidentes Personales Patrimoniales"
                : "Casos Generales"}
            </Text>
          </View>
          <View style={styles.rightMeta}>
            <Text>
              Registro: <Text style={styles.metaValue}>{data.nro ?? "—"}</Text>
            </Text>
            <Text>
              Colaborador:{" "}
              <Text style={styles.metaValue}>{data.colaborador || "—"}</Text>
            </Text>
          </View>
        </View>

        <Text style={styles.headerDate}>
          Fecha de solicitud:{" "}
          <Text style={{ fontWeight: 500, color: C.value }}>
            {fmtDate(data.fecha_solicitud)}
          </Text>
        </Text>

        <View style={styles.divider} />

        <View style={styles.gridRow}>
          <FieldPDF
            label="Fecha de solicitud"
            value={fmtDate(data.fecha_solicitud)}
          />
          <FieldPDF
            label="Fecha del siniestro"
            value={fmtDate(data.fecha_siniestro)}
          />
          {variant === "ap" ? (
            <>
              <FieldPDF
                label="Nombre del accidentado"
                value={data.nombre_accidentado}
              />
              <FieldPDF
                label="Carnet del accidentado"
                value={data.carnet_accidentado}
              />
            </>
          ) : (
            <>
              <FieldPDF label="Asegurado" value={data.asegurado} />
              {data.danos_personales && (
                <FieldPDF label="Daños personales" value={data.danos_personales} />
              )}
            </>
          )}
          <FieldPDF label="Solicitante" value={data.solicitante} />
          <FieldPDF label="Celular" value={data.celular} />
          <FieldPDF label="Departamento" value={data.departamento} />
          <FieldPDF label="Poliza" value={data.poliza} />
        </View>
        <View style={[styles.fieldWide, { marginBottom: 0 }]}>
          <Text style={styles.fieldLabel}>Direccion</Text>
          <Text style={styles.fieldValue}>{data.direccion || "—"}</Text>
        </View>

        {data.descripcion && (
          <>
            <View style={[styles.divider, { marginTop: 12 }]} />
            <View style={styles.descSection}>
              <Text style={styles.descTitle}>
                Descripcion del Incidente
              </Text>
              <Text style={styles.descText}>{data.descripcion}</Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Datos del Ejecutivo</Text>

        <View style={styles.gridRow}>
          <FieldPDF label="Nombre" value={data.ejecutivo_nombre} />
          <FieldPDF label="Celular" value={data.ejecutivo_celular} />
          <FieldPDF label="Intentos de llamada" value={data.intentos_llamada} />
          <FieldPDF label="Hubo tripartita" value={data.hubo_tripartita} />
          <FieldPDF label="Hora de contacto" value={data.hora_contacto} />
        </View>

        {data.observaciones && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.fieldLabel}>Observaciones</Text>
            <Text style={styles.obsText}>{data.observaciones}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
