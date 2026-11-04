export function normalizeInput(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function normalizeName(name: string): string {
  return normalizeInput(name);
}

export function areAliasesColliding(
  canonical: string,
  aliases: string[],
  existingCanonicals: string[],
  existingAliases: string[][]
): boolean {
  const normCanonical = normalizeName(canonical);
  const normAliases = aliases.map(normalizeName);
  const all = [normCanonical, ...normAliases];

  const seen = new Set([...existingCanonicals.map(normalizeName), ...existingAliases.flat().map(normalizeName)]);
  for (const n of all) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}

export function hasDigits(s: string): boolean {
  return /\d/.test(s);
}
