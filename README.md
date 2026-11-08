# TOSS Inc. — website

Plain HTML, CSS, and a little vanilla JS. No build step. Open `index.html` in a browser and it works.

## Structure

```
index.html               Home page — hero, mission, donate + progress
about.html                About page — story, LSU partnership, founders
css/styles.css            All styles (design tokens at the top)
js/main.js                Mobile menu, header scroll border, footer year, donation progress
1.png                      TOSS Inc. logo (used in the hero)
images/mardi-gras/         Pensacola Mardi Gras photos (see credits below)
```

## Updating the donation progress bar

Click **admin** at the very bottom of any page (or go to `/admin/`), enter the admin password, and change the "raised" and "goal" amounts. The home page picks up the new numbers within about a minute, with no code change or redeploy.

How it works:

- `admin/index.html` + `js/admin.js` — the sign-in and edit form.
- `functions/api/[[path]].js` — a Cloudflare Pages Function. It checks the password, issues a signed 4-hour session cookie (HttpOnly, Secure, SameSite=Strict), validates the amounts, and stores them in Workers KV. Five wrong passwords from one IP lock that IP out for 15 minutes.
- `js/main.js` loads the numbers from `/api/campaign`. The `CAMPAIGN` values at the top of that file are only a fallback for when the API can't be reached (e.g. opening `index.html` from disk).

Setup, in the Cloudflare dashboard → Workers & Pages → `toss` → Settings:

1. **Bindings → KV namespace**: variable name `CAMPAIGN_KV`, bound to a KV namespace (e.g. `toss-campaign`). Do this for Production (and Preview if you want the admin page on preview builds).
2. **Variables and Secrets → Secret**: name `ADMIN_PASSWORD`, value = the admin password. Never put the password in this repo — it's public.
3. Redeploy so the new settings take effect.

To change the password, edit the `ADMIN_PASSWORD` secret and redeploy. Anyone signed in is signed out automatically.

Local testing: put `ADMIN_PASSWORD="something"` in a `.dev.vars` file (git-ignored) and run `npx wrangler pages dev . --kv CAMPAIGN_KV`.

## Colors

Brand colors were pulled directly from the TOSS logo artwork (`1.png` / the pptx deck) and live as tokens at the top of `css/styles.css`: white as the base, a pastel mint green and pastel gold as light accents, and a richer purple (matching the wordmark) for buttons, links, and headings.

## Photo credits

The Mardi Gras photos in `images/mardi-gras/` are by Happy Mermaid, sourced from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Mardi_Gras_2010_in_Pensacola,_Florida) and licensed CC BY 2.0. Attribution is included in the photo captions on the About page — keep it if the photos stay, or swap in TOSS Inc.'s own event photos when available.

## Adding a page

Copy `about.html`, rename it, replace the content inside `<main>`, and add a link to it in the navbar and footer of every page.
