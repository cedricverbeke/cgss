import { useMemo, useRef, useState } from "react";
import { ClipboardPaste, Save, Loader2, Check, AlertCircle, Calendar, Flag, X, Bell, Paperclip, Plus } from "lucide-react";
import { supabase, PILOTE_OPTIONS, SOUS_PILOTE_DRH_OPTIONS, NIVEAU_PRIORITE_OPTIONS, type Demande } from "@/lib/supabase";
import { parseEmailText, addDays } from "@/lib/emailParser";
import { uploadPieceJointe, removePieceJointe, type PieceJointeInfo } from "@/lib/pieceJointe";
import { useTypesDemande } from "@/lib/useTypesDemande";

type FormData = {
  emailRaw: string;
  demandeur: string;
  date_demande: string;
  destinataires: string;
  objet: string;
  contenu: string;
  type_demande: string;
  type_precision: string;
  pilotes: string[];
  sous_pilote: string;
  priorite: boolean;
  niveau_priorite: string;
  echeance: string;
  relance: boolean;
  relance_date: string;
  pieceJointe: File | null;
  observations: string;
};

const emptyForm: FormData = {
  emailRaw: "",
  demandeur: "",
  date_demande: "",
  destinataires: "",
  objet: "",
  contenu: "",
  type_demande: "actions à réaliser",
  type_precision: "",
  pilotes: [],
  sous_pilote: "",
  priorite: false,
  niveau_priorite: "",
  echeance: "",
  relance: false,
  relance_date: "",
  pieceJointe: null,
  observations: "",
};

