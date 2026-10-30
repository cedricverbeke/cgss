import { useCallback, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { supabase, type Demande } from "@/lib/supabase";
import { SignIn } from "@/components/SignIn";
import { Header, type View } from "@/components/Header";
import { Dashboard } from "@/components/Dashboard";
import { DemandeForm } from "@/components/DemandeForm";
import { DemandesTable } from "@/components/DemandesTable";
import { DemandeDetail } from "@/components/DemandeDetail";

function Shell() {
  const { user, loading, isAuthorized } = useAuth();
  const [view, setView] = useState<View>("dashboard");
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [demandesLoading, setDemandesLoading] = useState(true);
  const [selectedRaw, setSelected] = useState<Demande | null>(null);
  const selected = selectedRaw && (demandes.find((d) => d.id === selectedRaw.id) ?? selectedRaw);

  const fetchDemandes = useCallback(async () => {
    setDemandesLoading(true);
    const { data, error } = await supabase
      .from("demandes")
      .select("*")
      .order("created_at", { ascending: false });
    setDemandesLoading(false);
    if (!error && data) setDemandes(data as Demande[]);
  }, []);

  const markDone = useCallback(async (d: Demande) => {
    await supabase.from("demandes").update({ statut: "terminé" }).eq("id", d.id);
    fetchDemandes();
  }, [fetchDemandes]);

  useEffect(() => {
    if (isAuthorized) fetchDemandes();
  }, [isAuthorized, fetchDemandes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl font-bold">!</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-900">Accès refusé</h1>
          <p className="text-slate-600 text-sm mt-2">
            Cet outil est réservé au compte fatou08528@gmail.com. Vous êtes connecté avec
            <span className="font-medium"> {user.email}</span>.
          </p>
          <SignOutButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header view={view} onChange={setView} />
      <main className={view === "table" ? "w-full px-4 sm:px-6 py-8" : "max-w-6xl mx-auto px-4 sm:px-6 py-8"}>
        {view === "dashboard" && <Dashboard demandes={demandes} onOpen={setSelected} onMarkDone={markDone} />}
        {view === "form" && <DemandeForm onSaved={() => { fetchDemandes(); setView("table"); }} />}
        {view === "table" && (
          <DemandesTable demandes={demandes} loading={demandesLoading} onRefresh={fetchDemandes} onOpen={setSelected} />
        )}
      </main>
      {selected && <DemandeDetail demande={selected} onClose={() => setSelected(null)} onUpdated={fetchDemandes} />}
    </div>
  );
}

function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <button onClick={signOut} className="mt-6 px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700">
      Se déconnecter
    </button>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
