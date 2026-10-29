import { supabase } from "@/lib/supabase";

export const PJ_BUCKET = "pieces-jointes";

export type PieceJointeInfo = { path: string; name: string; size: number };

const toSafeFileName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]/g, "_");

export async function uploadPieceJointe(file: File): Promise<PieceJointeInfo> {
  const path = `${crypto.randomUUID()}/${toSafeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(PJ_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(error.message);
  return { path, name: file.name, size: file.size };
}

export async function removePieceJointe(path: string): Promise<void> {
  await supabase.storage.from(PJ_BUCKET).remove([path]);
}

export async function getPieceJointeUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(PJ_BUCKET).createSignedUrl(path, 300);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Lien indisponible.");
  return data.signedUrl;
}

export async function openPieceJointe(path: string): Promise<void> {
  const url = await getPieceJointeUrl(path);
  window.open(url, "_blank", "noopener,noreferrer");
}
