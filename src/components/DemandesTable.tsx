import { useMemo, useState } from "react";
import { ArrowUpDown, Search, X, Pencil, Check, Loader2, Trash2, AlertTriangle, FileText, ExternalLink } from "lucide-react";
import { supabase, STATUT_OPTIONS, PILOTE_OPTIONS, TYPE_DEMANDE_OPTIONS, type Demande } from "@/lib/supabase";
import { getUrgency, URGENCY_LABEL, URGENCY_COLORS, formatDate } from "@/lib/urgency";

type SortKey = "short_id" | "demandeur" | "date_demande" | "objet" | "type_demande" | "pilote" | "echeance" | "statut" | "created_at";
type SortDir = "asc" | "desc";

const STATUT_STYLE: Record<string, string> = {
  "à traiter": "bg-white border border-slate-300 text-slate-700",
  "en cours": "bg-orange-100 border border-orange-300 text-orange-800",
  "terminé": "bg-emerald-100 border border-emerald-300 text-emerald-800",
};

export function DemandesTable({ demandes, loading, onRefresh, onOpen }: { demandes: Demande[]; loading: boolean; onRefresh: () => void; onOpen: (d: Demande) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterStatut, setFilterStatut] = useState("");
  const [filterPilote, setFilterPilote] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterEcheance, setFilterEcheance] = useState("");
  const [searchId, setSearchId] = useState("");
  const [editingObs, setEditingObs] = useState<string | null>(null);
  const [obsDraft, setObsDraft] = useState("");
  const [savingObs, setSavingObs] = useState(false);
  const [updatingStatut, setUpdatingStatut] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [precisionModal, setPrecisionModal] = useState<Demande | null>(null);

  const sorted = useMemo(() => {
    let list = [...demandes];
    if (searchId.trim()) {
      const q = searchId.trim().toUpperCase();
      list = list.filter((d) => d.short_id.toUpperCase().includes(q));
    }
    if (filterStatut) list = list.filter((d) => d.statut === filterStatut);
    if (filterPilote) list = list.filter((d) => (d.pilote || "").split(", ").includes(filterPilote));
    if (filterType) list = list.filter((d) => d.type_demande === filterType);
    if (filterEcheance === "retard") list = list.filter((d) => getUrgency(d) === "retard");
    if (filterEcheance === "today") list = list.filter((d) => getUrgency(d) === "today");
    if (filterEcheance === "soon") list = list.filter((d) => getUrgency(d) === "soon");

    list.sort((a, b) => {
      const av = (a[sortKey] ?? "").toString();
      const bv = (b[sortKey] ?? "").toString();
      const cmp = av.localeCompare(bv, "fr", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [demandes, sortKey, sortDir, filterStatut, filterPilote, filterType, filterEcheance, searchId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const saveObs = async (id: string) => {
    setSavingObs(true);
    const { error } = await supabase.from("demandes").update({ observations: obsDraft }).eq("id", id);
    setSavingObs(false);
    if (!error) {
      setEditingObs(null);
      onRefresh();
    }
  };

  const updateStatut = async (id: string, statut: string) => {
    setUpdatingStatut(id);
    const { error } = await supabase.from("demandes").update({ statut }).eq("id", id);
    setUpdatingStatut(null);
    if (!error) onRefresh();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === sorted.length) return new Set();
      return new Set(sorted.map((d) => d.id));
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const doDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("demandes").delete().in("id", ids);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message);
      return;
    }
    setConfirmDelete(false);
    clearSelection();
    onRefresh();
  };

  const clearFilters = () => {
    setFilterStatut(""); setFilterPilote(""); setFilterType(""); setFilterEcheance(""); setSearchId("");
  };

  const hasFilters = filterStatut || filterPilote || filterType || filterEcheance || searchId;

  const selectClass = "px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Toutes les demandes</h2>
          <p className="text-slate-500 text-sm mt-1">{sorted.length} demande{sorted.length > 1 ? "s" : ""}</p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">{selectedIds.size} sélectionnée{selectedIds.size > 1 ? "s" : ""}</span>
            <button
              onClick={clearSelection}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Annuler
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer ({selectedIds.size})
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Recherche par identifiant</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="ex: KXQ"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Statut</label>
            <select className={selectClass + " w-full"} value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}>
              <option value="">Tous</option>
              {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Pilote</label>
            <select className={selectClass + " w-full"} value={filterPilote} onChange={(e) => setFilterPilote(e.target.value)}>
              <option value="">Tous</option>
              {PILOTE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
            <select className={selectClass + " w-full"} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tous</option>
              {TYPE_DEMANDE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Échéance</label>
            <select className={selectClass + " w-full"} value={filterEcheance} onChange={(e) => setFilterEcheance(e.target.value)}>
              <option value="">Toutes</option>
              <option value="retard">En retard</option>
              <option value="today">Aujourd'hui (J)</option>
              <option value="soon">J-2</option>
            </select>
          </div>
        </div>
        {hasFilters && (
          <button onClick={clearFilters} className="mt-3 inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 underline">
            <X className="w-3 h-3" /> Effacer les filtres
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={sorted.length > 0 && selectedIds.size === sorted.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/40"
                  />
                </th>
                {([
                  ["short_id", "ID"],
                  ["demandeur", "Demandeur"],
                  ["date_demande", "Date demande"],
                  ["objet", "Objet"],
                  ["type_demande", "Type"],
                  ["pilote", "Pilote"],
                  ["echeance", "Échéance"],
                  ["statut", "Statut"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th key={key} className="px-3 py-3 text-left">
                    <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 uppercase tracking-wide hover:text-slate-900">
                      {label}
                      <ArrowUpDown className={`w-3 h-3 ${sortKey === key ? "text-emerald-600" : "text-slate-400"}`} />
                    </button>
                  </th>
                ))}
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Précisions</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Observations</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={11} className="px-3 py-10 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin inline-block" /> Chargement...
                </td></tr>
              )}
              {!loading && sorted.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-10 text-center text-slate-400">Aucune demande.</td></tr>
              )}
              {sorted.map((d) => {
                const u = getUrgency(d);
                const uColors = URGENCY_COLORS[u];
                const isLate = u === "retard";
                const isSelected = selectedIds.has(d.id);
                return (
                  <tr key={d.id} className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/60 ${isLate ? "bg-red-50/40" : ""} ${isSelected ? "bg-emerald-50/50" : ""}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(d.id)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/40"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => onOpen(d)} className="font-mono font-semibold text-slate-800 text-xs hover:text-emerald-700 hover:underline">
                        {d.short_id}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-slate-700 max-w-[160px] truncate">{d.demandeur || "—"}</td>
                    <td className="px-3 py-3 text-slate-700 whitespace-nowrap">{formatDate(d.date_demande)}</td>
                    <td className="px-3 py-3 text-slate-900 max-w-[220px]">
                      <button onClick={() => onOpen(d)} className="text-left truncate block w-full hover:text-emerald-700 hover:underline" title={d.objet}>
                        {d.objet}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-slate-700 text-xs">{d.type_demande}</td>
                    <td className="px-3 py-3 text-slate-700 text-xs">
                      {d.pilote
                        ? d.pilote.split(", ").map((p, i) => (
                            <span key={i} className="inline-block mr-1 mb-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {p}
                            </span>
                          ))
                        : "—"}
                      {d.pilote?.includes("DRH") && d.sous_pilote && <div className="text-slate-400">{d.sous_pilote}</div>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={isLate ? "text-red-700 font-semibold" : "text-slate-700"}>{formatDate(d.echeance)}</span>
                        {isLate && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${uColors.label}`}>RETARD</span>}
                        {u === "today" && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${uColors.label}`}>J</span>}
                        {u === "soon" && <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${uColors.label}`}>J-2</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={d.statut}
                        disabled={updatingStatut === d.id}
                        onChange={(e) => updateStatut(d.id, e.target.value)}
                        className={`px-2 py-1 text-xs rounded font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60 ${STATUT_STYLE[d.statut] || STATUT_STYLE["à traiter"]}`}
                      >
                        {STATUT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-3 max-w-[140px]">
                      {d.type_precision ? (
                        <button
                          onClick={() => setPrecisionModal(d)}
                          className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{d.type_precision}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 max-w-[240px]">
                      {editingObs === d.id ? (
                        <div className="flex items-start gap-1">
                          <textarea
                            value={obsDraft}
                            onChange={(e) => setObsDraft(e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          />
                          <button onClick={() => saveObs(d.id)} disabled={savingObs} className="text-emerald-600 hover:text-emerald-700 p-1">
                            {savingObs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button onClick={() => setEditingObs(null)} className="text-slate-400 hover:text-slate-600 p-1">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingObs(d.id); setObsDraft(d.observations || ""); }}
                          className="group flex items-start gap-1 text-left text-xs text-slate-600 w-full"
                        >
                          <span className="flex-1 line-clamp-2">{d.observations || <span className="text-slate-400 italic">Ajouter...</span>}</span>
                          <Pencil className="w-3 h-3 text-slate-300 group-hover:text-emerald-600 flex-shrink-0 mt-0.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {precisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setPrecisionModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-900">Précisions — {precisionModal.short_id}</h3>
              </div>
              <button onClick={() => setPrecisionModal(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Objet</div>
              <div className="text-sm text-slate-900 mb-3">{precisionModal.objet}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Type</div>
              <div className="text-sm text-slate-700 mb-3">{precisionModal.type_demande}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Précisions</div>
              <div className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-200">
                {precisionModal.type_precision || "—"}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => { onOpen(precisionModal); setPrecisionModal(null); }}
                className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
              >
                <ExternalLink className="w-4 h-4" /> Ouvrir la fiche complète
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">Confirmer la suppression</h3>
              </div>
              <p className="text-sm text-slate-600 mb-1">
                Vous êtes sur le point de supprimer <span className="font-semibold text-slate-900">{selectedIds.size}</span> demande{selectedIds.size > 1 ? "s" : ""}.
              </p>
              <p className="text-sm text-slate-500">Cette action est définitive et ne peut pas être annulée.</p>
              {deleteError && (
                <div className="mt-3 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                  {deleteError}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition disabled:opacity-60"
              >
                Annuler
              </button>
              <button
                onClick={doDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
