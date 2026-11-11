import { useState } from "react";
import { Plus, Trash2, Loader2, AlertCircle, Settings2, Check } from "lucide-react";
import { useTypesDemande } from "@/lib/useTypesDemande";

export function TypesDemandeManager() {
  const { types, loading, addType, removeType } = useTypesDemande();
  const [newLibelle, setNewLibelle] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLibelle.trim();
    if (!trimmed) return;
    if (types.some((t) => t.libelle.toLowerCase() === trimmed.toLowerCase())) {
      setError("Ce type existe déjà.");
      return;
    }
    setAdding(true);
    setError(null);
    const created = await addType(trimmed);
    setAdding(false);
    if (!created) {
      setError("Impossible d'ajouter ce type.");
      return;
    }
    setNewLibelle("");
    setJustAdded(created.libelle);
    setTimeout(() => setJustAdded(null), 2500);
  };

  const handleRemove = async (id: string, libelle: string) => {
    setRemovingId(id);
    setError(null);
    const ok = await removeType(id);
    setRemovingId(null);
    if (!ok) {
      setError(`Impossible de supprimer « ${libelle} ».`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-emerald-600" />
          Types de demandes / actions à réaliser
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Ajoutez ou supprimez des types. Ils apparaîtront dans le formulaire de nouvelle demande.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAdd} className="mb-6 flex items-center gap-2">
        <input
          value={newLibelle}
          onChange={(e) => setNewLibelle(e.target.value)}
          placeholder="Nouveau type de demande / action à réaliser..."
          className="flex-1 px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition text-sm"
        />
        <button
          type="submit"
          disabled={adding || !newLibelle.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Ajouter
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin inline-block" /> Chargement...
          </div>
        ) : types.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">
            Aucun type pour le moment. Ajoutez-en un ci-dessus.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {types.map((t) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-2 min-w-0">
                  {justAdded === t.libelle && (
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  )}
                  <span className="text-sm text-slate-900 truncate">{t.libelle}</span>
                </div>
                <button
                  onClick={() => handleRemove(t.id, t.libelle)}
                  disabled={removingId === t.id}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-60"
                  title="Supprimer"
                >
                  {removingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
