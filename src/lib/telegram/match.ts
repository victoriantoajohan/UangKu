interface Named {
  id: string;
  name: string;
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

/**
 * Matches a free-text hint (e.g. "gopay", "makan") against a list of the
 * user's actual wallets/categories. Returns:
 *  - a single confident match, or
 *  - `null` with `candidates` populated when ambiguous / no match, so the
 *    caller can ask the user to pick via an inline keyboard.
 */
export function matchByName<T extends Named>(
  hint: string | null,
  options: T[]
): { match: T | null; candidates: T[] } {
  if (!hint || options.length === 0) {
    return { match: null, candidates: options };
  }

  const normalizedHint = normalize(hint);

  const exact = options.find((o) => normalize(o.name) === normalizedHint);
  if (exact) return { match: exact, candidates: [] };

  const partial = options.filter(
    (o) => normalize(o.name).includes(normalizedHint) || normalizedHint.includes(normalize(o.name))
  );
  if (partial.length === 1) return { match: partial[0], candidates: [] };

  return { match: null, candidates: partial.length > 0 ? partial : options };
}
