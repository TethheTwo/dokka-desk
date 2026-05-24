import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ListKey =
  | "ejecutivos"
  | "correos"
  | "asist_mascotas"
  | "asist_bici"
  | "asist_automotor"
  | "asist_hogar";

export interface ListItem {
  id: string;
  list_key: ListKey;
  label: string;
  value: Record<string, unknown>;
  sort_order: number;
}

const cache = new Map<ListKey, ListItem[]>();
const listeners = new Map<ListKey, Set<() => void>>();
let subscribed = false;

async function load(key: ListKey) {
  const { data } = await supabase
    .from("master_lists")
    .select("*")
    .eq("list_key", key)
    .order("sort_order", { ascending: true });
  cache.set(key, (data ?? []) as unknown as ListItem[]);
  listeners.get(key)?.forEach((fn) => fn());
}

function ensureSub() {
  if (subscribed || typeof window === "undefined") return;
  subscribed = true;
  supabase
    .channel("master-lists-rt")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "master_lists" },
      (payload: any) => {
        const k = (payload?.new?.list_key ?? payload?.old?.list_key) as ListKey | undefined;
        if (k) void load(k);
      },
    )
    .subscribe();
}

export function useMasterList(key: ListKey): ListItem[] {
  const [, set] = useState(0);
  useEffect(() => {
    ensureSub();
    if (!cache.has(key)) void load(key);
    const s = listeners.get(key) ?? new Set();
    const fn = () => set((n) => n + 1);
    s.add(fn);
    listeners.set(key, s);
    return () => {
      s.delete(fn);
    };
  }, [key]);
  return cache.get(key) ?? [];
}

export async function addListItem(
  key: ListKey,
  label: string,
  value: Record<string, unknown> = {},
) {
  const list = cache.get(key) ?? [];
  const sort = (list[list.length - 1]?.sort_order ?? 0) + 1;
  await supabase
    .from("master_lists")
    .insert({ list_key: key, label, value: value as any, sort_order: sort });
  await load(key);
}

export async function updateListItem(
  id: string,
  patch: { label?: string; value?: Record<string, unknown> },
) {
  await supabase
    .from("master_lists")
    .update(patch as any)
    .eq("id", id);
  for (const k of cache.keys()) await load(k);
}

export async function deleteListItem(id: string) {
  await supabase.from("master_lists").delete().eq("id", id);
  for (const k of cache.keys()) await load(k);
}
