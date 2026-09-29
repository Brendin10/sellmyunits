/* sellmyunits.com — The Cap Calculator
 * ------------------------------------------------------------
 * Pure arithmetic, all of it in the browser. Nothing is sent anywhere
 * until the owner chooses to hand the numbers to the lead form.
 *
 * NOI = effective gross income - operating expenses
 * Value = NOI / cap rate        Cap rate = NOI / price
 *
 * Operating expenses never include the mortgage, depreciation, or capital
 * projects. That is the definition of NOI and it is what buyers price on.
 */
(function () {
  "use strict";

  var TYPES = {
    apt: {
      label: "Apartments",
      rowLabel: "Unit type",
      rowName: "units",
      unitWord: "units",
      rows: [
        { name: "1 bedroom", count: 2, rent: 900 },
        { name: "2 bedroom", count: 2, rent: 1150 }
      ],
      sizes: ["Studio", "1 bedroom", "2 bedroom", "3 bedroom", "4+ bedroom"],
      lossLabel: "Vacancy &amp; credit loss",
      lossHelp: "Rent you bill but never collect. 5&ndash;8% is a normal starting point.",
      lossDefault: 6, lossMin: 0, lossMax: 40,
      lossIsOccupancy: false,
      otherLabel: "Other income",
      otherHelp: "Laundry, parking, storage lockers, pet rent. Per month.",
      otherDefault: 0,
      expDefault: 40,
      expHelp: "Taxes, insurance, water and trash, repairs, management. Not the mortgage.",
      lines: ["Property taxes", "Insurance", "Water, sewer &amp; trash", "Common-area utilities", "Repairs &amp; maintenance", "Property management", "Lawn &amp; snow", "Everything else"],
      capDefault: 9,
      note: "Apartment buildings are priced almost entirely on income, so the cap rate does most of the work here."
    },
    house: {
      label: "Rental houses",
      rowLabel: "Houses",
      rowName: "houses",
      unitWord: "houses",
      rows: [
        { name: "3 bed / 1 bath", count: 2, rent: 1300 }
      ],
      sizes: ["2 bed", "3 bed / 1 bath", "3 bed / 2 bath", "4 bed", "Other"],
      lossLabel: "Vacancy &amp; credit loss",
      lossHelp: "Houses sit empty all-or-nothing, so this runs higher than apartments. 7&ndash;10% is common.",
      lossDefault: 8, lossMin: 0, lossMax: 40,
      lossIsOccupancy: false,
      otherLabel: "Other income",
      otherHelp: "Pet rent, garage, anything billed on top of rent. Per month.",
      otherDefault: 0,
      expDefault: 45,
      expHelp: "Runs higher per dollar of rent than apartments: one roof and one furnace per tenant.",
      lines: ["Property taxes", "Insurance", "Repairs &amp; maintenance", "Property management", "Lawn &amp; snow", "Turnover &amp; make-ready", "Everything else"],
      capDefault: 9,
      note: "Rental houses get valued two ways: on income like this, and on what an owner-occupant would pay. Whichever is higher usually wins, so treat this as your floor."
    },
    storage: {
      label: "Self-storage",
      rowLabel: "Unit sizes",
      rowName: "storage",
      unitWord: "units",
      rows: [
        { name: "5 &times; 10", count: 20, rent: 55 },
        { name: "10 &times; 10", count: 30, rent: 95 },
        { name: "10 &times; 20", count: 15, rent: 150 }
      ],
      sizes: ["5 &times; 5", "5 &times; 10", "10 &times; 10", "10 &times; 15", "10 &times; 20", "10 &times; 30", "Parking / RV"],
      lossLabel: "Physical occupancy",
      lossHelp: "The share of units actually rented right now. Storage is judged on occupancy, not vacancy.",
      lossDefault: 85, lossMin: 30, lossMax: 100,
      lossIsOccupancy: true,
      otherLabel: "Other income",
      otherHelp: "Late fees, tenant protection plans, locks and boxes, truck rental. Per month, and it matters more here than anywhere else.",
      otherDefault: 400,
      expDefault: 32,
      expHelp: "Lower than apartments. No plumbing in the units, and almost nothing to make ready between tenants.",
      lines: ["Property taxes", "Insurance", "Utilities", "Repairs &amp; maintenance", "On-site or remote management", "Security, gate &amp; software", "Marketing", "Everything else"],
      capDefault: 9.5,
      note: "Self-storage is priced on income and occupancy. A facility that is 60% full is sold as a fixer-upper, not a stabilised deal."
    }
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var num = function (v) { var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, "")); return isFinite(n) && n > 0 ? n : 0; };
  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-US"); };
  var short = function (n) {
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    return "$" + Math.round(n / 1000) + "K";
  };
  var roundK = function (n) { return Math.round(n / 1000) * 1000; };

  var root = $("#capcalc");
  if (!root) return;

  var state = { type: "apt", detailed: false };
  var rowsBox = $("#ccRows"), linesBox = $("#ccLines");

  /* ---------------- rows ---------------- */
  function addRow(cfg, preset) {
    var row = document.createElement("div");
    row.className = "cc-row";
    var opts = cfg.sizes.map(function (s) {
      return '<option' + (preset && preset.name === s ? " selected" : "") + ">" + s + "</option>";
    }).join("");
    row.innerHTML =
      '<select aria-label="' + cfg.rowLabel + '">' + opts + "</select>" +
      '<input type="number" inputmode="numeric" min="0" step="1" aria-label="How many" value="' + (preset ? preset.count : "") + '" placeholder="0">' +
      '<input type="number" inputmode="decimal" min="0" step="1" aria-label="Rent each, per month" value="' + (preset ? preset.rent : "") + '" placeholder="0">' +
      '<button type="button" class="cc-x" aria-label="Remove this row">&times;</button>';
    rowsBox.appendChild(row);
  }

  function buildType(key) {
    var cfg = TYPES[key];
    state.type = key;

    $$(".cc-tab").forEach(function (b) {
      var on = b.dataset.type === key;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", String(on));
    });

    $("#ccRowsLabel").innerHTML = cfg.rowLabel;
    $("#ccRowHead").innerHTML = "<span>" + cfg.rowLabel + "</span><span>How many</span><span>Rent each / mo</span><span></span>";
    rowsBox.innerHTML = "";
    cfg.rows.forEach(function (r) { addRow(cfg, r); });

    $("#ccLossLabel").innerHTML = cfg.lossLabel;
    $("#ccLossHelp").innerHTML = cfg.lossHelp;
    var loss = $("#ccLoss");
    loss.min = cfg.lossMin; loss.max = cfg.lossMax;   // set bounds BEFORE the value, or it clamps
    loss.value = cfg.lossDefault;
    $("#ccLossOut").textContent = cfg.lossDefault + "%";

    $("#ccOtherLabel").innerHTML = cfg.otherLabel;
    $("#ccOtherHelp").innerHTML = cfg.otherHelp;
    $("#ccOther").value = cfg.otherDefault || "";

    $("#ccExp").value = cfg.expDefault;
    $("#ccExpOut").textContent = cfg.expDefault + "%";
    $("#ccExpHelp").innerHTML = cfg.expHelp;

    $("#ccCap").value = cfg.capDefault;
    $("#ccCapOut").textContent = cfg.capDefault.toFixed(1) + "%";

    linesBox.innerHTML = cfg.lines.map(function (l, i) {
      return '<label class="cc-line"><span>' + l + '</span>' +
        '<input type="number" inputmode="decimal" min="0" step="1" data-line="' + i + '" placeholder="0"></label>';
    }).join("");

    $("#ccTypeNote").innerHTML = cfg.note;
    calc();
  }

  /* ---------------- math ---------------- */
  function read() {
    var cfg = TYPES[state.type];
    var rows = $$(".cc-row", rowsBox).map(function (r) {
      var f = r.querySelectorAll("select, input");
      return { name: f[0].value, count: num(f[1].value), rent: num(f[2].value) };
    }).filter(function (r) { return r.count > 0; });

    var unitCount = rows.reduce(function (s, r) { return s + r.count; }, 0);
    var gprMonthly = rows.reduce(function (s, r) { return s + r.count * r.rent; }, 0);
    var gpr = gprMonthly * 12;

    var lossPct = num($("#ccLoss").value);
    var collected = cfg.lossIsOccupancy ? gpr * (lossPct / 100) : gpr * (1 - lossPct / 100);

    var other = num($("#ccOther").value) * 12;
    var egi = collected + other;

    var expPct = num($("#ccExp").value);
    var lineTotal = $$("[data-line]", linesBox).reduce(function (s, el) { return s + num(el.value); }, 0);
    var opex = state.detailed ? lineTotal : egi * (expPct / 100);
    var effectiveRatio = egi > 0 ? (opex / egi) * 100 : 0;

    var noi = egi - opex;
    return {
      cfg: cfg, rows: rows, unitCount: unitCount, gprMonthly: gprMonthly, gpr: gpr,
      lossPct: lossPct, collected: collected, other: other, egi: egi,
      opex: opex, effectiveRatio: effectiveRatio, noi: noi,
      cap: num($("#ccCap").value), price: num($("#ccPrice").value)
    };
  }

  function calc() {
    var d = read();
    var out = $("#ccOut");

    if (d.egi <= 0) {
      out.classList.add("empty");
      $("#ccNoi").textContent = "—";
      $("#ccValue").textContent = "Add your units and rents";
      $("#ccRange").textContent = "";
      $("#ccStats").innerHTML = "";
      $("#ccBreak").innerHTML = "";
      $("#ccCapResult").hidden = true;
      $("#ccHandoff").setAttribute("aria-disabled", "true");
      return;
    }
    out.classList.remove("empty");
    $("#ccHandoff").removeAttribute("aria-disabled");

    $("#ccNoi").textContent = money(d.noi);

    // value from the cap rate
    if (d.cap > 0 && d.noi > 0) {
      var v = d.noi / (d.cap / 100);
      var lo = d.noi / ((d.cap + 1) / 100);
      var hi = d.noi / ((d.cap - 1) / 100);
      $("#ccValue").textContent = money(roundK(v));
      $("#ccRange").textContent = "A point either side: " + short(roundK(lo)) + " to " + short(roundK(hi));
    } else {
      $("#ccValue").textContent = d.noi <= 0 ? "No income left after expenses" : "—";
      $("#ccRange").textContent = "";
    }

    // cap rate from a price they were quoted
    if (d.price > 0 && d.noi > 0) {
      $("#ccCapResult").hidden = false;
      $("#ccCapCalc").textContent = ((d.noi / d.price) * 100).toFixed(2) + "%";
      $("#ccCapCalcNote").textContent = "at " + money(d.price);
    } else {
      $("#ccCapResult").hidden = true;
    }

    var stats = [];
    if (d.unitCount) stats.push("<div><b>" + d.unitCount + "</b><span>" + d.cfg.unitWord + "</span></div>");
    stats.push("<div><b>" + short(d.egi) + "</b><span>collected / yr</span></div>");
    if (d.unitCount && d.noi > 0 && d.cap > 0) {
      stats.push("<div><b>" + short(roundK(d.noi / (d.cap / 100) / d.unitCount)) + "</b><span>per " + (d.cfg.unitWord === "houses" ? "house" : "unit") + "</span></div>");
    }
    $("#ccStats").innerHTML = stats.join("");

    var lossRow = d.cfg.lossIsOccupancy
      ? { label: "Empty units (" + (100 - d.lossPct) + "% vacant)", val: -(d.gpr - d.collected) }
      : { label: "Vacancy &amp; credit loss (" + d.lossPct + "%)", val: -(d.gpr - d.collected) };

    var rowsHtml = [
      { label: "Gross potential rent", val: d.gpr, kind: "" },
      lossRow.val ? { label: lossRow.label, val: lossRow.val, kind: "neg" } : null,
      d.other ? { label: "Other income", val: d.other, kind: "" } : null,
      { label: "Effective gross income", val: d.egi, kind: "sub" },
      { label: "Operating expenses (" + d.effectiveRatio.toFixed(0) + "%)", val: -d.opex, kind: "neg" },
      { label: "Net operating income", val: d.noi, kind: "tot" }
    ].filter(Boolean).map(function (r) {
      return '<div class="cc-b ' + r.kind + '"><span>' + r.label + "</span><b>" +
        (r.val < 0 ? "−" + money(Math.abs(r.val)) : money(r.val)) + "</b></div>";
    }).join("");
    $("#ccBreak").innerHTML = rowsHtml;

    stash(d);
  }

  /* ---------------- hand-off ---------------- */
  function stash(d) {
    var parts = d.rows.map(function (r) {
      return r.count + " × " + String(r.name).replace(/&times;/g, "x") + " @ " + money(r.rent);
    });
    var summary = [
      "Property type: " + d.cfg.label,
      d.unitCount ? "Count: " + d.unitCount + " " + d.cfg.unitWord : "",
      "Mix: " + parts.join(", "),
      (d.cfg.lossIsOccupancy ? "Occupancy: " : "Vacancy: ") + d.lossPct + "%",
      d.other ? "Other income: " + money(d.other) + "/yr" : "",
      "Gross potential rent: " + money(d.gpr) + "/yr",
      "Effective gross income: " + money(d.egi) + "/yr",
      "Operating expenses: " + money(d.opex) + "/yr (" + d.effectiveRatio.toFixed(0) + "%" + (state.detailed ? ", itemised" : ", ratio") + ")",
      "NOI: " + money(d.noi) + "/yr",
      "Cap rate used: " + d.cap + "%",
      d.price ? "Price they were quoted: " + money(d.price) : ""
    ].filter(Boolean).join("\n");

    var est = (d.cap > 0 && d.noi > 0) ? money(roundK(d.noi / (d.cap / 100))) : "";

    try {
      sessionStorage.setItem("calc_type", d.cfg.label);
      sessionStorage.setItem("calc_noi", money(d.noi) + "/yr");
      sessionStorage.setItem("calc_estimate", est);
      sessionStorage.setItem("calc_summary", summary);
    } catch (e) { /* storage unavailable — the link still works */ }

    // deep link into the seller form
    var href = "sell.html?type=single";
    if (state.type === "storage") {
      href += "&units=" + encodeURIComponent("Self-storage facility");
    } else if (state.type === "house") {
      href = d.rows.reduce(function (s, r) { return s + r.count; }, 0) > 1 ? "sell.html?type=houses" : "sell.html?type=single";
    } else {
      var u = d.unitCount;
      var band = u >= 21 ? "21+ units" : u >= 5 ? "5–20 units" : u >= 3 ? "3–4 units" : u === 2 ? "Duplex (2)" : "";
      if (band) href += "&units=" + encodeURIComponent(band);
    }
    $("#ccHandoff").setAttribute("href", href);
  }

  /* ---------------- wiring ---------------- */
  $$(".cc-tab").forEach(function (b) {
    b.addEventListener("click", function () { buildType(b.dataset.type); });
  });

  $("#ccAdd").addEventListener("click", function () { addRow(TYPES[state.type], null); calc(); });

  rowsBox.addEventListener("click", function (e) {
    var x = e.target.closest(".cc-x");
    if (x && $$(".cc-row", rowsBox).length > 1) { x.closest(".cc-row").remove(); calc(); }
  });

  root.addEventListener("input", function (e) {
    if (e.target.id === "ccLoss") $("#ccLossOut").textContent = e.target.value + "%";
    if (e.target.id === "ccExp") $("#ccExpOut").textContent = e.target.value + "%";
    if (e.target.id === "ccCap") $("#ccCapOut").textContent = parseFloat(e.target.value).toFixed(1) + "%";
    calc();
  });
  root.addEventListener("change", calc);

  $("#ccDetailed").addEventListener("change", function (e) {
    state.detailed = e.target.checked;
    $("#ccSimpleBox").hidden = state.detailed;
    $("#ccDetailBox").hidden = !state.detailed;
    calc();
  });

  buildType("apt");

  // let a link choose the tab: cap-calculator.html?type=storage
  try {
    var want = new URLSearchParams(location.search).get("type");
    if (want && TYPES[want]) buildType(want);
  } catch (e) { /* ignore */ }
})();
