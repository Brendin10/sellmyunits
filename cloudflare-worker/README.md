# Nearby listings lookup (Cloudflare Worker)

The calculator's "Find listings near my address" button calls this small Worker. The Worker holds your RentCast API key so it never appears on the public website.

## One-time setup (about 15 minutes)

1. **RentCast:** sign up at https://app.rentcast.io/app/api and create an API key. The free plan includes 50 requests a month; after that it's $0.20 per request unless you upgrade.
2. **Cloudflare:** create a free account at https://dash.cloudflare.com, then go to **Workers & Pages → Create → Worker**. Name it `sellmyunits-listings` and click **Deploy**.
3. Click **Edit code**, delete the sample code, paste in everything from `worker.js`, and click **Deploy**.
4. Go to **Settings → Variables and Secrets** and add:
   - `RENTCAST_API_KEY`: type **Secret**, value = your RentCast key
   - `ALLOWED_ORIGINS`: type **Text**, value = `https://www.sellmyunits.com,https://sellmyunits.com`
5. Copy the Worker's address (it looks like `https://sellmyunits-listings.YOUR-NAME.workers.dev`).
6. In the website folder, open `assets/js/calculator.js` and paste that address into `const LISTINGS_API = "";` at the top. Commit and push.

## Keeping costs in check
- Each new address uses 1 RentCast request, or 2 when the first 0.5-mile search finds fewer than 3 listings. Repeat searches for the same address within 24 hours are free (cached).
- In RentCast, restrict the key to the **Sale Listings** endpoint only.
- Check your usage in the RentCast dashboard weekly while the ads are running.
