import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { Ticket as TicketIcon, ShieldCheck, ShieldAlert, TrendingUp, Timer } from "lucide-react";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useCurrentUser } from "@/lib/user-store";
import { getTickets, subscribeTickets, type Ticket } from "@/lib/tickets-store";

export const Route = createFileRoute("/_authenticated/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Inicio — DOKKA Desk" },
      { name: "description", content: "Panel principal de gestión de tickets y asistencias." },
    ],
  }),
  component: HomePage,
});

const DAYS = 7;
const TMA_MIN = 30;

function HomePage() {
  const user = useCurrentUser();
  const [tickets, setTickets] = useState<Ticket[]>(() => getTickets());
  useEffect(() => subscribeTickets(() => setTickets(getTickets())), []);

  const filtered = useMemo(() => {
    const cutoff = subDays(new Date(), DAYS).getTime();
    return tickets.filter((t) => new Date(t.fechaCreacion).getTime() >= cutoff);
  }, [tickets]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    let dentro = 0;
    let fuera = 0;
    let sumMins = 0;
    let countMins = 0;
    for (const t of filtered) {
      if (t.estado !== "Cerrado") continue;
      const cierreNote = [...t.notes].reverse().find((n) => n.estado === "Cerrado");
      const cierreISO = cierreNote?.fecha ?? t.notes[t.notes.length - 1]?.fecha;
      if (!cierreISO) continue;
      const mins = (new Date(cierreISO).getTime() - new Date(t.fechaCreacion).getTime()) / 60000;
      if (mins <= TMA_MIN) dentro++;
      else fuera++;
      sumMins += mins;
      countMins++;
    }
    const cerrados = dentro + fuera;
    const cumplimiento = cerrados > 0 ? Math.round((dentro / cerrados) * 100) : 0;
    const promedio = countMins > 0 ? Math.round(sumMins / countMins) : 0;
    return { total, dentro, fuera, cumplimiento, promedio };
  }, [filtered]);

  const porTipo = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((t) => m.set(t.tipo, (m.get(t.tipo) ?? 0) + 1));
    return Array.from(m, ([name, value]) => ({ name: name.replace("Asistencia ", ""), value }));
  }, [filtered]);

  const tendencia = useMemo(() => {
    const buckets = new Map<string, number>();
    for (let i = DAYS - 1; i >= 0; i--) {
      buckets.set(format(subDays(new Date(), i), "dd/MM/yy"), 0);
    }
    filtered.forEach((t) => {
      const key = format(startOfDay(new Date(t.fechaCreacion)), "dd/MM/yy");
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets, ([fecha, count]) => ({ fecha, count }));
  }, [filtered]);

  const porUsuario = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((t) => {
      if (t.estado !== "Cerrado") return;
      const key = (t.cerradoPor || "").trim();
      if (!key || key === "-") return;
      m.set(key, (m.get(key) ?? 0) + 1);
    });
    return Array.from(m, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <PageHeader
        title="Inicio"
        subtitle={`¡Bienvenido${user.name ? `, ${user.name}` : ""}! Resumen de la última semana.`}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total tickets" value={kpis.total} icon={TicketIcon} tone="blue" />
          <StatCard
            label={`Dentro TMA (≤${TMA_MIN}m)`}
            value={kpis.dentro}
            icon={ShieldCheck}
            tone="green"
          />
          <StatCard
            label={`Fuera TMA (>${TMA_MIN}m)`}
            value={kpis.fuera}
            icon={ShieldAlert}
            tone="red"
          />
          <StatCard
            label="Cumplimiento TMA"
            value={`${kpis.cumplimiento}%`}
            icon={TrendingUp}
            tone="teal"
          />
          <StatCard
            label="Tiempo promedio"
            value={`${kpis.promedio}m`}
            icon={Timer}
            tone="violet"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Tickets por tipo">
            <ResponsiveContainer width="100%" height={Math.max(280, porTipo.length * 38)}>
              <BarChart
                data={porTipo}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 11, fill: "#475569" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                />
                <Bar dataKey="value" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tickets cerrados por usuario (Top 10)">
            <ResponsiveContainer width="100%" height={Math.max(280, porUsuario.length * 38)}>
              <BarChart
                data={porUsuario}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 11, fill: "#475569" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  formatter={(v: number) => [`${v} cerrados`, "Tickets"]}
                />
                <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard
          title={`Tendencia diaria (últimos ${DAYS} días)`}
          subtitle={`${tendencia.length} días`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={tendencia} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#2f7fd6"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#2f7fd6" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </main>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-5">
      <header className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
      </header>
      <div className="overflow-auto">{children}</div>
    </section>
  );
}
