import { LayoutDashboard, FilePlus, Table, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export type View = "dashboard" | "form" | "table";

export function Header({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const { user, signOut } = useAuth();

  const tabs: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { key: "form", label: "Nouvelle demande", icon: FilePlus },
    { key: "table", label: "Toutes les demandes", icon: Table },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900 hidden sm:block">Demandes · Assistante de direction</span>
          </div>

          <nav className="flex items-center gap-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = view === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => onChange(t.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    active ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:block">{t.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block max-w-[180px] truncate">{user?.email}</span>
            <button onClick={signOut} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg" title="Déconnexion">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
