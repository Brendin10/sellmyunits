/* sellmyunits.com — site scripts
 * ------------------------------------------------------------
 * SETUP: paste your Formspree endpoint below (see README.md).
 * Until then, forms run in "demo mode" and just go to the thank-you page.
 */
const SITE_CONFIG = {
  formEndpoint: "https://formspree.io/f/xyezynnp",
};

(function () {
  "use strict";

  // Footer year
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // Mobile nav
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // Remember marketing source (UTM params) for the session
  const params = new URLSearchParams(location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"];
  try {
    utmKeys.forEach((k) => { if (params.get(k)) sessionStorage.setItem(k, params.get(k)); });
    if (!sessionStorage.getItem("landing_page")) sessionStorage.setItem("landing_page", location.pathname);
    if (!sessionStorage.getItem("referrer") && document.referrer) sessionStorage.setItem("referrer", document.referrer);
  } catch (e) { /* storage unavailable — fine */ }

  // Wire up all lead forms
  document.querySelectorAll("form.lead-form").forEach(initForm);

  function initForm(form) {
    const steps = Array.from(form.querySelectorAll(".form-step"));
    const scope = form.closest(".form-card") || form;
    const bars = Array.from(scope.querySelectorAll(".progress span"));
    const label = scope.querySelector(".step-label");
    const status = form.querySelector(".form-status");
    let current = 0;

    function show(i) {
      steps.forEach((s, idx) => s.classList.toggle("active", idx === i));
      bars.forEach((b, idx) => b.classList.toggle("on", idx <= i));
      if (label) label.textContent = `Step ${i + 1} of ${steps.length}`;
      current = i;
    }

    function fieldWrap(el) { return el.closest(".field") || el.closest(".consent"); }

    function validateStep(step) {
      let ok = true;
      let firstBad = null;
      // Radio groups marked required
      const groups = new Set();
      step.querySelectorAll("input[type=radio][required]").forEach((r) => groups.add(r.name));
      groups.forEach((name) => {
        const checked = step.querySelector(`input[name="${CSS.escape(name)}"]:checked`);
        const wrap = fieldWrap(step.querySelector(`input[name="${CSS.escape(name)}"]`));
        if (wrap) wrap.classList.toggle("invalid", !checked);
        if (!checked) { ok = false; firstBad = firstBad || step.querySelector(`input[name="${CSS.escape(name)}"]`); }
      });
      step.querySelectorAll("input:not([type=radio]), select, textarea").forEach((el) => {
        if (el.closest(".hp")) return;
        let valid = el.checkValidity();
        if (valid && el.type === "tel" && el.value.trim()) {
          valid = el.value.replace(/\D/g, "").length >= 10;
        }
        const wrap = fieldWrap(el);
        if (wrap) wrap.classList.toggle("invalid", !valid);
        if (!valid) { ok = false; firstBad = firstBad || el; }
      });
      if (firstBad) firstBad.focus();
      return ok;
    }

    form.addEventListener("click", (e) => {
      const next = e.target.closest("[data-next]");
      const back = e.target.closest("[data-back]");
      if (next) {
        e.preventDefault();
        if (validateStep(steps[current])) { show(Math.min(current + 1, steps.length - 1)); focusStep(); }
      } else if (back) {
        e.preventDefault();
        show(Math.max(current - 1, 0));
        focusStep();
      }
    });

    function focusStep() {
      const first = steps[current].querySelector("input, select, textarea");
      if (first) first.focus({ preventScroll: true });
      const card = form.closest(".form-card") || form;
      const top = card.getBoundingClientRect().top;
      if (top < 0) card.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Clear error state as the user fixes things
    form.addEventListener("input", (e) => {
      const wrap = fieldWrap(e.target);
      if (wrap && wrap.classList.contains("invalid")) {
        if (e.target.type === "radio" || e.target.checkValidity()) wrap.classList.remove("invalid");
      }
    });

    // Enter key advances instead of submitting early
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && current < steps.length - 1) {
        e.preventDefault();
        const btn = steps[current].querySelector("[data-next]");
        if (btn) btn.click();
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!validateStep(steps[current])) return;

      const data = new FormData(form);
      if (data.get("_gotcha")) return; // bot
      try {
        utmKeys.concat(["landing_page", "referrer"]).forEach((k) => {
          const v = sessionStorage.getItem(k);
          if (v) data.set(k, v);
        });
      } catch (err) { /* ignore */ }
      data.set("page", location.pathname);
      data.set("submitted_at", new Date().toISOString());
      data.set("consent_text", (form.querySelector(".consent span") || {}).textContent || "");

      const leadType = data.get("lead_type") || "general";
      const thanks = `thank-you.html?type=${encodeURIComponent(leadType)}`;
      const btn = form.querySelector("button[type=submit]");
      const endpoint = SITE_CONFIG.formEndpoint;

      if (!endpoint || endpoint.includes("YOUR_FORM_ID")) {
        console.warn("[sellmyunits.com] Demo mode: set SITE_CONFIG.formEndpoint in assets/js/main.js to receive leads.");
        console.table(Object.fromEntries(data.entries()));
        location.href = thanks + "&demo=1";
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
      if (status) { status.textContent = ""; status.classList.remove("err"); }
      try {
        const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Bad response " + res.status);
        if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { lead_type: leadType });
        if (typeof window.fbq === "function") window.fbq("track", "Lead", { content_category: leadType });
        location.href = thanks;
      } catch (err) {
        if (status) {
          status.textContent = "Something went wrong sending your info. Please try again in a moment.";
          status.classList.add("err");
        }
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "Submit"; }
      }
    });

    show(0);
  }

  // Thank-you page personalization
  const thanksMsg = document.querySelector("[data-thanks-msg]");
  if (thanksMsg) {
    const msgs = {
      buyer: "We're matching your criteria with a local professional who works 2–4 unit and apartment deals. Expect a call or text shortly.",
      seller: "A local multifamily specialist will reach out to talk through your building, your timeline, and your options.",
      valuation: "We're lining up a local pro to prepare your value and rent estimate. They may reach out with a few quick questions about the building.",
      calculator: "Thanks for sharing your numbers. A local multifamily pro will review them and reach out with a clearer picture of your building's value.",
      "house-hack": "A local pro who works with owner-occupant buyers will reach out to walk through financing options and the next steps.",
    };
    const t = params.get("type");
    if (msgs[t]) thanksMsg.textContent = msgs[t];
    if (params.get("demo")) {
      const d = document.querySelector("[data-demo-note]");
      if (d) d.hidden = false;
    }
  }
})();
