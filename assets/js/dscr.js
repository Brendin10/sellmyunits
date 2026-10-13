/* sellmyunits.com — The DSCR Calculator
 * ------------------------------------------------------------
 * Pure arithmetic, all of it in the browser. Nothing is sent anywhere
 * until the owner chooses to hand the numbers to the lead form.
 *
 * Two formulas, because lenders genuinely use two:
 *
 *   1-4 units (residential DSCR)   DSCR = gross monthly rent / PITIA
 *       No vacancy, no operating expenses. Principal, interest, taxes,
 *       insurance and association dues, that's it.
 *
 *   5+ units and commercial        DSCR = annual NOI / annual debt service
 *       Debt service is principal and interest only — taxes and insurance
 *       already came out of NOI, so counting them twice would be wrong.
 *
 * The seller-side question this answers: a financed buyer cannot pay more
 * than their lender will lend plus their down payment. Whichever constraint
 * binds first — the ratio or the LTV — is the ceiling on their offer.
 */
(function () {
  "use strict";

  var TYPES = {
    apt: {
      label: "Apartments",
      mode: "noi",
      incomeLabel: "Gross rent, all units",
      incomeHelp: "Everything the building would bill in a month if it were full.",
      incomeDefault: 4050,
      unitsLabel: "How many units",
      unitsDefault: 4,
      lossLabel: "Vacancy &amp; credit loss",
      lossHelp: "Rent you bill but never collect. Buyers underwrite a market rate, not the month you happen to be having.",
      lossDefault: 6, lossMin: 0, lossMax: 40, lossIsOccupancy: false,
      otherLabel: "Other income",
      otherHelp: "Laundry, parking, storage lockers, pet rent. Per month.",
      otherDefault: 0,
      expDefault: 40,
      expHelp: "Taxes, insurance, water and trash, repairs, management. Not the mortgage &mdash; that's the whole point of the ratio.",
      rateDefault: 7.0,
      amortDefault: 30,
      ltvDefault: 75,
      dscrDefault: 1.25,
      priceDefault: 360000,
      note: "Five units and up is commercial financing, so the lender works from NOI and compares it to principal and interest. Taxes and insurance are already inside NOI &mdash; don't count them twice.",
      ratioNote: "Most apartment lenders want 1.20&ndash;1.30. Below 1.20 you're usually looking at a bigger down payment rather than a no."
    },
    house: {
      label: "Rental houses",
      mode: "pitia",
      incomeLabel: "Gross rent, all houses",
      incomeHelp: "What the houses bill in a month. Lenders use the lower of the signed lease or the appraiser's market rent.",
      incomeDefault: 2600,
      unitsLabel: "How many houses",
      unitsDefault: 2,
      taxDefault: 2800,
      insDefault: 1600,
      hoaDefault: 0,
      rateDefault: 7.25,
      amortDefault: 30,
      ltvDefault: 80,
      dscrDefault: 1.20,
      priceDefault: 290000,
      note: "One to four units is residential DSCR, and it works differently: gross rent divided by PITIA &mdash; principal, interest, taxes, insurance and any association dues. No vacancy deduction, no operating expenses, no management fee.",
      ratioNote: "Common minimums run 1.10&ndash;1.25. Some programs will go to 1.00 or below with a bigger down payment and a higher rate."
    },
    storage: {
      label: "Self-storage",
      mode: "noi",
      incomeLabel: "Gross rent, all units",
      incomeHelp: "Every unit at its current rate, as if the place were full.",
      incomeDefault: 7400,
      unitsLabel: "How many units",
      unitsDefault: 65,
      lossLabel: "Physical occupancy",
      lossHelp: "The share of units actually rented right now. Storage is underwritten on occupancy, and a facility under about 80% gets treated as a turnaround.",
      lossDefault: 85, lossMin: 30, lossMax: 100, lossIsOccupancy: true,
      otherLabel: "Other income",
      otherHelp: "Late fees, tenant protection, locks and boxes, truck rental. Per month, and it counts here more than anywhere else.",
      otherDefault: 400,
      expDefault: 32,
      expHelp: "Lower than apartments &mdash; no plumbing in the units and almost nothing to make ready between tenants.",
      rateDefault: 7.25,
      amortDefault: 25,
      ltvDefault: 75,
      dscrDefault: 1.30,
      priceDefault: 620000,
      note: "Storage is commercial, so it's NOI over debt service. Amortisation often runs 25 years instead of 30, which raises the payment and pulls the ratio down &mdash; worth checking before you assume a 30-year schedule.",
      ratioNote: "Storage lenders usually want 1.25&ndash;1.35, a little above apartments, because occupancy can move fast."
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

  /* monthly payment on a loan, and the loan a payment will carry */
  function pmt(loan, ratePct, years) {
    var i = ratePct / 100 / 12, n = years * 12;
    if (loan <= 0 || n <= 0) return 0;
    if (i <= 0) return loan / n;
    return loan * i / (1 - Math.pow(1 + i, -n));
  }
  function loanFor(payment, ratePct, years) {
    var i = ratePct / 100 / 12, n = years * 12;
    if (payment <= 0 || n <= 0) return 0;
    if (i <= 0) return payment * n;
    return payment * (1 - Math.pow(1 + i, -n)) / i;
  }

  var root = $("#dscrcalc");
  if (!root) return;

  var state = { type: "apt" };

  function buildType(key) {
    var cfg = TYPES[key];
    state.type = key;

    $$(".cc-tab").forEach(function (b) {
      var on = b.dataset.type === key;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", String(on));
    });

    var isPitia = cfg.mode === "pitia";
    $("#dsNoiBox").hidden = isPitia;
    $("#dsPitiaBox").hidden = !isPitia;
    $("#dsFormula").innerHTML = isPitia
      ? "DSCR = gross rent &divide; <abbr title=\"Principal, interest, taxes, insurance, association dues\">PITIA</abbr>"
      : "DSCR = NOI &divide; debt service";

    $("#dsIncomeLabel").innerHTML = cfg.incomeLabel;
    $("#dsIncomeHelp").innerHTML = cfg.incomeHelp;
    $("#dsIncome").value = cfg.incomeDefault;
    $("#dsUnitsLabel").innerHTML = cfg.unitsLabel;
    $("#dsUnits").value = cfg.unitsDefault;

    if (!isPitia) {
      $("#dsLossLabel").innerHTML = cfg.lossLabel;
      $("#dsLossHelp").innerHTML = cfg.lossHelp;
      var loss = $("#dsLoss");
      loss.min = cfg.lossMin; loss.max = cfg.lossMax;   // bounds before value, or it clamps
      loss.value = cfg.lossDefault;
      $("#dsLossOut").textContent = cfg.lossDefault + "%";
      $("#dsOtherLabel").innerHTML = cfg.otherLabel;
      $("#dsOtherHelp").innerHTML = cfg.otherHelp;
      $("#dsOther").value = cfg.otherDefault || "";
      $("#dsExp").value = cfg.expDefault;
      $("#dsExpOut").textContent = cfg.expDefault + "%";
      $("#dsExpHelp").innerHTML = cfg.expHelp;
    } else {
      $("#dsTax").value = cfg.taxDefault;
      $("#dsIns").value = cfg.insDefault;
      $("#dsHoa").value = cfg.hoaDefault || "";
    }

    $("#dsPrice").value = cfg.priceDefault;
    $("#dsRate").value = cfg.rateDefault;
    $("#dsRateOut").textContent = cfg.rateDefault.toFixed(2) + "%";
    $("#dsAmort").value = String(cfg.amortDefault);
    $("#dsLtv").value = cfg.ltvDefault;
    $("#dsLtvOut").textContent = cfg.ltvDefault + "%";
    $("#dsMin").value = cfg.dscrDefault;
    $("#dsMinOut").textContent = cfg.dscrDefault.toFixed(2);
    $("#dsRatioNote").innerHTML = cfg.ratioNote;
    $("#dsTypeNote").innerHTML = cfg.note;

    calc();
  }

  /* ---------------- math ---------------- */
  function read() {
    var cfg = TYPES[state.type];
    var isPitia = cfg.mode === "pitia";

    var rentMonthly = num($("#dsIncome").value);
    var gpr = rentMonthly * 12;
    var units = num($("#dsUnits").value);

    var price = num($("#dsPrice").value);
    var rate = num($("#dsRate").value);
    var amort = num($("#dsAmort").value) || 30;
    var ltv = num($("#dsLtv").value);
    var minDscr = num($("#dsMin").value) || 1;

    var d = {
      cfg: cfg, isPitia: isPitia, rentMonthly: rentMonthly, gpr: gpr, units: units,
      price: price, rate: rate, amort: amort, ltv: ltv, minDscr: minDscr
    };

    if (isPitia) {
      d.tax = num($("#dsTax").value);
      d.ins = num($("#dsIns").value);
      d.hoa = num($("#dsHoa").value) * 12;
      d.escrowMonthly = (d.tax + d.ins + d.hoa) / 12;
      d.qualifyingIncomeMonthly = rentMonthly;          // gross rent, no deductions
      d.noi = 0;
    } else {
      var lossPct = num($("#dsLoss").value);
      d.lossPct = lossPct;
      d.collected = cfg.lossIsOccupancy ? gpr * (lossPct / 100) : gpr * (1 - lossPct / 100);
      d.other = num($("#dsOther").value) * 12;
      d.egi = d.collected + d.other;
      d.expPct = num($("#dsExp").value);
      d.opex = d.egi * (d.expPct / 100);
      d.noi = d.egi - d.opex;
      d.escrowMonthly = 0;
      d.qualifyingIncomeMonthly = d.noi / 12;           // NOI, already net of taxes & insurance
    }

    /* the loan they're actually contemplating */
    d.loan = price * (ltv / 100);
    d.down = price - d.loan;
    d.piMonthly = pmt(d.loan, rate, amort);
    d.housingMonthly = d.piMonthly + d.escrowMonthly;   // PITIA for residential, P&I for commercial
    d.dscr = d.housingMonthly > 0 ? d.qualifyingIncomeMonthly / d.housingMonthly : 0;
    d.passes = d.dscr >= minDscr;

    /* biggest loan the ratio allows */
    var maxHousing = d.qualifyingIncomeMonthly / minDscr;
    var maxPI = maxHousing - d.escrowMonthly;           // escrow is 0 on the commercial side
    d.maxLoanRatio = maxPI > 0 ? loanFor(maxPI, rate, amort) : 0;

    /* biggest loan the LTV allows on this price */
    d.maxLoanLtv = price * (ltv / 100);

    d.maxLoan = Math.min(d.maxLoanRatio, d.maxLoanLtv);
    d.bound = d.maxLoanRatio <= d.maxLoanLtv ? "ratio" : "ltv";

    /* the seller-side number: what a financed buyer can pay.
       Their loan is capped by the ratio; the rest is their own cash at this LTV.
       Round the price first and derive the other two from it, so the three
       figures on screen actually add up. */
    d.maxPrice = ltv > 0 ? d.maxLoanRatio / (ltv / 100) : 0;
    d.maxPriceR = roundK(d.maxPrice);
    d.maxLoanRatioR = roundK(d.maxLoanRatio);
    d.maxPriceDownR = d.maxPriceR - d.maxLoanRatioR;

    return d;
  }

  function calc() {
    var d = read();
    var out = $("#dsOut");
    var haveIncome = d.qualifyingIncomeMonthly > 0;

    if (!haveIncome || d.price <= 0) {
      out.classList.add("empty");
      $("#dsRatio").textContent = "—";
      $("#dsVerdict").textContent = "";
      $("#dsVerdict").className = "ds-verdict";
      $("#dsMaxPrice").textContent = d.price <= 0 ? "Add a price" : "Add the income";
      $("#dsMaxNote").textContent = "";
      $("#dsStats").innerHTML = "";
      $("#dsBreak").innerHTML = "";
      $("#dsBound").hidden = true;
      $("#dsHandoff").setAttribute("aria-disabled", "true");
      return;
    }
    out.classList.remove("empty");
    $("#dsHandoff").removeAttribute("aria-disabled");

    /* the ratio and the verdict */
    $("#dsRatio").textContent = d.dscr.toFixed(2);
    var v = $("#dsVerdict");
    if (d.dscr >= d.minDscr) {
      v.textContent = "Clears " + d.minDscr.toFixed(2);
      v.className = "ds-verdict pass";
    } else if (d.dscr >= 1) {
      v.textContent = "Covers the payment, under " + d.minDscr.toFixed(2);
      v.className = "ds-verdict warn";
    } else {
      v.textContent = "Doesn't cover the payment";
      v.className = "ds-verdict fail";
    }

    /* the seller-side headline */
    if (d.maxLoanRatio > 0) {
      $("#dsMaxPrice").textContent = money(d.maxPriceR);
      $("#dsMaxNote").textContent =
        money(d.maxLoanRatioR) + " loan + " + money(d.maxPriceDownR) + " down, at " + d.ltv + "% LTV";
    } else {
      $("#dsMaxPrice").textContent = "Nothing, on these numbers";
      $("#dsMaxNote").textContent = d.isPitia
        ? "Taxes and insurance alone use up the rent at a " + d.minDscr.toFixed(2) + " ratio."
        : "There's no NOI left to cover a payment.";
    }

    /* which constraint binds */
    var b = $("#dsBound");
    b.hidden = false;
    if (d.maxLoanRatio <= 0) {
      b.hidden = true;
    } else if (d.bound === "ratio") {
      b.className = "ds-bound ratio";
      b.innerHTML = "<small>WHAT'S LIMITING THE LOAN</small><b>The ratio, not the down payment</b>" +
        "<span>The " + d.minDscr.toFixed(2) + " minimum caps the loan at " + short(roundK(d.maxLoanRatio)) +
        ". The " + d.ltv + "% LTV would have allowed " + short(roundK(d.maxLoanLtv)) + ".</span>";
    } else {
      b.className = "ds-bound ltv";
      b.innerHTML = "<small>WHAT'S LIMITING THE LOAN</small><b>The down payment, not the income</b>" +
        "<span>The income would carry " + short(roundK(d.maxLoanRatio)) + ". The " + d.ltv +
        "% LTV caps it at " + short(roundK(d.maxLoanLtv)) + ".</span>";
    }

    /* stat tiles */
    var stats = [];
    stats.push("<div><b>" + money(Math.round(d.housingMonthly)) + "</b><span>" + (d.isPitia ? "PITIA / mo" : "P&amp;I / mo") + "</span></div>");
    stats.push("<div><b>" + money(roundK(d.down)) + "</b><span>down at " + d.ltv + "%</span></div>");
    if (d.units > 0) {
      stats.push("<div><b>" + short(roundK(d.maxPriceR / d.units)) + "</b><span>per " + (state.type === "house" ? "house" : "unit") + "</span></div>");
    }
    $("#dsStats").innerHTML = stats.join("");

    /* the arithmetic, line by line */
    var rows;
    if (d.isPitia) {
      rows = [
        { label: "Gross rent", val: d.rentMonthly, kind: "" },
        { label: "Principal &amp; interest", val: -d.piMonthly, kind: "neg" },
        { label: "Property taxes", val: -(d.tax / 12), kind: "neg" },
        { label: "Insurance", val: -(d.ins / 12), kind: "neg" },
        d.hoa ? { label: "Association dues", val: -(d.hoa / 12), kind: "neg" } : null,
        { label: "PITIA", val: d.housingMonthly, kind: "sub" },
        { label: "Left over each month", val: d.rentMonthly - d.housingMonthly, kind: "tot" }
      ];
    } else {
      rows = [
        { label: "Gross potential rent", val: d.gpr / 12, kind: "" },
        (d.gpr - d.collected) ? { label: (d.cfg.lossIsOccupancy ? "Empty units (" + (100 - d.lossPct) + "% vacant)" : "Vacancy &amp; credit loss (" + d.lossPct + "%)"), val: -(d.gpr - d.collected) / 12, kind: "neg" } : null,
        d.other ? { label: "Other income", val: d.other / 12, kind: "" } : null,
        { label: "Operating expenses (" + d.expPct + "%)", val: -d.opex / 12, kind: "neg" },
        { label: "Net operating income", val: d.noi / 12, kind: "sub" },
        { label: "Debt service", val: -d.piMonthly, kind: "neg" },
        { label: "Cash flow after the loan", val: (d.noi / 12) - d.piMonthly, kind: "tot" }
      ];
    }
    $("#dsBreak").innerHTML = rows.filter(Boolean).map(function (r) {
      return '<div class="cc-b ' + r.kind + '"><span>' + r.label + "</span><b>" +
        (r.val < 0 ? "−" + money(Math.abs(r.val)) : money(r.val)) + "</b></div>";
    }).join("");

    stash(d);
  }

  /* ---------------- hand-off ---------------- */
  function stash(d) {
    var income = d.isPitia
      ? ["Gross rent: " + money(d.rentMonthly) + "/mo",
         "Taxes: " + money(d.tax) + "/yr",
         "Insurance: " + money(d.ins) + "/yr",
         d.hoa ? "Association dues: " + money(d.hoa) + "/yr" : ""]
      : [(d.cfg.lossIsOccupancy ? "Occupancy: " : "Vacancy: ") + d.lossPct + "%",
         d.other ? "Other income: " + money(d.other) + "/yr" : "",
         "Operating expenses: " + d.expPct + "%",
         "NOI: " + money(d.noi) + "/yr"];

    var summary = ["Tool: DSCR Calculator",
      "Property type: " + d.cfg.label,
      d.units ? "Count: " + d.units + (state.type === "house" ? " houses" : " units") : "",
      "Gross potential rent: " + money(d.gpr) + "/yr"]
      .concat(income)
      .concat([
        "Formula used: " + (d.isPitia ? "gross rent / PITIA (1-4 unit residential)" : "NOI / debt service (commercial)"),
        "Price modelled: " + money(d.price),
        "Terms: " + d.rate + "% over " + d.amort + " years, " + d.ltv + "% LTV",
        (d.isPitia ? "PITIA: " : "Debt service: ") + money(d.housingMonthly) + "/mo",
        "DSCR at that price: " + d.dscr.toFixed(2) + " (lender minimum used: " + d.minDscr.toFixed(2) + ")",
        "Max loan the ratio supports: " + money(d.maxLoanRatioR),
        "Max price a financed buyer supports: " + money(d.maxPriceR),
        "Binding constraint: " + (d.bound === "ratio" ? "the DSCR minimum" : "the LTV / down payment")
      ]).filter(Boolean).join("\n");

    try {
      sessionStorage.setItem("calc_type", d.cfg.label + " (DSCR)");
      sessionStorage.setItem("calc_noi", d.isPitia ? money(d.rentMonthly * 12) + "/yr gross" : money(d.noi) + "/yr");
      sessionStorage.setItem("calc_estimate", money(d.maxPriceR));
      sessionStorage.setItem("calc_summary", summary);
    } catch (e) { /* storage unavailable — the link still works */ }

    var href = "value.html";
    if (state.type === "storage") {
      href += "?units=" + encodeURIComponent("Self-storage facility");
    } else if (state.type === "house") {
      href += d.units > 1 ? "?units=" + encodeURIComponent("Several rental houses") : "";
    } else {
      var u = d.units;
      var band = u >= 21 ? "21+ units" : u >= 5 ? "5–20 units" : u >= 3 ? "3–4 units" : u === 2 ? "Duplex (2)" : "";
      if (band) href += "?units=" + encodeURIComponent(band);
    }
    $("#dsHandoff").setAttribute("href", href);
  }

  /* ---------------- wiring ---------------- */
  $$(".cc-tab").forEach(function (b) {
    b.addEventListener("click", function () { buildType(b.dataset.type); });
  });

  root.addEventListener("input", function (e) {
    if (e.target.id === "dsLoss") $("#dsLossOut").textContent = e.target.value + "%";
    if (e.target.id === "dsExp") $("#dsExpOut").textContent = e.target.value + "%";
    if (e.target.id === "dsRate") $("#dsRateOut").textContent = parseFloat(e.target.value).toFixed(2) + "%";
    if (e.target.id === "dsLtv") $("#dsLtvOut").textContent = e.target.value + "%";
    if (e.target.id === "dsMin") $("#dsMinOut").textContent = parseFloat(e.target.value).toFixed(2);
    calc();
  });
  root.addEventListener("change", calc);

  buildType("apt");

  // let a link choose the tab: dscr-calculator.html?type=storage
  try {
    var want = new URLSearchParams(location.search).get("type");
    if (want && TYPES[want]) buildType(want);
  } catch (e) { /* ignore */ }
})();
