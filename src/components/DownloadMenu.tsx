import { useState } from "react";
import { FileDown, FileText, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { rangeToday, rangeYesterday, rangeCustom, type DateRange } from "@/lib/report-exports";

interface Props {
  /** Called with selected range when user clicks PDF */
  onPDF: (range: DateRange) => void;
  /** Called with selected range when user clicks Excel */
  onExcel: (range: DateRange) => void;
  /** Hide entirely (e.g., when user lacks the permission) */
  hidden?: boolean;
}

const today = () => new Date().toISOString().slice(0, 10);

export function DownloadMenu({ onPDF, onExcel, hidden }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"today" | "yesterday" | "custom">("today");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());

  if (hidden) return null;

  const resolve = (): DateRange => {
    if (mode === "today") return rangeToday();
    if (mode === "yesterday") return rangeYesterday();
    return rangeCustom(from, to);
  };

  const doPDF = () => {
    onPDF(resolve());
    setOpen(false);
  };
  const doXLS = () => {
    onExcel(resolve());
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border bg-card text-sm font-medium hover:bg-muted transition-colors shadow-sm">
          <FileDown className="h-4 w-4 text-[var(--brand-blue)]" />
          Descargar
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Rango de fechas
        </div>
        <div className="space-y-1.5 mb-3">
          {[
            { v: "today", label: "Día en curso" },
            { v: "yesterday", label: "Día anterior" },
            { v: "custom", label: "Rango personalizado" },
          ].map((o) => (
            <label key={o.v} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="dr-mode"
                checked={mode === o.v}
                onChange={() => setMode(o.v as any)}
                className="accent-[var(--brand-blue)]"
              />
              {o.label}
            </label>
          ))}
        </div>
        {mode === "custom" && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Desde</div>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Hasta</div>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </div>
        )}
        <div className="flex gap-2 pt-2 border-t border-border">
          <button
            onClick={doXLS}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:opacity-90"
          >
            <FileDown className="h-3.5 w-3.5" /> Excel
          </button>
          <button
            onClick={doPDF}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-rose-600 text-white text-xs font-semibold hover:opacity-90"
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
