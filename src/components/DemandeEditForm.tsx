import { useState } from "react";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { supabase, PILOTE_OPTIONS, SOUS_PILOTE_DRH_OPTIONS, TYPE_DEMANDE_OPTIONS, type Demande } from "@/lib/supabase";

type EditFormData = {
  demandeur: string;
  date_demande: string;
  destinataires: string;
  objet: string;
  type_demande: string;
  type_precision: string;
  pilotes: string[];
  sous_pilote: string;
  echeance: string;
  relance: boolean;
  relance_date: string;
  observations: string;
};

const toFormData = (d: Demande): EditFormData => ({
  demandeur: d.demandeur ?? "",
  date_demande: d.date_demande ?? "",
  destinataires: d.destinataires ?? "",
  objet: d.objet ?? "",
  type_demande: d.type_demande,
  type_precision: d.type_precision ?? "",
  pilotes: d.pilote ? d.pilote.split(", ").filter(Boolean) : [],
  sous_pilote: d.sous_pilote ?? "",
  echeance: d.echeance ?? "",
  relance: d.relance,
  relance_date: d.relance_date ?? "",
  observations: d.observations ?? "",
});

const fieldClass = "w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition text-sm";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export function DemandeEditForm({ demande, onCancel, onSaved }: { demande: Demande; onCancel: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditFormData>(() => toFormData(demande));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof EditFormData>(key: K, value: EditFormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("demandes")
      .update({
        demandeur: form.demandeur,
        date_demande: form.date_demande || null,
        destinataires: form.destinataires,
        objet: form.objet,
        type_demande: form.type_demande,
        type_precision: form.type_precision,
        pilote: form.pilotes.join(", "),
        sous_pilote: form.pilotes.includes("DRH") ? form.sous_pilote : "",
        echeance: form.echeance || null,
        relance: form.relance,
        relance_date: form.relance && form.relance_date ? form.relance_date : null,
        observations: form.observations,
      })
      .eq("id", demande.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
  };

  return (
    <form onSubmit={handleSave} className="px-6 py-4 space-y-5">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={labelClass}>Demandeur</span>
          <input className={fieldClass} value={form.demandeur} onChange={(e) => update("demandeur", e.target.value)} required />
        </label>
        <label className="block">
          <span className={labelClass}>Date de la demande</span>
          <input type="date" className={fieldClass} value={form.date_demande} onChange={(e) => update("date_demande", e.target.value)} />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Destinataires</span>
        <input className={fieldClass} value={form.destinataires} onChange={(e) => update("destinataires", e.target.value)} />
      </label>

      <label className="block">
        <span className={labelClass}>Objet</span>
        <input className={fieldClass} value={form.objet} onChange={(e) => update("objet", e.target.value)} required />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className={labelClass}>Type de demande</span>
          <select className={fieldClass} value={form.type_demande} onChange={(e) => update("type_demande", e.target.value)}>
            {TYPE_DEMANDE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Précisions (type)</span>
          <textarea rows={3} className={fieldClass} value={form.type_precision} onChange={(e) => update("type_precision", e.target.value)} />
        </label>
      </div>

      <div>
        <span className={labelClass}>Pilotes</span>
        <div className="flex flex-wrap gap-2">
          {PILOTE_OPTIONS.map((p) => {
            const selected = form.pilotes.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => update("pilotes", selected ? form.pilotes.filter((x) => x !== p) : [...form.pilotes, p])}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition " +
                  (selected
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700")
                }
              >
                {p}
              </button>
            );
          })}
        </div>
        {form.pilotes.includes("DRH") && (
          <div className="mt-3">
            <span className={labelClass}>Sous-pilote (DRH)</span>
            <select className={fieldClass} value={form.sous_pilote} onChange={(e) => update("sous_pilote", e.target.value)}>
              <option value="">— Sélectionner —</option>
              {SOUS_PILOTE_DRH_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <label className="block">
        <span className={labelClass}>Échéance</span>
        <input type="date" className={fieldClass} value={form.echeance} onChange={(e) => update("echeance", e.target.value)} />
      </label>

      <div className="p-4 bg-pink-50 border border-pink-200 rounded-xl space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium text-pink-900">
          <input
            type="checkbox"
            checked={form.relance}
            onChange={(e) => {
              update("relance", e.target.checked);
              if (!e.target.checked) update("relance_date", "");
            }}
            className="w-4 h-4 rounded border-slate-300 text-pink-600 focus:ring-pink-500/40"
          />
          Relance effectuée
        </label>
        {form.relance && (
          <label className="block">
            <span className={labelClass}>Date de la relance</span>
            <input type="date" className={fieldClass} value={form.relance_date} onChange={(e) => update("relance_date", e.target.value)} />
          </label>
        )}
      </div>

      <label className="block">
        <span className={labelClass}>Observations</span>
        <textarea rows={3} className={fieldClass} value={form.observations} onChange={(e) => update("observations", e.target.value)} />
      </label>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition disabled:opacity-60"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>
    </form>
  );
}
