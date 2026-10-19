import type { Demande } from "./supabase";

export type UrgencyLevel = "retard" | "today" | "soon" | "ok" | "done";

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00Z").getTime();
  const to = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

export function getUrgency(d: Demande): UrgencyLevel {
  if (d.statut === "terminé") return "done";
  if (!d.echeance) return "ok";
  const today = todayISO();
  const diff = daysBetween(today, d.echeance);
  if (diff < 0) return "retard";
  if (diff === 0) return "today";
  if (diff <= 2) return "soon";
  return "ok";
}

export const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  retard: "Retard",
  today: "J",
  soon: "J-2",
  ok: "À temps",
  done: "Terminé",
};

export const URGENCY_COLORS: Record<UrgencyLevel, { bg: string; text: string; border: string; label: string }> = {
  retard: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300", label: "bg-red-600 text-white" },
  today: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300", label: "bg-orange-500 text-white" },
  soon: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", label: "bg-amber-400 text-white" },
  ok: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "bg-emerald-500 text-white" },
  done: { bg: "bg-slate-50", text: "text-slate-500", border: "border-slate-200", label: "bg-slate-400 text-white" },
};

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}
