export type FixtureInput = {
  opponent?: string; homeAway?: string; scheduledAt?: string | null;
  venue?: string; address?: string; rankedInUrl?: string; rankedInMatchId?: string;
  result?: string; status?: string;
};

const copenhagen = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function parseMatchDate(raw: string | null | undefined): Date | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?(?:Z|[+-]\d\d:\d\d)$/i.test(value)) {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date;
    throw new Error("Kampdatoen er ugyldig.");
  }
  const match = /^(\d{4})-(\d\d)-(\d\d)[T ](\d\d):(\d\d)$/.exec(value);
  if (!match) throw new Error("Brug dato og tid som ÅÅÅÅ-MM-DD TT:MM.");
  const [, y, mo, d, h, mi] = match;
  const wanted = `${d}/${mo}/${y}, ${h}:${mi}`;
  const localAsUtc = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  for (const offset of [2, 1]) {
    const candidate = new Date(localAsUtc - offset * 3_600_000);
    if (copenhagen.format(candidate) === wanted) return candidate;
  }
  throw new Error("Kampdatoen findes ikke i dansk tidszone.");
}

export function normalizeFixture(raw: FixtureInput) {
  const opponent = raw.opponent?.trim() ?? "";
  const homeAway = raw.homeAway?.trim().toLowerCase();
  if (!opponent || opponent.length > 150) throw new Error("Skriv et gyldigt modstanderhold.");
  if (!homeAway || !["home", "away", "hjemme", "ude"].includes(homeAway)) throw new Error("Vælg hjemme eller ude.");
  const scheduledAt = parseMatchDate(raw.scheduledAt);
  const venue = raw.venue?.trim() ?? "";
  const address = raw.address?.trim() ?? "";
  const rankedInUrl = raw.rankedInUrl?.trim() ?? "";
  const result = raw.result?.trim() ?? "";
  if (venue.length > 200 || address.length > 300 || result.length > 50) throw new Error("Et af kampens felter er for langt.");
  if (rankedInUrl) {
    try {
      const url = new URL(rankedInUrl);
      if (url.protocol !== "https:" || !["rankedin.com", "www.rankedin.com"].includes(url.hostname)) throw new Error();
    } catch { throw new Error("Brug et gyldigt RankedIn-link."); }
  }
  const rankedInMatchId = raw.rankedInMatchId?.trim() || /\/matchresults\/(\d+)/.exec(rankedInUrl)?.[1] || null;
  if (rankedInMatchId && rankedInMatchId.length > 100) throw new Error("RankedIn kamp-ID er for langt.");
  const status = result ? "completed" : scheduledAt ? "scheduled" : "planning";
  return {
    opponent, homeAway: homeAway === "home" || homeAway === "hjemme" ? "home" : "away",
    scheduledAt, venue: venue || null, address: address || null,
    rankedInUrl: rankedInUrl || null, rankedInMatchId,
    status, result: result || null,
  };
}

function csvRows(input: string) {
  const firstLine = input.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0] ?? "";
  const separator = (firstLine.match(/;/g) ?? []).length > (firstLine.match(/,/g) ?? []).length ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const text = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === separator && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) throw new Error("CSV-filen har et uafsluttet citationstegn.");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseFixtureCsv(text: string) {
  if (!text.trim() || text.length > 1_000_000) throw new Error("Indsæt en CSV-fil under 1 MB.");
  const rows = csvRows(text);
  if (rows.length < 2 || rows.length > 201) throw new Error("CSV-filen skal have 1–200 kampe og en overskriftslinje.");
  const aliases: Record<string, keyof FixtureInput> = {
    opponent: "opponent", modstander: "opponent", home_away: "homeAway", hjemme_ude: "homeAway",
    hjemm_ude: "homeAway", side: "homeAway", scheduled_at: "scheduledAt", dato: "scheduledAt",
    dato_tid: "scheduledAt", venue: "venue", spillested: "venue", address: "address",
    adresse: "address", rankedin_url: "rankedInUrl", rankedin_link: "rankedInUrl",
    rankedin_match_id: "rankedInMatchId", rankedin_id: "rankedInMatchId",
    result: "result", resultat: "result",
  };
  const headers = rows[0].map((header) => aliases[header.toLowerCase().replace(/[\s-]+/g, "_")]);
  if (!headers.includes("opponent") || !headers.includes("homeAway")) {
    throw new Error("CSV-filen skal have kolonnerne modstander og hjemme_ude.");
  }
  return rows.slice(1).map((row, index) => {
    const raw: FixtureInput = {};
    for (let column = 0; column < headers.length; column++) {
      const key = headers[column];
      if (key) raw[key] = row[column] ?? "";
    }
    try { return normalizeFixture(raw); }
    catch (error) { throw new Error(`Linje ${index + 2}: ${error instanceof Error ? error.message : "Ugyldig kamp."}`); }
  });
}
