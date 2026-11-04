import { writeFileSync, readdirSync, readFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const USER_AGENT = "Shikhar seed tool (https://shikhar.example; contact@example.com)";
const CONTENT_DIR = join(process.cwd(), "content", "prompts");

interface WikidataBinding {
  label: { value: string };
  item: { value: string };
  sitelinks: { value: string };
  altLabel?: { value: string };
}

async function sparql(query: string): Promise<WikidataBinding[]> {
  const res = await fetch(WIKIDATA_SPARQL, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: `query=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Wikidata SPARQL failed: ${res.status}`);
  const json = await res.json();
  return json.results.bindings as WikidataBinding[];
}

function qidFromItemUrl(itemUrl: string): string {
  return itemUrl.split("/").pop() ?? itemUrl;
}

function normalizeRarity(sitelinksStr: string): number {
  const sitelinks = Number(sitelinksStr) || 0;
  return Math.max(1, Math.min(100, 100 - Math.min(sitelinks, 99)));
}

const CATEGORIES: Array<{ id: string; category: string; text: string; hint: string; query: string }> = [
  {
    id: "rivers-india-wikidata",
    category: "geography",
    text: "Name a river that flows through India.",
    hint: "Any river, big or small, in any state.",
    query: `
      SELECT ?item ?itemLabel ?sitelinks (GROUP_CONCAT(DISTINCT ?altLabel; separator="|") AS ?altLabels) WHERE {
        ?item wdt:P31/wdt:P279* wdt:Q4022;  # river, subclass of
              wdt:P17 wdt:Q668.            # country India
        OPTIONAL { ?item wikibase:sitelinks ?sitelinks. }
        OPTIONAL { ?item skos:altLabel ?altLabel. FILTER(LANG(?altLabel) = "en") }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?item ?itemLabel ?sitelinks
      ORDER BY DESC(?sitelinks)
      LIMIT 60
    `,
  },
  {
    id: "indian-cities-wikidata",
    category: "states-and-cities",
    text: "Name a city in India.",
    hint: "Any city, big or small, in any state.",
    query: `
      SELECT ?item ?itemLabel ?sitelinks (GROUP_CONCAT(DISTINCT ?altLabel; separator="|") AS ?altLabels) WHERE {
        ?item wdt:P31/wdt:P279* wdt:Q515;  # city, subclass of
              wdt:P17 wdt:Q668.            # country India
        OPTIONAL { ?item wikibase:sitelinks ?sitelinks. }
        OPTIONAL { ?item skos:altLabel ?altLabel. FILTER(LANG(?altLabel) = "en") }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?item ?itemLabel ?sitelinks
      ORDER BY DESC(?sitelinks)
      LIMIT 60
    `,
  },
  {
    id: "languages-india-wikidata",
    category: "languages-and-words",
    text: "Name a language spoken in India.",
    hint: "Any language with speakers in India.",
    query: `
      SELECT ?item ?itemLabel ?sitelinks (GROUP_CONCAT(DISTINCT ?altLabel; separator="|") AS ?altLabels) WHERE {
        ?item wdt:P31/wdt:P279* wdt:Q34770;  # language, subclass of
              wdt:P424 wdt:Q668.              # country India (applies to part of)
        OPTIONAL { ?item wikibase:sitelinks ?sitelinks. }
        OPTIONAL { ?item skos:altLabel ?altLabel. FILTER(LANG(?altLabel) = "en") }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?item ?itemLabel ?sitelinks
      ORDER BY DESC(?sitelinks)
      LIMIT 60
    `,
  },
  {
    id: "hindi-films-wikidata",
    category: "music",
    text: "Name a Hindi-language film.",
    hint: "Any Bollywood film.",
    query: `
      SELECT ?item ?itemLabel ?sitelinks (GROUP_CONCAT(DISTINCT ?altLabel; separator="|") AS ?altLabels) WHERE {
        ?item wdt:P31 wdt:Q11424;  # film
              wdt:P364 wdt:Q156276;  # Hindi language
              wdt:P495 wdt:Q668.    # country of origin India
        OPTIONAL { ?item wikibase:sitelinks ?sitelinks. }
        OPTIONAL { ?item skos:altLabel ?altLabel. FILTER(LANG(?altLabel) = "en") }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?item ?itemLabel ?sitelinks
      ORDER BY DESC(?sitelinks)
      LIMIT 60
    `,
  },
  {
    id: "musical-instruments-india-wikidata",
    category: "music",
    text: "Name a musical instrument from India.",
    hint: "Any instrument traditionally associated with India.",
    query: `
      SELECT ?item ?itemLabel ?sitelinks (GROUP_CONCAT(DISTINCT ?altLabel; separator="|") AS ?altLabels) WHERE {
        ?item wdt:P31/wdt:P279* wdt:Q56982;  # musical instrument
              wdt:P495 wdt:Q668.             # country of origin India
        OPTIONAL { ?item wikibase:sitelinks ?sitelinks. }
        OPTIONAL { ?item skos:altLabel ?altLabel. FILTER(LANG(?altLabel) = "en") }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      GROUP BY ?item ?itemLabel ?sitelinks
      ORDER BY DESC(?sitelinks)
      LIMIT 60
    `,
  },
];

function existingPromptIds(): Set<string> {
  const ids = new Set<string>();
  if (!existsSync(CONTENT_DIR)) return ids;
  for (const f of readdirSync(CONTENT_DIR)) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = JSON.parse(readFileSync(join(CONTENT_DIR, f), "utf-8"));
      if (raw.id) ids.add(raw.id);
    } catch {}
  }
  return ids;
}

function writePromptFile(id: string, category: string, text: string, hint: string, answers: Array<{ name: string; rarity: number; aliases: string[] }>) {
  const existingIds = existingPromptIds();
  if (existingIds.has(id)) {
    console.log(`SKIP ${id}: already exists`);
    return;
  }
  const doc = {
    id,
    category,
    text,
    hint,
    verified: false,
    answers,
  };
  const filePath = join(CONTENT_DIR, `${id}.json`);
  writeFileSync(filePath, JSON.stringify(doc, null, 2) + "\n");
  console.log(`WRITE ${id}: ${answers.length} answers`);
}

async function main() {
  if (!existsSync(CONTENT_DIR)) mkdirSync(CONTENT_DIR, { recursive: true });

  for (const cat of CATEGORIES) {
    console.log(`\nQuerying Wikidata: ${cat.id}`);
    try {
      const rows = await sparql(cat.query);
      const answers = rows.map((r) => {
        const aliases = r.altLabel ? r.altLabel.value.split("|").filter((a: string) => a && a !== r.label.value) : [];
        return {
          name: r.label.value,
          rarity: normalizeRarity(r.sitelinks.value),
          aliases,
        };
      });
      writePromptFile(cat.id, cat.category, cat.text, cat.hint, answers);
    } catch (err) {
      console.error(`ERROR ${cat.id}:`, err);
    }
  }
}

main();
