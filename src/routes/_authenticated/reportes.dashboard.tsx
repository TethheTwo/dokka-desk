import { createFileRoute, Link } from "@tanstack/react-router";
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
import { format, subDays, startOfDay, endOfDay, differenceInCalendarDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Ticket as TicketIcon,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Timer,
  CalendarIcon,
} from "lucide-react";
import type { DateRange } from "react-day-picker";
import { AppTopBar } from "@/components/AppTopBar";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { getTickets, subscribeTickets, type Ticket } from "@/lib/tickets-store";
import { exportTicketsPDF, exportTicketsXLSX } from "@/lib/report-exports";
import { DownloadMenu } from "@/components/DownloadMenu";
import { useAuth } from "@/lib/auth";
import { useCurrentUser } from "@/lib/user-store";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/reportes/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard de reportes — DOKKA Desk" },
      { name: "description", content: "Indicadores y gráficos de tickets." },
    ],
  }),
  component: DashboardReportes,
});

function defaultRange(): DateRange {
  const to = new Date();
  return { from: subDays(to, 29), to };
}

function DashboardReportes() {
  const { roles, loading } = useAuth();
  const canSee = roles.includes("administrador") || roles.includes("supervisor");
  const { can } = usePermissions();
  const canDownload = can("download_records");
  const currentUser = useCurrentUser();

  const [tickets, setTickets] = useState<Ticket[]>(() => getTickets());
  useEffect(() => subscribeTickets(() => setTickets(getTickets())), []);

  // Default = últimos 30 días en cada carga (no persistente).
  const [range, setRange] = useState<DateRange>(() => defaultRange());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(range);

  const from = range.from ?? subDays(new Date(), 29);
  const to = range.to ?? new Date();
  const days = Math.max(1, differenceInCalendarDays(to, from) + 1);

  const filtered = useMemo(() => {
    const start = startOfDay(from).getTime();
    const end = endOfDay(to).getTime();
    return tickets.filter((t) => {
      const ts = new Date(t.fechaCreacion).getTime();
      return ts >= start && ts <= end;
    });
  }, [tickets, from, to]);

  const TMA_MIN = 30;
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
    for (let i = 0; i < days; i++) {
      const d = format(addDays(startOfDay(from), i), "dd/MM");
      buckets.set(d, 0);
    }
    filtered.forEach((t) => {
      const key = format(startOfDay(new Date(t.fechaCreacion)), "dd/MM");
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets, ([fecha, count]) => ({ fecha, count }));
  }, [filtered, from, days]);

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

  if (!loading && !canSee) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
        <AppTopBar />
        <main className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="text-xl font-semibold mb-2">Sin permisos</h1>
          <p className="text-muted-foreground">
            Solo administradores y supervisores pueden ver el dashboard de reportes.
          </p>
          <Link to="/" className="text-[var(--brand-blue)] hover:underline mt-4 inline-block">
            Volver al inicio
          </Link>
        </main>
      </div>
    );
  }

  const rangeLabel = `${format(from, "dd MMM yyyy", { locale: es })} – ${format(to, "dd MMM yyyy", { locale: es })}`;

  const applyPreset = (n: number) => {
    const t = new Date();
    setDraftRange({ from: subDays(t, n - 1), to: t });
  };

  const confirmRange = () => {
    if (draftRange?.from && draftRange?.to) {
      setRange({ from: draftRange.from, to: draftRange.to });
      setPickerOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-foreground">
      <AppTopBar />
      <PageHeader
        title="Dashboard de reportes"
        subtitle="Indicadores clave y tendencias de tickets."
        actions={
          <>
            <button
              onClick={() => {
                setDraftRange(range);
                setPickerOpen(true);
              }}
              className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-card text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Rango:</span>
              <span>{rangeLabel}</span>
              <span className="text-muted-foreground">({days}d)</span>
            </button>
            <DownloadMenu
              hidden={!canDownload}
              onPDF={(r) => exportTicketsPDF(filtered, r, currentUser.name || "Usuario")}
              onExcel={(r) => exportTicketsXLSX(filtered, r, currentUser.name || "Usuario")}
            />
          </>
        }
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

        <ChartCard title={`Tendencia diaria (${days} días)`} subtitle={rangeLabel}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={tendencia} margin={{ top: 8, right: 12, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="fecha"
                interval={Math.max(0, Math.floor(tendencia.length / 12))}
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

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-[760px] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-slate-200/80">
            <DialogTitle className="text-base font-semibold text-slate-900">
              Seleccionar rango de fechas
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-1">
              Haz clic en la fecha de inicio y luego en la de fin. Usa las flechas para navegar
              entre meses.
            </p>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 px-6 pt-4">
            {[
              { label: "Hoy", n: 1 },
              { label: "7 días", n: 7 },
              { label: "30 días", n: 30 },
              { label: "90 días", n: 90 },
              { label: "1 año", n: 365 },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.n)}
                className="h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="px-4 py-4 flex justify-center">
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={setDraftRange}
              numberOfMonths={2}
              defaultMonth={draftRange?.from ?? subDays(new Date(), 30)}
              captionLayout="dropdown"
              locale={es}
              showOutsideDays
              className={cn(
                "p-2 pointer-events-auto",
                "[&_[data-range-middle=true]]:!bg-slate-200 [&_[data-range-middle=true]]:!text-slate-900",
                "[&_[data-range-start=true]]:!bg-slate-700 [&_[data-range-start=true]]:!text-white",
                "[&_[data-range-end=true]]:!bg-slate-700 [&_[data-range-end=true]]:!text-white",
              )}
            />
          </div>

          <DialogFooter className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/50 gap-2 sm:gap-2">
            <div className="mr-auto text-xs text-slate-600 self-center">
              {draftRange?.from && draftRange?.to ? (
                <>
                  <span className="font-medium text-slate-900">
                    {format(draftRange.from, "dd MMM yyyy", { locale: es })}
                  </span>
                  {" – "}
                  <span className="font-medium text-slate-900">
                    {format(draftRange.to, "dd MMM yyyy", { locale: es })}
                  </span>
                </>
              ) : draftRange?.from ? (
                <>Selecciona la fecha de fin…</>
              ) : (
                <>Selecciona la fecha de inicio…</>
              )}
            </div>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmRange}
              disabled={!draftRange?.from || !draftRange?.to}
              className="bg-[#2f7fd6] hover:bg-[#2868b3] text-white"
            >
              Aplicar rango
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
