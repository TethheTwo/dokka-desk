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
  border: "#e6e8eb",
  label: "#6b7280",
  value: "#111827",
  brand: "#1d84f5",
  muted: "#9ca3af",
  cardBg: "#f8faff",
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.value,
  },
  card: {
    border: "1 solid " + C.border,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardHeader: {
    padding: "8 14",
    borderBottom: "1 solid " + C.border,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: C.value,
    letterSpacing: 1,
  },
  cardBody: {
    padding: "10 14",
  },
  row: {
    marginBottom: 9,
    paddingBottom: 9,
    borderBottom: "1 solid #f3f4f6",
  },
  rowLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottom: "none",
  },
  rowLabel: {
    fontSize: 9,
    fontWeight: 500,
    color: C.label,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: 600,
    color: C.value,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
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
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 6,
  },
  metaText: {
    fontSize: 10,
    color: C.label,
  },
  metaValue: {
    fontWeight: 700,
    color: C.value,
  },
  highlightCard: {
    border: "1 solid " + C.border,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: C.cardBg,
  },
  descText: {
    fontSize: 11,
    color: "#374151",
    lineHeight: 1.5,
  },
  obsLabel: {
    fontSize: 9,
    fontWeight: 500,
    color: C.label,
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  obsText: {
    fontSize: 11,
    color: "#374151",
    lineHeight: 1.5,
  },
});

function InfoRowPDF({
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
    <View style={last ? [styles.row, styles.rowLast] : styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{v}</Text>
    </View>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title.toUpperCase()}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

export function ModernFormSheetPDF({ variant, data }: Props) {
  const code = variant === "ap" ? "F-775" : "F-805";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          <View style={{ padding: 12 }}>
            <View style={styles.headerTop}>
              <Text style={styles.brandName}>DOKKA DESK</Text>
              <Text style={styles.formCode}>{code}</Text>
            </View>
            <Text style={styles.formTitle}>
              {variant === "ap"
                ? "Accidentes Personales Patrimoniales"
                : "Casos Generales"}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                Registro: <Text style={styles.metaValue}>{data.nro ?? "—"}</Text>
              </Text>
              <Text style={styles.metaText}>
                Colaborador:{" "}
                <Text style={styles.metaValue}>{data.colaborador || "—"}</Text>
              </Text>
              <Text style={styles.metaText}>
                Fecha:{" "}
                <Text style={styles.metaValue}>{fmtDate(data.fecha_solicitud)}</Text>
              </Text>
            </View>
          </View>
        </View>

        <Card title="Datos del Siniestro">
          <InfoRowPDF
            label="Fecha de solicitud"
            value={fmtDate(data.fecha_solicitud)}
          />
          <InfoRowPDF
            label="Fecha del siniestro"
            value={fmtDate(data.fecha_siniestro)}
          />
          {variant === "ap" ? (
            <>
              <InfoRowPDF
                label="Nombre del accidentado"
                value={data.nombre_accidentado}
              />
              <InfoRowPDF
                label="Carnet del accidentado"
                value={data.carnet_accidentado}
              />
            </>
          ) : (
            <>
              <InfoRowPDF label="Asegurado" value={data.asegurado} />
              {data.danos_personales && (
                <InfoRowPDF label="Daños personales" value={data.danos_personales} />
              )}
            </>
          )}
          <InfoRowPDF label="Solicitante" value={data.solicitante} />
          <InfoRowPDF label="Celular" value={data.celular} />
          <InfoRowPDF label="Departamento" value={data.departamento} />
          <InfoRowPDF label="Poliza" value={data.poliza} />
          <InfoRowPDF label="Direccion" value={data.direccion} last />
        </Card>

        {data.descripcion && (
          <View style={styles.highlightCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>DESCRIPCION DEL INCIDENTE</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.descText}>{data.descripcion}</Text>
            </View>
          </View>
        )}

        <Card title="Datos del Ejecutivo">
          <InfoRowPDF label="Nombre" value={data.ejecutivo_nombre} />
          <InfoRowPDF label="Celular" value={data.ejecutivo_celular} />
          <InfoRowPDF label="Intentos de llamada" value={data.intentos_llamada} />
          <InfoRowPDF label="Hubo tripartita" value={data.hubo_tripartita} />
          <InfoRowPDF label="Hora de contacto" value={data.hora_contacto} />
          {data.observaciones ? (
            <View style={styles.row}>
              <Text style={styles.obsLabel}>OBSERVACIONES</Text>
              <Text style={styles.obsText}>{data.observaciones}</Text>
            </View>
          ) : null}
        </Card>
      </Page>
    </Document>
  );
}
