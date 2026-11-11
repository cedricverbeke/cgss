import { useCallback, useEffect, useState } from "react";
import { supabase, type TypeDemande } from "@/lib/supabase";

export function useTypesDemande() {
  const [types, setTypes] = useState<TypeDemande[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("types_demande")
      .select("id, libelle, position")
      .order("position", { ascending: true });
    setLoading(false);
    if (!error && data) setTypes(data as TypeDemande[]);
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const addType = useCallback(async (libelle: string): Promise<TypeDemande | null> => {
    const trimmed = libelle.trim();
    if (!trimmed) return null;
    const { data, error } = await supabase
      .from("types_demande")
      .insert({ libelle: trimmed })
      .select("id, libelle, position")
      .single();
    if (error || !data) return null;
    const newType = data as TypeDemande;
    setTypes((prev) => [...prev, newType].sort((a, b) => a.position - b.position));
    return newType;
  }, []);

  const removeType = useCallback(async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("types_demande").delete().eq("id", id);
    if (error) return false;
    setTypes((prev) => prev.filter((t) => t.id !== id));
    return true;
  }, []);

  return { types, loading, fetchTypes, addType, removeType };
}
