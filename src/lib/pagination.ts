export type PaginationItem =
  | { type: "page"; page: number }
  | { type: "ellipsis" }
  | { type: "prev"; disabled: boolean }
  | { type: "next"; disabled: boolean };

export function getPaginationItems(current: number, total: number): PaginationItem[] {
  const items: PaginationItem[] = [];

  items.push({ type: "prev", disabled: current <= 1 });

  const show = new Set<number>();

  for (let p = 1; p <= 3 && p <= total; p++) show.add(p);
  for (let p = Math.max(1, current - 5); p <= Math.min(total, current + 5); p++) show.add(p);
  for (let p = Math.max(1, total - 2); p <= total; p++) show.add(p);

  const sorted = [...show].sort((a, b) => a - b);

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] !== sorted[i - 1] + 1) {
      items.push({ type: "ellipsis" });
    }
    items.push({ type: "page", page: sorted[i] });
  }

  items.push({ type: "next", disabled: current >= total });

  return items;
}
