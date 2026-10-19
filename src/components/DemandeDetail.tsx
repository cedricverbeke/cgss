import { X, Calendar, Flag, User, Mail, Type, Building2, FileText, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import type { Demande } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { getUrgency, URGENCY_LABEL, URGENCY_COLORS, formatDate } from "@/lib/urgency";

export function DemandeDetail({ demande, onClose, onUpdated }: { demande: Demande; onClose: () => void; onUpdated?: () => void }) {
  const u = getUrgency(demande);
  const colors = URGENCY_COLORS[u];
  const [marking, setMarking] = useState(false);

  const markDone = async () => {
    setMarking(true);
    const { error } = await supabase.from("demandes").update({ statut: "terminé" }).eq("id", demande.id);
    setMarking(false);
    if (!error) {
      onUpdated?.();
      onClose();
    }
  };

  const Row = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">{label}</div>
        <div className="text-sm text-slate-900 break-words mt-0.5">{value || "—"}</div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-slate-800 text-sm bg-slate-100 px-2 py-1 rounded">{demande.short_id}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors.label}`}>{URGENCY_LABEL[u]}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">{demande.objet}</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-4">
            <Row icon={User} label="Demandeur" value={demande.demandeur} />
            <Row icon={Calendar} label="Date de la demande" value={formatDate(demande.date_demande)} />
            <Row icon={Mail} label="Destinataires" value={demande.destinataires} />
            <Row icon={Type} label="Type de demande" value={demande.type_demande} />
            <Row icon={FileText} label="Précisions (type)" value={demande.type_precision} />
            <Row icon={Building2} label="Pilotes" value={demande.pilote + (demande.sous_pilote ? ` — ${demande.sous_pilote}` : "")} />
            <Row icon={Flag} label="Priorité" value={demande.priorite ? `Oui — ${demande.niveau_priorite ?? ""}` : "Non"} />
            <Row icon={Calendar} label="Échéance" value={formatDate(demande.echeance)} />
            <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
              <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">Statut</div>
                <div className="text-sm text-slate-900 mt-0.5">{demande.statut}</div>
              </div>
            </div>
          </div>

          {demande.statut !== "terminé" && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white">
            <button
              onClick={markDone}
              disabled={marking}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Marquer comme terminé
            </button>
          </div>
        )}

        {demande.observations && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Observations</div>
              <div className="text-sm text-slate-800 whitespace-pre-wrap">{demande.observations}</div>
            </div>
          )}

          {demande.contenu && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Contenu d'origine</div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap font-mono text-xs max-h-64 overflow-y-auto">{demande.contenu}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
