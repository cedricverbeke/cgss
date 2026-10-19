import { AlertTriangle, Clock, CalendarClock, Inbox, CheckCircle2, Loader2, Mail, Check } from "lucide-react";
import { useState } from "react";
import type { Demande } from "@/lib/supabase";
import { getUrgency, URGENCY_LABEL, URGENCY_COLORS, formatDate } from "@/lib/urgency";

export function Dashboard({ demandes, onOpen, onMarkDone }: { demandes: Demande[]; onOpen: (d: Demande) => void; onMarkDone: (d: Demande) => Promise<void> }) {
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderState, setReminderState] = useState<"idle" | "success" | "error" | "empty">("idle");
  const [reminderMessage, setReminderMessage] = useState("");

  const handleMarkDone = async (d: Demande) => {
    setMarkingId(d.id);
    await onMarkDone(d);
    setMarkingId(null);
  };

  const sendReminder = async () => {
    setSendingReminder(true);
    setReminderState("idle");
    setReminderMessage("");
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-reminder`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) {
        setReminderState("error");
        setReminderMessage(data.error || `Erreur ${res.status}`);
      } else if (data.sent === false) {
        setReminderState("empty");
        setReminderMessage("Aucune demande à signaler pour le moment.");
      } else {
        setReminderState("success");
        setReminderMessage(`Rappel envoyé à fatou08528@gmail.com (${data.count ?? 0} demande(s) signalée(s)).`);
      }
    } catch (err) {
      setReminderState("error");
      setReminderMessage(err instanceof Error ? err.message : "Échec de l'envoi.");
    }
    setSendingReminder(false);
    setTimeout(() => { setReminderState("idle"); setReminderMessage(""); }, 6000);
  };

  const retards = demandes.filter((d) => getUrgency(d) === "retard");
  const today = demandes.filter((d) => getUrgency(d) === "today");
  const soon = demandes.filter((d) => getUrgency(d) === "soon");

  const sections = [
    { key: "retard", title: "En retard", items: retards, icon: AlertTriangle, level: "retard" as const, empty: "Aucune demande en retard." },
    { key: "today", title: "À traiter aujourd'hui (J)", items: today, icon: Clock, level: "today" as const, empty: "Aucune demande à traiter aujourd'hui." },
    { key: "soon", title: "À venir (J-2)", items: soon, icon: CalendarClock, level: "soon" as const, empty: "Aucune demande à échéance proche." },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Tableau de bord</h2>
          <p className="text-slate-500 text-sm mt-1">Les demandes nécessitant votre attention aujourd'hui.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={sendReminder}
            disabled={sendingReminder}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
          >
            {sendingReminder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Envoyer le rappel maintenant
          </button>
          {reminderState === "success" && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
              <Check className="w-3.5 h-3.5" /> {reminderMessage}
            </span>
          )}
          {reminderState === "empty" && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
              {reminderMessage}
            </span>
          )}
          {reminderState === "error" && (
            <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
              {reminderMessage}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {sections.map((s) => {
          const colors = URGENCY_COLORS[s.level];
          const Icon = s.icon;
          return (
            <div key={s.key} className={`p-5 rounded-xl border ${colors.border} ${colors.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>{s.title}</span>
                <Icon className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div className={`text-3xl font-bold ${colors.text}`}>{s.items.length}</div>
            </div>
          );
        })}
      </div>

      {sections.map((s) => {
        const colors = URGENCY_COLORS[s.level];
        const Icon = s.icon;
        return (
          <div key={s.key} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-5 h-5 ${colors.text}`} />
              <h3 className={`text-sm font-semibold uppercase tracking-wide ${colors.text}`}>{s.title}</h3>
              <span className="text-xs text-slate-400">({s.items.length})</span>
            </div>

            {s.items.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-400">
                <Inbox className="w-4 h-4" />
                {s.empty}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {s.items.map((d) => {
                  const u = getUrgency(d);
                  const uColors = URGENCY_COLORS[u];
                  return (
                    <button
                      key={d.id}
                      onClick={() => onOpen(d)}
                      className={`text-left p-4 rounded-lg border ${uColors.border} ${uColors.bg} hover:shadow-md transition relative`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${uColors.label}`}>
                          {URGENCY_LABEL[u]}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-600">{d.short_id}</span>
                      </div>
                      <div className="font-medium text-slate-900 text-sm mb-1 line-clamp-2">{d.objet}</div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Demandeur : {d.demandeur || "—"}</span>
                        <span>Pilote : {d.pilote || "—"}{d.pilote?.includes("DRH") && d.sous_pilote ? ` · ${d.sous_pilote}` : ""}</span>
                        <span>Échéance : {formatDate(d.echeance)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMarkDone(d); }}
                        disabled={markingId === d.id}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300 text-xs font-medium rounded-lg transition disabled:opacity-60"
                      >
                        {markingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        Marquer terminé
                      </button>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
