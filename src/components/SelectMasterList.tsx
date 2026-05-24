import { ChevronDown } from "lucide-react";
import { useMasterList, type ListKey } from "@/lib/master-lists";

export function SelectMasterList({
  listKey,
  value,
  onChange,
  placeholder = "Seleccione una opción",
}: {
  listKey: ListKey;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const items = useMasterList(listKey);
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="form-input appearance-none pr-10 text-muted-foreground"
      >
        <option value="">{placeholder}</option>
        {items.map((it) => (
          <option key={it.id} value={it.label}>
            {it.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}
