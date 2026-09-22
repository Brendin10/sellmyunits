/* sellmyunits.com: quick value calculator
 * ------------------------------------------------------------
 * SETUP: paste your Cloudflare Worker URL below (see cloudflare-worker/README.md).
 * Until it's set, the "Nearby listings" lookup stays hidden and the calculator
 * uses the rent-multiplier method only.
 */
const LISTINGS_API = ""; // e.g. "https://sellmyunits-listings.YOUR-NAME.workers.dev"

/* The value range comes from up to three methods:
 *   1. Price per sq ft of nearby listings × your sq ft
 *   2. Price per bedroom of nearby listings × your total bedrooms
 *   3. Your yearly income × a gross rent multiplier (GRM, adjustable)
 * The math runs in the browser. Nothing is sent until the owner submits the form.
 */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const num = (v) => { const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")); return isFinite(n) && n > 0 ? n : 0; };
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const roundK = (n) => Math.round(n / 5000) * 5000;
  const short = (n) => n >= 1e6 ? "$" + (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M" : "$" + Math.round(n / 1000) + "K";
  const median = (a) => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const BED_N = { "Studio": 1, "1 bed": 1, "2 bed": 2, "3 bed": 3, "4+ bed": 4 };

  const unitRows = $("#unitRows"), listRows = $("#listingRows"), status = $("#listingStatus"), findBtn = $("#findListings");
  if (!unitRows) return;
  let listings = [];

  // ---------- unit rows ----------
  const BEDS = Object.keys(BED_N);
  function addUnit(beds = "2 bed") {
    const row = document.createElement("div");
    row.className = "calc-row";
    row.innerHTML =
      `<select aria-label="Bedrooms">${BEDS.map((b) => `<option${b === beds ? " selected" : ""}>${b}</option>`).join("")}</select>` +
      `<input type="number" inputmode="numeric" min="0" aria-label="Number of units" placeholder="2">` +
      `<input type="number" inputmode="decimal" min="0" aria-label="Rent per unit per month" placeholder="$1,100">` +
      `<button type="button" class="row-x" aria-label="Remove this unit type">×</button>`;
    unitRows.appendChild(row);
  }
  addUnit("2 bed"); addUnit("3 bed");
  $("#addUnit").addEventListener("click", () => { addUnit(); calc(); });
  unitRows.addEventListener("click", (e) => {
    const x = e.target.closest(".row-x");
    if (x && unitRows.querySelectorAll(".calc-row").length > 1) { x.closest(".calc-row").remove(); calc(); }
  });
  $("#calc").addEventListener("input", calc);
  $("#calc").addEventListener("change", calc);

  // ---------- nearby listings ----------
  if (!LISTINGS_API) {
    findBtn.hidden = true;
    findBtn.previousElementSibling.textContent = "Nearby listing lookup is coming soon. For now, the range uses your rents and a rent multiplier.";
  }
  findBtn.addEventListener("click", async () => {
    const address = $("#c_address").value.trim();
    if (address.split(/\s+/).length < 3) {
      status.textContent = "Enter the full property address (street, city, state) first.";
      status.className = "listing-status err";
      $("#c_address").focus();
      return;
    }
    findBtn.disabled = true; findBtn.textContent = "Searching…";
    status.className = "listing-status"; status.textContent = "Looking for 2+ unit buildings for sale near you…";
    try {
      const res = await fetch(`${LISTINGS_API.replace(/\/$/, "")}/listings?address=${encodeURIComponent(address)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Search failed");
      listings = (data.listings || []).map((l) => ({ ...l, use: true }));
      if (!listings.length) {
        status.textContent = `No 2+ unit listings found within ${data.radius || 1.5} miles right now. Your range uses your rents instead.`;
      } else {
        status.textContent = `Found ${listings.length} listing${listings.length > 1 ? "s" : ""} within ${data.radius} mi of ${data.subject?.matched || "your address"}. These are asking prices, which often run higher than final sale prices.`;
      }
      renderListings();
    } catch (err) {
      status.className = "listing-status err";
      status.textContent = err.message && err.message !== "Search failed" ? err.message : "We couldn't load nearby listings right now. Your range uses your rents instead.";
      listings = []; renderListings();
    } finally {
      findBtn.disabled = false; findBtn.textContent = "Search again";
      calc();
    }
  });
  function renderListings() {
    listRows.innerHTML = listings.map((l, i) => {
      const bits = [l.bedrooms && `${l.bedrooms} bd`, l.bathrooms && `${l.bathrooms} ba`, l.squareFootage && `${Math.round(l.squareFootage).toLocaleString()} sq ft`, l.yearBuilt && `built ${l.yearBuilt}`].filter(Boolean).join(" · ");
      const dist = l.distanceMi != null ? `${l.distanceMi.toFixed(2)} mi${l.blocks ? ` (~${l.blocks} block${l.blocks > 1 ? "s" : ""})` : ""}` : "";
      return `<label class="listing${l.use ? "" : " off"}"><input type="checkbox" data-i="${i}"${l.use ? " checked" : ""}>
        <div class="listing-body"><div class="listing-top"><strong>${esc(l.address)}</strong><b>${money(l.price)}</b></div>
        <span>${esc(bits || l.propertyType || "")}</span>
        <span class="listing-meta">${esc(dist)}${l.daysOnMarket != null ? ` · ${l.daysOnMarket} days listed` : ""}</span></div></label>`;
    }).join("");
  }
  listRows.addEventListener("change", (e) => {
    const cb = e.target.closest("input[type=checkbox]");
    if (!cb) return;
    listings[+cb.dataset.i].use = cb.checked;
    cb.closest(".listing").classList.toggle("off", !cb.checked);
    calc();
  });

  // ---------- math ----------
  function readInputs() {
    const units = [...unitRows.querySelectorAll(".calc-row")].map((r) => {
      const [sel, cnt, rent] = r.querySelectorAll("select, input");
      return { beds: sel.value, count: num(cnt.value), rent: num(rent.value) };
    }).filter((u) => u.count > 0);
    return {
      address: $("#c_address").value.trim(), area: $("#c_area").value, sqft: num($("#c_sqft").value),
      baths: num($("#c_baths").value), year: num($("#c_year").value), cond: $("#c_cond").value, units,
      extras: num($("#c_laundry").value) + num($("#c_parking").value) + num($("#c_other").value),
      grmLo: num($("#c_grmLo").value) || 7, grmHi: num($("#c_grmHi").value) || 9,
    };
  }

  function calc() {
    const d = readInputs();
    const totalUnits = d.units.reduce((s, u) => s + u.count, 0);
    const totalBeds = d.units.reduce((s, u) => s + u.count * BED_N[u.beds], 0);
    const monthlyRent = d.units.reduce((s, u) => s + u.count * u.rent, 0);
    const yearly = (monthlyRent + d.extras) * 12;
    const used = listings.filter((l) => l.use && l.price > 0);
    const methods = [];

    const ppsf = used.filter((l) => l.squareFootage > 0).map((l) => l.price / l.squareFootage);
    if (ppsf.length && d.sqft) methods.push({ name: "Nearby price per sq ft", basis: `${money(median(ppsf))}/sq ft × ${d.sqft.toLocaleString()} sq ft`, lo: Math.min(...ppsf) * d.sqft, mid: median(ppsf) * d.sqft, hi: Math.max(...ppsf) * d.sqft, n: ppsf.length });

    const ppb = used.filter((l) => l.bedrooms > 0).map((l) => l.price / l.bedrooms);
    if (ppb.length && totalBeds) methods.push({ name: "Nearby price per bedroom", basis: `${money(median(ppb))}/bedroom × ${totalBeds} bedrooms`, lo: Math.min(...ppb) * totalBeds, mid: median(ppb) * totalBeds, hi: Math.max(...ppb) * totalBeds, n: ppb.length });

    if (yearly) {
      const lo = Math.min(d.grmLo, d.grmHi), hi = Math.max(d.grmLo, d.grmHi);
      methods.push({ name: "Your rents × rent multiplier", basis: `${money(yearly)}/yr × ${lo}–${hi}`, lo: lo * yearly, mid: ((lo + hi) / 2) * yearly, hi: hi * yearly, n: 0 });
    }

    const rRange = $("#rRange"), rMid = $("#rMid"), rStats = $("#rStats"), rMethods = $("#rMethods");
    if (!methods.length) {
      rRange.textContent = "Enter your units and rents";
      rMid.textContent = ""; rStats.innerHTML = ""; rMethods.innerHTML = "";
      $("#calcSummary").value = ""; $("#calcEstimate").value = "";
      return;
    }
    let lo, hi;
    if (methods.length > 1) { const mids = methods.map((m) => m.mid); lo = Math.min(...mids); hi = Math.max(...mids); }
    else { lo = methods[0].lo; hi = methods[0].hi; }
    if (hi - lo < 0.06 * hi) { const c = (lo + hi) / 2; lo = c * 0.95; hi = c * 1.05; } // avoid false precision
    const mid = methods.reduce((s, m) => s + m.mid, 0) / methods.length;

    rRange.textContent = `${short(roundK(lo))} – ${short(roundK(hi))}`;
    rMid.textContent = `Midpoint about ${money(roundK(mid))}`;
    const stats = [];
    if (totalUnits) stats.push(`<div><b>${totalUnits}</b><span>units</span></div>`);
    if (yearly) stats.push(`<div><b>${short(yearly)}</b><span>yearly income</span></div>`);
    if (totalUnits) stats.push(`<div><b>${short(roundK(mid / totalUnits))}</b><span>per unit</span></div>`);
    rStats.innerHTML = stats.join("");
    rMethods.innerHTML = `<p class="methods-title">How we got there</p>` + methods.map((m) =>
      `<div class="method"><div><strong>${m.name}</strong><span>${m.basis}${m.n ? ` · ${m.n} listing${m.n > 1 ? "s" : ""}` : ""}</span></div><b>${short(roundK(m.mid))}</b></div>`).join("") +
      (LISTINGS_API && !used.length ? `<p class="method-tip">Tap "Find listings near my address" to compare with buildings for sale nearby.</p>` : "");

    $("#calcSummary").value = [
      d.address && `Address: ${d.address}`, d.area && `Area: ${d.area}`, d.sqft && `Sq ft: ${d.sqft}`, d.baths && `Baths: ${d.baths}`,
      d.year && `Year built: ${d.year}`, `Condition: ${d.cond}`,
      `Units: ${d.units.map((u) => `${u.count} × ${u.beds} @ ${money(u.rent)}`).join(", ")}`,
      d.extras && `Other income: ${money(d.extras)}/mo`, `GRM used: ${d.grmLo}–${d.grmHi}`,
      used.length && `Nearby listings used: ${used.map((l) => `${l.address} ${money(l.price)}${l.squareFootage ? ", " + l.squareFootage + " sf" : ""}${l.bedrooms ? ", " + l.bedrooms + " bd" : ""}${l.distanceMi != null ? ", " + l.distanceMi.toFixed(2) + " mi" : ""}`).join(" | ")}`,
    ].filter(Boolean).join("\n");
    $("#calcEstimate").value = `${money(roundK(lo))} – ${money(roundK(hi))} (mid ${money(roundK(mid))})`;
  }
  calc();

  $("#toForm").addEventListener("click", (e) => {
    e.preventDefault();
    $("#getReal").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => $("#first_name").focus({ preventScroll: true }), 500);
  });
})();
