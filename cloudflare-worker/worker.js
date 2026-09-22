/**
 * sellmyunits.com: nearby listings lookup (Cloudflare Worker)
 * ------------------------------------------------------------
 * Keeps the RentCast API key secret. The website calls:
 *   GET https://<your-worker>.workers.dev/listings?address=1234 Oak Ave, Hammond, IN
 * and gets back active 2+ unit listings near that address.
 *
 * Settings (Worker > Settings > Variables and Secrets):
 *   RENTCAST_API_KEY  (Secret)  your RentCast API key
 *   ALLOWED_ORIGINS   (Text)    https://www.sellmyunits.com,https://sellmyunits.com
 *
 * Cost control: each new address uses 1 RentCast request (2 if the first
 * 0.5-mile search finds fewer than 3 listings). Results are cached for 24 hours,
 * so repeat searches for the same address are free.
 */
const RADII_MILES = [0.5, 1.5];
const MIN_RESULTS = 3;
const MAX_RETURN = 8;
const BLOCKS_PER_MILE = 8; // typical Chicago-area grid

export default {
  async fetch(request, env, ctx) {
    const allowed = (env.ALLOWED_ORIGINS || "https://www.sellmyunits.com,https://sellmyunits.com")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (body, status = 200, extra = {}) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);
    if (!allowed.includes(origin)) return json({ error: "Not allowed" }, 403);
    if (!env.RENTCAST_API_KEY) return json({ error: "Listings service isn't configured yet." }, 500);

    const url = new URL(request.url);
    if (url.pathname !== "/listings") return json({ error: "Not found" }, 404);
    const address = (url.searchParams.get("address") || "").trim().replace(/\s+/g, " ").slice(0, 200);
    if (address.length < 8) return json({ error: "Enter the full property address (street, city, state)." }, 400);

    // 24-hour cache per address
    const cache = caches.default;
    const cacheKey = new Request("https://cache.sellmyunits.internal/listings?a=" + encodeURIComponent(address.toLowerCase()));
    const cached = await cache.match(cacheKey);
    if (cached) return new Response(cached.body, { headers: { ...cors, "Content-Type": "application/json", "X-Cache": "HIT" } });

    // 1) Geocode with the free US Census geocoder (no key needed)
    let lat, lon, matched;
    try {
      const g = await fetch("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=" + encodeURIComponent(address));
      const m = (await g.json())?.result?.addressMatches?.[0];
      if (m) { lat = m.coordinates.y; lon = m.coordinates.x; matched = m.matchedAddress; }
    } catch (e) { /* fall through */ }
    if (lat == null) return json({ error: "We couldn't find that address. Try street, city, state and ZIP." }, 404);

    // 2) Active multifamily listings nearby from RentCast
    let raw = [], radius = RADII_MILES[0];
    for (const r of RADII_MILES) {
      radius = r;
      const q = new URLSearchParams({
        latitude: String(lat), longitude: String(lon), radius: String(r),
        propertyType: "Multi-Family|Apartment", status: "Active", limit: "25", suppressLogging: "true",
      });
      const res = await fetch("https://api.rentcast.io/v1/listings/sale?" + q, {
        headers: { "X-Api-Key": env.RENTCAST_API_KEY, Accept: "application/json" },
      });
      if (res.status === 404) { raw = []; continue; } // no results at this radius
      if (!res.ok) return json({ error: "The listings service is busy. Please try again later." }, 502);
      raw = await res.json();
      if (Array.isArray(raw) && raw.length >= MIN_RESULTS) break;
    }

    const listings = (Array.isArray(raw) ? raw : [])
      .filter((l) => l && l.price > 0)
      .map((l) => {
        const d = l.latitude != null ? miles(lat, lon, l.latitude, l.longitude) : null;
        return {
          address: l.formattedAddress || [l.addressLine1, l.city, l.state].filter(Boolean).join(", "),
          price: l.price, propertyType: l.propertyType,
          bedrooms: l.bedrooms || null, bathrooms: l.bathrooms || null,
          squareFootage: l.squareFootage || null, yearBuilt: l.yearBuilt || null,
          daysOnMarket: l.daysOnMarket ?? null, listedDate: l.listedDate || null,
          distanceMi: d != null ? Math.round(d * 100) / 100 : null,
          blocks: d != null ? Math.max(1, Math.round(d * BLOCKS_PER_MILE)) : null,
        };
      })
      .sort((a, b) => (a.distanceMi ?? 99) - (b.distanceMi ?? 99))
      .slice(0, MAX_RETURN);

    const body = JSON.stringify({ subject: { matched, lat, lon }, radius, listings });
    ctx.waitUntil(cache.put(cacheKey, new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": "max-age=86400" } })));
    return new Response(body, { headers: { ...cors, "Content-Type": "application/json", "X-Cache": "MISS" } });
  },
};

function miles(lat1, lon1, lat2, lon2) {
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
