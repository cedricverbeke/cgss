export type EmailParseResult = {
  demandeur: string;
  date_demande: string;
  destinataires: string;
  objet: string;
  contenu: string;
};

function cleanLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const direct = new Date(trimmed);
  if (!isNaN(direct.getTime())) {
    return direct.toISOString().slice(0, 10);
  }
  const months: Record<string, number> = {
    janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
    juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
  };
  const m = trimmed.match(/(\d{1,2})\s+([a-zéûôà]+)\s+(\d{4})/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = months[m[2].toLowerCase()] ?? 0;
    const year = parseInt(m[3], 10);
    const d = new Date(Date.UTC(year, month, day));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return "";
}

export function parseEmailText(raw: string): EmailParseResult {
  const lines = raw.split(/\r?\n/);
  const result: EmailParseResult = {
    demandeur: "",
    date_demande: "",
    destinataires: "",
    objet: "",
    contenu: "",
  };

  let contentStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    if (contentStartIndex === -1) {
      if (lower.startsWith("de :") || lower.startsWith("de:") || lower.startsWith("de ")) {
        result.demandeur = cleanLine(line.replace(/^de\s*[:]?/i, ""));
        continue;
      }
      if (lower.startsWith("envoyé :") || lower.startsWith("envoyé:") || lower.startsWith("envoye :") || lower.startsWith("envoye:") || lower.startsWith("date :") || lower.startsWith("date:")) {
        result.date_demande = normalizeDate(line.replace(/^(envoyé|envoye|date)\s*[:]/i, ""));
        continue;
      }
      if (lower.startsWith("à :") || lower.startsWith("à:") || lower.startsWith("a :") || lower.startsWith("a:") || lower.startsWith("destinataires :") || lower.startsWith("destinataires:")) {
        result.destinataires = cleanLine(line.replace(/^(à|a|destinataires)\s*[:]/i, ""));
        continue;
      }
      if (lower.startsWith("objet :") || lower.startsWith("objet:")) {
        result.objet = cleanLine(line.replace(/^objet\s*[:]/i, ""));
        continue;
      }
      if (result.objet && line.trim() === "") {
        contentStartIndex = i + 1;
        continue;
      }
    }
  }

  if (contentStartIndex === -1) {
    const objetIdx = lines.findIndex((l) => l.toLowerCase().startsWith("objet"));
    if (objetIdx >= 0 && objetIdx + 1 < lines.length) {
      contentStartIndex = objetIdx + 1;
    }
  }

  if (contentStartIndex >= 0 && contentStartIndex < lines.length) {
    result.contenu = lines.slice(contentStartIndex).join("\n").trim();
  }

  return result;
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
