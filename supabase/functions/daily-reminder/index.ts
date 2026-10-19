import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "rappels@resend.dev";
const RECIPIENT = "fatou08528@gmail.com";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

type Demande = {
  short_id: string;
  demandeur: string;
  objet: string;
  pilote: string;
  sous_pilote: string | null;
  echeance: string | null;
  statut: string;
};

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + "T00:00:00Z").getTime();
  const to = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

function classify(d: Demande): "retard" | "today" | "soon" | null {
  if (d.statut === "terminé") return null;
  if (!d.echeance) return null;
  const diff = daysBetween(todayUTC(), d.echeance);
  if (diff < 0) return "retard";
  if (diff === 0) return "today";
  if (diff === 2) return "soon";
  return null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function buildEmail(rows: { demande: Demande; level: "retard" | "today" | "soon" }[]): string {
  const levelLabel = { retard: "En retard", today: "À traiter aujourd'hui (J)", soon: "À venir (J-2)" };
  const levelColor = { retard: "#dc2626", today: "#ea580c", soon: "#f59e0b" };

  const sections = (["retard", "today", "soon"] as const).map((level) => {
    const items = rows.filter((r) => r.level === level);
    if (items.length === 0) return "";
    const rowsHtml = items.map((r) => {
      const d = r.demande;
      const pilote = d.pilote + (d.sous_pilote ? ` — ${d.sous_pilote}` : "");
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:700;font-family:monospace;">${d.short_id}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(d.objet)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(d.demandeur)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(pilote)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${formatDate(d.echeance)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(d.statut)}</td>
      </tr>`;
    }).join("");
    return `<h3 style="color:${levelColor[level]};margin:24px 0 8px;">${levelLabel[level]} (${items.length})</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f8fafc;text-align:left;">
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">ID</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Objet</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Demandeur</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Pilote</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Échéance</th>
          <th style="padding:8px 12px;border-bottom:2px solid #e2e8f0;">Statut</th>
        </tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;
  }).join("");

  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:800px;margin:0 auto;padding:20px;">
    <h2 style="color:#059669;margin:0 0 4px;">Rappel quotidien — Demandes à traiter</h2>
    <p style="color:#64748b;font-size:13px;margin:0 0 16px;">Récapitulatif automatique du ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
    ${sections || "<p style='color:#64748b;'>Aucune demande à signaler aujourd'hui.</p>"}
    <p style="color:#94a3b8;font-size:11px;margin-top:24px;">Message automatique envoyé à 6h00 (heure de Martinique).</p>
  </body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function sendEmail(html: string, subject: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [RECIPIENT],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error("Resend error", res.status, text);
    return false;
  }
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase env vars missing");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("demandes")
      .select("short_id, demandeur, objet, pilote, sous_pilote, echeance, statut")
      .neq("statut", "terminé");

    if (error) throw error;

    const rows = ((data as Demande[]) ?? [])
      .map((d) => {
        const level = classify(d);
        return level ? { demande: d, level } : null;
      })
      .filter((r): r is { demande: Demande; level: "retard" | "today" | "soon" } => r !== null);

    if (rows.length === 0) {
      return new Response(JSON.stringify({ sent: false, reason: "no_alerts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = buildEmail(rows);
    const subject = `[Rappel] ${rows.length} demande${rows.length > 1 ? "s" : ""} à surveiller`;
    const sent = await sendEmail(html, subject);

    return new Response(JSON.stringify({ sent, count: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
