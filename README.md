# Forecast Plus — Multifamily Lead Funnel

A static lead-generation site for duplex and multifamily (2+ unit) buyers, sellers, and owners in Northern Indiana and Chicagoland. It's plain HTML, CSS, and JS with no build step, and it's ready for GitHub Pages.

## Pages

| Page | Purpose | `lead_type` sent |
|---|---|---|
| `index.html` | Home hub with four paths and a quick form | `general` |
| `buy.html` | Buyers of 2+ unit properties | `buyer` |
| `sell.html` | Owners who want to sell | `seller` |
| `value.html` | Free value and rent estimate (strongest owner magnet) | `valuation` |
| `house-hack.html` | Owner-occupant 2–4 unit buyers | `house-hack` |
| `thank-you.html` | Confirmation page, personalized by lead type | — |
| `privacy.html`, `terms.html` | Legal templates (**have an attorney review**) | — |

Every form also sends the page URL, a timestamp, the consent text the person agreed to, and any UTM, gclid, or fbclid values from the visit, so you can see which ads produce leads.

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

### Custom domain (optional)
In **Settings → Pages → Custom domain**, enter your domain. GitHub adds a `CNAME` file for you. At your DNS provider, point the domain to GitHub Pages. Then replace `https://www.example.com` in every page's `<head>`, in `sitemap.xml`, and in `robots.txt` with your real domain.

## 3. Before you run traffic

- [ ] Paste your Formspree endpoint (step 1).
- [x] Phone and email added to the footer.
- [ ] Add Google Analytics and/or Meta Pixel where you see `ANALYTICS:` in each page. Forms already fire `generate_lead` (GA4) and `Lead` (Meta) events when those scripts are present.
- [ ] Have an attorney review `privacy.html`, `terms.html`, and the consent checkbox wording (TCPA / texting rules), especially since leads are shared with partners.
- [ ] Make sure the agents and lenders you refer to are properly licensed. Referral fees in real estate are regulated (e.g., RESPA and state license law).

## Editing

- Colors and fonts: the `:root` block at the top of `assets/css/styles.css`.
- Copy: edit the HTML files directly. Header and footer are repeated on each page, so update each one.
