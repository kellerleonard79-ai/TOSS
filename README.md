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

Open `js/main.js` and edit the two numbers at the top of the file:

```js
const CAMPAIGN = {
  raised: 2250,
  goal: 3000,
};
```

The bar width, percentage, and dollar labels on the home page all recalculate from these automatically — nothing else needs to change.

## Colors

Brand colors were pulled directly from the TOSS logo artwork (`1.png` / the pptx deck) and live as tokens at the top of `css/styles.css`: white as the base, a pastel mint green and pastel gold as light accents, and a richer purple (matching the wordmark) for buttons, links, and headings.

## Photo credits

The Mardi Gras photos in `images/mardi-gras/` are by Happy Mermaid, sourced from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:Mardi_Gras_2010_in_Pensacola,_Florida) and licensed CC BY 2.0. Attribution is included in the photo captions on the About page — keep it if the photos stay, or swap in TOSS Inc.'s own event photos when available.

## Adding a page

Copy `about.html`, rename it, replace the content inside `<main>`, and add a link to it in the navbar and footer of every page.
