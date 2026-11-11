import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type Demande = {
  id: string;
  short_id: string;
  demandeur: string;
  date_demande: string | null;
  destinataires: string;
  objet: string;
  contenu: string;
  type_demande: string;
  type_precision: string;
  pilote: string;
  sous_pilote: string;
  priorite: boolean;
  niveau_priorite: string | null;
  echeance: string | null;
  observations: string;
  statut: string;
  relance: boolean;
  relance_date: string | null;
  pj_path: string | null;
  pj_name: string | null;
  pj_size: number | null;
  user_id: string;
  created_at: string;
};

export type TypeDemande = {
  id: string;
  libelle: string;
  position: number;
};

export const TYPE_DEMANDE_DEFAULTS = [
  "actions à réaliser",
  "arbitrage",
  "préparation dossier",
  "autre",
] as const;

export const PILOTE_OPTIONS = [
  "Dir ressources",
  "DRH",
  "DSI",
  "DELIS",
  "IMP",
  "PCA",
  "ORGA",
  "ATT. dir",
  "chargé appui strat",
] as const;

export const SOUS_PILOTE_DRH_OPTIONS = [
  "recrut/carrière et GEPP",
  "GAPP",
  "relations sociales et situations ind.",
  "formation",
] as const;

export const STATUT_OPTIONS = ["à traiter", "en cours", "terminé"] as const;

export const NIVEAU_PRIORITE_OPTIONS = ["P1", "P2", "P3"] as const;
