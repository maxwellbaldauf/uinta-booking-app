// Address matching for "is this the same property?" — used to REUSE a customer's
// existing property instead of creating a duplicate. Pure functions, no I/O.
// (An identical copy lives in uinta-booking-app and camelback-ice-co: the repos
// don't import each other's code, and Uinta/Camelback stay fully separate.)
//
// Rules:
//  - Case, punctuation, extra spaces, street-suffix / direction abbreviations
//    (St/Street, Rd/Road, North/N …), "USA", state names and the zip are ignored.
//  - A unit / apartment / suite designator is PART of the identity: "100 Main St
//    Apt 2" and "100 Main St Apt 3" are different properties, and so is a bare
//    "100 Main St" vs "100 Main St Apt 2".
//  - Geocode proximity is only a fallback, and only when NEITHER address has a
//    unit (apartments in one building share a pin).
//  - Matching is always within ONE customer; callers must scope candidates to the
//    customer. A different customer at the same address gets their own property.

const SUFFIX: Record<string, string> = {
  street: "st", avenue: "ave", av: "ave", drive: "dr", road: "rd", boulevard: "blvd", lane: "ln",
  court: "ct", circle: "cir", place: "pl", parkway: "pkwy", highway: "hwy", trail: "trl",
  terrace: "ter", square: "sq", alley: "aly", loop: "loop",
};
const DIRECTION: Record<string, string> = {
  north: "n", south: "s", east: "e", west: "w",
  northeast: "ne", northwest: "nw", southeast: "se", southwest: "sw",
};
const UNIT_WORDS = new Set(["apt", "apartment", "unit", "ste", "suite", "bldg", "building", "fl", "floor", "rm", "room", "lot", "spc", "space"]);
const COUNTRY = new Set(["usa", "us", "united", "states", "america"]);
const STATES: Record<string, string> = { utah: "ut", colorado: "co", idaho: "id", wyoming: "wy", nevada: "nv", arizona: "az" };

export type NormalizedAddress = {
  /** Comparable key, e.g. "1664 preserve dr park city". */
  key: string;
  /** Unit designator + value ("unit 2"), or null when the address has none. */
  unit: string | null;
};

export function normalizeAddress(raw: string | null | undefined): NormalizedAddress {
  let s = (raw ?? "").toLowerCase();
  // "#2" / "# 2" / "apt2" / "unit-2" -> "unit 2"
  s = s.replace(/#\s*([a-z0-9-]+)/g, " unit $1 ");
  s = s.replace(/\b(apt|apartment|unit|ste|suite|bldg|building|fl|floor|rm|room|lot|spc|space)\.?\s*-?\s*(\d+[a-z]?|[a-z])\b/g, " unit $2 ");
  s = s.replace(/[^a-z0-9\s]/g, " ");
  const out: string[] = [];
  let unit: string | null = null;
  const toks = s.split(/\s+/).filter(Boolean);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (COUNTRY.has(t)) continue;
    if (/^\d{5}$/.test(t) && i > 0) continue; // zip (never the leading house number)
    if (/^\d{4}$/.test(t) && i > 1 && /^\d{5}$/.test(toks[i - 1] ?? "")) continue; // zip+4
    if (UNIT_WORDS.has(t)) {
      const v = toks[i + 1];
      if (v) {
        unit = `unit ${v}`;
        out.push("unit", v);
        i += 1;
      }
      continue;
    }
    out.push(SUFFIX[t] ?? DIRECTION[t] ?? STATES[t] ?? t);
  }
  return { key: out.join(" "), unit };
}

/** True when both addresses refer to the same property (units respected). */
export function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalizeAddress(a);
  const y = normalizeAddress(b);
  return x.key !== "" && x.key === y.key;
}

const EARTH_M = 111_320; // metres per degree of latitude

export function metersBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2;
  const dLng = (lng1 - lng2) * Math.cos((lat1 * Math.PI) / 180);
  return EARTH_M * Math.sqrt(dLat * dLat + dLng * dLng);
}

export const GEOCODE_MATCH_METERS = 5;

export type PropertyCandidate = {
  id: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

/**
 * Picks the customer's existing property that `address` refers to, or null.
 * Normalized-address match first; geocode within GEOCODE_MATCH_METERS only when
 * neither side has a unit. `candidates` MUST already be limited to one customer.
 */
export function findMatchingProperty<T extends PropertyCandidate>(
  candidates: T[],
  address: string,
  coords?: { lat: number; lng: number } | null
): T | null {
  const target = normalizeAddress(address);
  if (target.key === "") return null;
  const byKey = candidates.find((c) => normalizeAddress(c.address).key === target.key);
  if (byKey) return byKey;
  if (coords && target.unit === null) {
    for (const c of candidates) {
      if (c.latitude == null || c.longitude == null) continue;
      if (normalizeAddress(c.address).unit !== null) continue;
      if (metersBetween(coords.lat, coords.lng, c.latitude, c.longitude) <= GEOCODE_MATCH_METERS) return c;
    }
  }
  return null;
}
