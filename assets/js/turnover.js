/* sellmyunits.com — Unit Turnovers popup
 * ------------------------------------------------------------
 * Injects the "What is a unit turnover?" dialog on every page and wires it to
 * any link marked data-turnover (the header nav item).
 *
 * Progressive enhancement: those links point at unit-turnovers.html, so with
 * JS off or broken the nav still works — it just loads the real page instead.
 *
 * Two views live inside one dialog:
 *   1. "about"  — what a turnover is, and the three levels
 *   2. "scope"  — the Layered Turnover scope builder (opened from level 3)
 * Selections in the builder are stashed in sessionStorage as turnover_scope and
 * picked up by the quote form on unit-turnovers.html (see main.js).
 */
(function () {
  "use strict";

  var PAGE = "unit-turnovers.html";

  /* The scope builder's checklist. Edit here and both the popup and the
     summary that reaches your inbox update together. */
  var SCOPE = [
    ["Inside the unit", [
      "Haul out what's left behind", "Deep clean", "Walls patched and painted",
      "Ceilings", "Carpet", "Vinyl plank / laminate", "Hardwood refinish", "Tile",
      "Interior doors and trim", "Closet doors and shelving", "Light fixtures",
      "Ceiling fans", "Switches and outlets", "Blinds and window coverings",
      "Smoke and CO detectors", "Locks and rekey"
    ]],
    ["Kitchen and bath", [
      "Kitchen cabinets", "Countertops", "Kitchen sink and faucet", "Appliances",
      "Bathroom vanity", "Tub, shower or surround", "Toilet", "Bathroom fan"
    ]],
    ["Systems", [
      "Furnace or heating", "Air conditioning", "Water heater", "Plumbing repairs",
      "Electrical panel or circuits", "Ductwork and vents"
    ]],
    ["Windows and doors", [
      "Windows", "Exterior doors", "Storm doors", "Screens"
    ]],
    ["Outside the building", [
      "Siding", "Roof", "Gutters and downspouts", "Soffit and fascia",
      "Exterior paint", "Porch, steps or railings", "Decks", "Foundation or masonry"
    ]],
    ["Grounds", [
      "Landscaping", "Lawn and overgrowth clearing", "Tree and brush removal",
      "Fencing", "Driveway or parking", "Walkways", "Exterior lighting",
      "Trash enclosure"
    ]]
  ];

  var LEVELS = [
    {
      n: "1", name: "Clear &amp; Clean", tag: "The unit is empty and earning",
      body: "We empty it out and haul it away &mdash; furniture, appliances, mattresses, the garage, whatever they left. Then a deep clean top to bottom, smoke and CO detectors checked and replaced where they're dead or past date, and the locks rekeyed.",
      list: ["Haul-out and disposal", "Deep clean", "Smoke &amp; CO detectors", "Rekey"]
    },
    {
      n: "2", name: "Paint &amp; Refresh", tag: "Everything in 1, plus it shows well",
      body: "Everything above, and then the unit stops looking like somebody else's home. Walls patched and painted, the small broken things fixed, tired fixtures and hardware swapped out.",
      list: ["Patch &amp; paint", "Fixtures and hardware", "Blinds and plates", "Minor repairs"]
    },
    {
      n: "3", name: "Layered Turnover", tag: "Everything in 2, plus the real work",
      body: "For the unit &mdash; or the building &mdash; that needs more than paint. Flooring, kitchen and bath, siding, roof, landscaping: you tell us what's on the list and we scope the whole thing as one job instead of four trades and four schedules.",
      list: ["Flooring", "Kitchen &amp; bath", "Siding and roof", "Grounds and landscaping"],
      cta: true
    }
  ];

  var dlg, lastFocus, built = false;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  function build() {
    if (built) return;
    built = true;

    var levels = LEVELS.map(function (l) {
      return '<div class="tlevel' + (l.cta ? ' is-deep' : '') + '">' +
        '<div class="tlevel-n">' + l.n + '</div>' +
        '<div class="tlevel-b">' +
          '<h4>' + l.name + ' <span>' + l.tag + '</span></h4>' +
          '<p>' + l.body + '</p>' +
          '<ul>' + l.list.map(function (i) { return "<li>" + i + "</li>"; }).join("") + '</ul>' +
          (l.cta ? '<button type="button" class="btn btn-primary btn-sm" data-tv="scope">Build your scope &rarr;</button>' : "") +
        '</div></div>';
    }).join("");

    var groups = SCOPE.map(function (g, gi) {
      return '<fieldset class="tgroup"><legend>' + esc(g[0]) + "</legend><div class=\"tgrid\">" +
        g[1].map(function (item, ii) {
          var id = "tsc-" + gi + "-" + ii;
          return '<label class="toption"><input type="checkbox" id="' + id + '" value="' + esc(item) + '"><span>' + esc(item) + "</span></label>";
        }).join("") + "</div></fieldset>";
    }).join("");

    dlg = document.createElement("div");
    dlg.className = "tmodal";
    dlg.hidden = true;
    dlg.innerHTML =
      '<div class="tmodal-back" data-tclose></div>' +
      '<div class="tmodal-box" role="dialog" aria-modal="true" aria-labelledby="tmodal-h">' +
        '<button type="button" class="tmodal-x" data-tclose aria-label="Close">&times;</button>' +

        '<div class="tview" data-view="about">' +
          '<div class="tmodal-head">' +
            '<span class="eyebrow">Unit turnovers &middot; IN &middot; MI &middot; WI</span>' +
            '<h2 id="tmodal-h">What is a unit turnover?</h2>' +
            '<p class="lede">It\'s everything between one tenant handing back the keys and the next one signing a lease.</p>' +
          '</div>' +
          '<div class="tmodal-body">' +
            '<p>Sometimes that\'s a broom, a coat of paint and a weekend. Sometimes the last tenant packed what they wanted and walked out on the rest &mdash; furniture still in the rooms, food in the fridge, a garage you haven\'t opened yet.</p>' +
            '<p><strong>Either way the unit isn\'t earning a dollar until it\'s ready</strong>, and most of what stands between you and a new lease isn\'t one trade. It\'s a haul-out, a clean, a painter, a floor guy and somebody to check the detectors &mdash; each with their own schedule.</p>' +
            '<p class="tnote">We do the whole stretch. Our own crew, one point of contact, one quote &mdash; from the day they leave to the day it\'s ready to show.</p>' +
            '<h3 class="tlevels-h">Three levels, depending on what it needs</h3>' +
            '<div class="tlevels">' + levels + '</div>' +
            '<div class="tfacts">' +
              '<div><strong>Our own crew</strong><span>Not a referral. For a rush date we may bring in a vetted partner crew &mdash; and we say so when we quote it.</span></div>' +
              '<div><strong>Priced per job</strong><span>Size, condition, access and scope decide it. Photos get you a real number instead of a range.</span></div>' +
              '<div><strong>One unit or the whole building</strong><span>Single turnovers, several at once, or a building you just took over.</span></div>' +
            '</div>' +
          '</div>' +
          '<div class="tmodal-foot">' +
            '<a class="btn btn-primary" href="' + PAGE + '#form" data-tgo>Get a turnover quote</a>' +
            '<a class="btn btn-ghost" href="' + PAGE + '">Full details &rarr;</a>' +
            '<span class="tphone">or call <a href="tel:+15747809499">(574) 780-9499</a></span>' +
          '</div>' +
        '</div>' +

        '<div class="tview" data-view="scope" hidden>' +
          '<div class="tmodal-head">' +
            '<button type="button" class="tback" data-tv="about">&larr; Back to the three levels</button>' +
            '<span class="eyebrow">Layered Turnover</span>' +
            '<h2>Build your scope</h2>' +
            '<p class="lede">Tick anything that needs doing &mdash; inside the unit, the building, or the grounds. Nothing here commits you to it.</p>' +
          '</div>' +
          '<div class="tmodal-body">' + groups +
            '<div class="field"><label for="tsc-notes">Anything not on the list?</label>' +
            '<textarea id="tsc-notes" rows="3" placeholder="A detached garage, a unit that flooded, a tree over the driveway&hellip;"></textarea></div>' +
          '</div>' +
          '<div class="tmodal-foot">' +
            '<span class="tcount" role="status" aria-live="polite">Nothing selected yet</span>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-tclear>Clear all</button>' +
            '<a class="btn btn-primary" href="' + PAGE + '#form" data-tsend>Send this scope &rarr;</a>' +
          '</div>' +
        '</div>' +

      '</div>';
    document.body.appendChild(dlg);

    dlg.addEventListener("click", onClick);
    dlg.addEventListener("change", function (e) { if (e.target.type === "checkbox") count(); });
    dlg.addEventListener("keydown", onKey);
  }

  function picked() {
    return Array.prototype.slice.call(dlg.querySelectorAll('.tgroup input:checked')).map(function (c) { return c.value; });
  }

  function count() {
    var n = picked().length;
    var el = dlg.querySelector(".tcount");
    el.textContent = n === 0 ? "Nothing selected yet" : n + (n === 1 ? " item selected" : " items selected");
    el.classList.toggle("on", n > 0);
  }

  function summary() {
    var out = [];
    SCOPE.forEach(function (g, gi) {
      var hits = Array.prototype.slice.call(dlg.querySelectorAll('.tgroup')[gi].querySelectorAll("input:checked")).map(function (c) { return c.value; });
      if (hits.length) out.push(g[0] + ": " + hits.join(", "));
    });
    var notes = (dlg.querySelector("#tsc-notes").value || "").trim();
    if (notes) out.push("Also: " + notes);
    return out.join("\n");
  }

  function onClick(e) {
    if (e.target.closest("[data-tclose]")) { e.preventDefault(); close(); return; }

    var sw = e.target.closest("[data-tv]");
    if (sw) { e.preventDefault(); view(sw.getAttribute("data-tv")); return; }

    if (e.target.closest("[data-tclear]")) {
      e.preventDefault();
      dlg.querySelectorAll(".tgroup input:checked").forEach(function (c) { c.checked = false; });
      dlg.querySelector("#tsc-notes").value = "";
      count();
      return;
    }

    if (e.target.closest("[data-tsend]")) {
      var text = summary();
      try { sessionStorage.setItem("turnover_scope", text); } catch (err) { /* ignore */ }
      /* Already on the turnover page? A same-page hash link doesn't reload, so
         render the carry-over here instead of waiting for a page load. */
      if (turnoverForm()) {
        e.preventDefault();
        close();
        carry();
        var f = document.getElementById("form");
        if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  /* The quote form on this page, if there is one */
  function turnoverForm() {
    var f = document.querySelector("#form .lead-form");
    if (!f) return null;
    var t = f.querySelector('[name="lead_type"]');
    return t && t.value === "turnover" ? f : null;
  }

  /* Show the scope the visitor built, above the form, with a way to drop it */
  function carry() {
    var form = turnoverForm();
    if (!form) return;
    var text = "";
    try { text = sessionStorage.getItem("turnover_scope") || ""; } catch (e) { return; }

    var box = document.querySelector(".scope-carry");
    if (!text) { if (box) box.remove(); return; }
    if (!box) {
      box = document.createElement("div");
      box.className = "scope-carry";
      box.innerHTML = "<strong>Your scope came through \u2014 it\u2019s attached to this request.</strong>" +
        "<pre></pre><button type=\"button\">Clear it and start over</button>";
      box.querySelector("button").addEventListener("click", function () {
        try { sessionStorage.removeItem("turnover_scope"); } catch (e) { /* ignore */ }
        box.remove();
      });
      form.parentNode.insertBefore(box, form);
    }
    box.querySelector("pre").textContent = text;
  }

  function view(name) {
    dlg.querySelectorAll(".tview").forEach(function (v) { v.hidden = v.getAttribute("data-view") !== name; });
    var box = dlg.querySelector(".tmodal-box");
    box.scrollTop = 0;
    var body = dlg.querySelector('.tview:not([hidden]) .tmodal-body');
    if (body) body.scrollTop = 0;
    var h = dlg.querySelector('.tview:not([hidden]) h2');
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    if (name === "scope") count();
  }

  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key !== "Tab") return;
    var f = dlg.querySelectorAll('a[href], button:not([disabled]), input, textarea, [tabindex="-1"]');
    var vis = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null && el.getAttribute("tabindex") !== "-1"; });
    if (!vis.length) return;
    var first = vis[0], last = vis[vis.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open(startView) {
    build();
    lastFocus = document.activeElement;
    dlg.hidden = false;
    document.body.classList.add("tmodal-open");
    view(startView || "about");
  }

  function close() {
    if (!dlg || dlg.hidden) return;
    dlg.hidden = true;
    document.body.classList.remove("tmodal-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-turnover]");
    if (!t) return;
    e.preventDefault();
    open(t.getAttribute("data-turnover") === "scope" ? "scope" : "about");
    var nav = document.querySelector(".nav-links.open");
    if (nav) {
      nav.classList.remove("open");
      var tog = document.querySelector(".nav-toggle");
      if (tog) tog.setAttribute("aria-expanded", "false");
    }
  });

  carry();

  window.openTurnover = open;
})();
