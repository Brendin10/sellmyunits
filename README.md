# sellmyunits.com — Multifamily Lead Funnel

A static lead-generation site for duplex and multifamily (2+ unit) buyers, sellers, and owners in Indiana, Michigan, and Wisconsin. It's plain HTML, CSS, and JS with no build step, and it's ready for GitHub Pages.

## Pages

| Page | Purpose | `lead_type` sent |
|---|---|---|
| `index.html` | Home hub with four paths and a quick form | `general` |
| `buy.html` | Buyers of 2+ unit properties | `buyer` |
| `sell.html` | Owners selling one building, several houses, or a portfolio | `seller` |
| `value.html` | Free value and rent estimate (strongest owner magnet) | `valuation` |
| `cap-calculator.html` | The Cap Calculator — NOI, value and cap rate, by property type | — (hands off to `sell.html`) |
| `dscr-calculator.html` | The DSCR Calculator — debt coverage and what a financed buyer can pay | — (hands off to `value.html`) |
| `clear-my-units.html` | Cleanout and junk removal requests | `cleanout` |
| `thank-you.html` | Confirmation page, personalized by lead type | — |
| `privacy.html`, `terms.html` | Legal templates (**have an attorney review**) | — |

Every form also sends the page URL, a timestamp, the consent text the person agreed to, and any UTM, gclid, or fbclid values from the visit, so you can see which ads produce leads.

## The calculators

Two free tools, both pure client-side arithmetic — nothing is sent anywhere until the visitor
clicks through to a form. Both live behind the single **Calculators** nav item and cross-link
to each other with the `.tool-switch` control.

| File | Script | What it answers |
|---|---|---|
| `cap-calculator.html` | `assets/js/calc.js` | What's the NOI, and what's it worth at a given cap rate? |
| `dscr-calculator.html` | `assets/js/dscr.js` | Does it clear the lender's ratio, and what can a financed buyer pay? |

Each script holds a `TYPES` object with one entry per tab (`apt`, `house`, `storage`). Changing a
default — a starting rate, an expense ratio, a minimum DSCR — means editing that object and nothing
else. A link can preselect a tab: `dscr-calculator.html?type=storage`.

**The DSCR calculator deliberately uses two different formulas**, because lenders do:

- **1–4 units** (the *Rental houses* tab) — `gross rent ÷ PITIA`. No vacancy, no operating
  expenses. Principal, interest, taxes, insurance and association dues.
- **5+ units and commercial** (*Apartments*, *Self-storage*) — `NOI ÷ annual debt service`, where
  debt service is principal and interest only. Taxes and insurance already came out inside NOI, so
  counting them again in the payment would double-count them.

Both tools write a plain-text summary into `sessionStorage` (`calc_type`, `calc_noi`,
`calc_estimate`, `calc_summary`), and `main.js` attaches those four keys to whatever lead form the
visitor submits next. That's how the numbers reach your inbox without the visitor retyping them.

The DSCR page carries its own disclaimer stating that sellmyunits.com is not a lender or broker and
does not originate, arrange or refer loans. Leave that in.

## 1. Connect the forms (Formspree)

1. Create a free account at https://formspree.io and create a new form.
2. Copy its endpoint (it looks like `https://formspree.io/f/abcdwxyz`).
3. Open `assets/js/main.js` and replace `https://formspree.io/f/YOUR_FORM_ID` with your endpoint.
4. Commit and push. Until you do this, forms run in **demo mode**: they skip sending and show a yellow note on the thank-you page.

## 2. Publish on GitHub Pages

From this folder, after creating an **empty** repo on GitHub (no README):

```bash
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then on GitHub, go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch** and **Branch: `main` / root**, and save. The site goes live at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

### Custom domain
The site uses www.sellmyunits.com. See the custom domain section below.

## Custom domain: www.sellmyunits.com
The `CNAME` file tells GitHub Pages to serve the site at **www.sellmyunits.com**. The bare sellmyunits.com redirects to it automatically once the DNS records below are in place.

DNS records at Domain.com:

| Type | Host | Points to |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | brendin10.github.io |

## 3. Before you run traffic

- [ ] Paste your Formspree endpoint (step 1).
- [x] Phone and email added to the footer.
- [ ] Add Google Analytics and/or Meta Pixel where you see `ANALYTICS:` in each page. Forms already fire `generate_lead` (GA4) and `Lead` (Meta) events when those scripts are present.
- [ ] Have an attorney review `privacy.html`, `terms.html`, and the consent checkbox wording (TCPA / texting rules), especially since leads are shared with partners.
- [ ] Make sure the agents and lenders you refer to are properly licensed. Referral fees in real estate are regulated (e.g., RESPA and state license law).

## Editing

- Colors and fonts: the `:root` block at the top of `assets/css/styles.css`.
- Copy: edit the HTML files directly. Header and footer are repeated on each page, so update each one.