export function DemandeForm({ onSaved }: { onSaved: (d: Demande) => void }) {
  const { types, addType } = useTypesDemande();
  const typeOptions = types.map((t) => t.libelle);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showEmailZone, setShowEmailZone] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewType, setShowNewType] = useState(false);
  const [newTypeLibelle, setNewTypeLibelle] = useState("");
  const [addingType, setAddingType] = useState(false);

  const computedEcheance = useMemo(() => {
    if (!form.priorite || !form.date_demande) return form.echeance;
    if (form.niveau_priorite === "P1") return addDays(form.date_demande, 3);
    if (form.niveau_priorite === "P2") return addDays(form.date_demande, 7);
    if (form.niveau_priorite === "P3") return addDays(form.date_demande, 14);
    return form.echeance;
  }, [form.priorite, form.niveau_priorite, form.date_demande, form.echeance]);

  const handleParse = () => {
    const parsed = parseEmailText(form.emailRaw);
    setForm((f) => ({
      ...f,
      demandeur: parsed.demandeur || f.demandeur,
      date_demande: parsed.date_demande || f.date_demande,
      destinataires: parsed.destinataires || f.destinataires,
      objet: parsed.objet || f.objet,
      contenu: parsed.contenu || f.contenu,
    }));
    setShowEmailZone(false);
  };

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setShowEmailZone(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddType = async () => {
    const trimmed = newTypeLibelle.trim();
    if (!trimmed) return;
    if (typeOptions.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setError("Ce type existe déjà.");
      return;
    }
    setAddingType(true);
    setError(null);
    const created = await addType(trimmed);
    setAddingType(false);
    if (!created) {
      setError("Impossible d'ajouter ce type.");
      return;
    }
    update("type_demande", created.libelle);
    setNewTypeLibelle("");
    setShowNewType(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const finalEcheance = form.priorite && form.niveau_priorite && form.date_demande
      ? computedEcheance
      : form.echeance;

    let pj: PieceJointeInfo | null = null;
    if (form.pieceJointe) {
      try {
        pj = await uploadPieceJointe(form.pieceJointe);
      } catch (err) {
        setSaving(false);
        setError(err instanceof Error ? err.message : "Échec de l'envoi de la pièce jointe.");
        return;
      }
    }

    const payload = {
      demandeur: form.demandeur,
      date_demande: form.date_demande || null,
      destinataires: form.destinataires,
      objet: form.objet,
      contenu: form.contenu,
      type_demande: form.type_demande,
      type_precision: form.type_precision,
      pilote: form.pilotes.join(", "),
      sous_pilote: form.pilotes.includes("DRH") ? form.sous_pilote : null,
      priorite: form.priorite,
      niveau_priorite: form.priorite ? form.niveau_priorite : null,
      echeance: finalEcheance || null,
      relance: form.relance,
      relance_date: form.relance && form.relance_date ? form.relance_date : null,
      pj_path: pj?.path ?? null,
      pj_name: pj?.name ?? null,
      pj_size: pj?.size ?? null,
      observations: form.observations,
      statut: "à traiter",
    };

    const { data, error } = await supabase.from("demandes").insert(payload).select().single();
    setSaving(false);
    if (error) {
      if (pj) await removePieceJointe(pj.path);
      setError(error.message);
      return;
    }
    setSuccess(true);
    resetForm();
    if (data) onSaved(data as Demande);
    setTimeout(() => setSuccess(false), 3500);
  };

  const fieldClass = "w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Nouvelle demande</h2>
        <p className="text-slate-500 text-sm mt-1">Collez l'e-mail pour pré-remplir, puis complétez et enregistrez.</p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Demande enregistrée avec succès. Elle apparaît maintenant dans le tableau.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {showEmailZone && (
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <ClipboardPaste className="w-4 h-4 text-emerald-600" />
                Coller le texte de l'e-mail
              </label>
              <button
                type="button"
                onClick={() => setShowEmailZone(false)}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Saisir manuellement
              </button>
            </div>
            <textarea
              value={form.emailRaw}
              onChange={(e) => update("emailRaw", e.target.value)}
              rows={6}
              className={fieldClass + " font-mono text-xs"}
              placeholder={"De : ...\nEnvoyé : ...\nÀ : ...\nObjet : ...\n\nContenu du message..."}
            />
            <button
              type="button"
              onClick={handleParse}
              disabled={!form.emailRaw.trim()}
              className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              Pré-remplir le formulaire
            </button>
          </div>
        )}

        {!showEmailZone && (
          <button
            type="button"
            onClick={() => setShowEmailZone(true)}
            className="text-sm text-emerald-700 hover:text-emerald-800 underline flex items-center gap-1"
          >
            <ClipboardPaste className="w-4 h-4" /> Afficher la zone de collage d'e-mail
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={labelClass}>Demandeur <span className="text-red-500">*</span></span>
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
          <span className={labelClass}>Objet <span className="text-red-500">*</span></span>
          <input className={fieldClass} value={form.objet} onChange={(e) => update("objet", e.target.value)} required />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="block">
            <span className={labelClass}>Type de demande / action à réaliser</span>
            <div className="flex items-center gap-2">
              <select className={fieldClass} value={form.type_demande} onChange={(e) => update("type_demande", e.target.value)}>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setShowNewType((s) => !s)}
                title="Ajouter un nouveau type"
                className="flex-shrink-0 p-2.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-300 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {showNewType && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  value={newTypeLibelle}
                  onChange={(e) => setNewTypeLibelle(e.target.value)}
                  placeholder="Nouveau type..."
                  className={fieldClass}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddType(); } }}
                />
                <button
                  type="button"
                  onClick={handleAddType}
                  disabled={addingType || !newTypeLibelle.trim()}
                  className="flex-shrink-0 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
                >
                  {addingType ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewType(false); setNewTypeLibelle(""); }}
                  className="flex-shrink-0 p-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <label className="block">
            <span className={labelClass}>Précisions (type)</span>
            <textarea rows={3} className={fieldClass} value={form.type_precision} onChange={(e) => update("type_precision", e.target.value)} placeholder="Précisions éventuelles" />
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="block">
            <span className={labelClass}>Pilotes</span>
            <div className="flex flex-wrap gap-2 mt-1">
              {PILOTE_OPTIONS.map((p) => {
                const selected = form.pilotes.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      update(
                        "pilotes",
                        selected
                          ? form.pilotes.filter((x) => x !== p)
                          : [...form.pilotes, p]
                      )
                    }
                    className={
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition flex items-center gap-1 " +
                      (selected
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-white border-slate-300 text-slate-600 hover:border-emerald-400 hover:text-emerald-700")
                    }
                  >
                    {p}
                    {selected && <X className="w-3 h-3" />}
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
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <label className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-700">
            <Flag className="w-4 h-4 text-emerald-600" />
            <input
              type="checkbox"
              checked={form.priorite}
              onChange={(e) => {
                update("priorite", e.target.checked);
                if (!e.target.checked) update("niveau_priorite", "");
              }}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/40"
            />
            Priorité
          </label>

          {form.priorite && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className={labelClass}>Niveau de priorité</span>
                <select className={fieldClass} value={form.niveau_priorite} onChange={(e) => update("niveau_priorite", e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {NIVEAU_PRIORITE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <div className="block">
                <span className={labelClass}>Échéance calculée</span>
                <div className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {computedEcheance || form.echeance || "—"}
                  {form.niveau_priorite && form.date_demande && computedEcheance && (
                    <span className="text-xs text-slate-400 ml-auto">
                      {form.niveau_priorite === "P1" ? "+3 j" : form.niveau_priorite === "P2" ? "+7 j" : "+14 j"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {!form.priorite && (
            <label className="block">
              <span className={labelClass}>Échéance (saisie manuelle)</span>
              <input type="date" className={fieldClass} value={form.echeance} onChange={(e) => update("echeance", e.target.value)} />
            </label>
          )}
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Bell className="w-4 h-4 text-emerald-600" />
            <input
              type="checkbox"
              checked={form.relance}
              onChange={(e) => {
                update("relance", e.target.checked);
                if (!e.target.checked) update("relance_date", "");
              }}
              className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/40"
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
          <span className={labelClass}>Pièce jointe (tout format)</span>
          <div className="flex items-center gap-3 px-3 py-2.5 bg-white border border-slate-300 rounded-lg">
            <Paperclip className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => update("pieceJointe", e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border-0 file:bg-slate-100 file:text-slate-700 file:font-medium hover:file:bg-slate-200"
            />
          </div>
        </label>

        <label className="block">
          <span className={labelClass}>Observations</span>
          <textarea rows={3} className={fieldClass} value={form.observations} onChange={(e) => update("observations", e.target.value)} placeholder="Remarques, contexte, suivi..." />
        </label>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold rounded-lg transition flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer la demande
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-sm font-medium"
          >
            Réinitialiser
          </button>
        </div>
      </form>
    </div>
  );
}
