# TEMPLATE — Website Template

A minimal, black and white website template: plain HTML, CSS, and a little vanilla JS. No build step. Open `index.html` in a browser and it works.

## Structure

```
index.html       Home page
about.html       About page
css/styles.css   All styles (design tokens at the top)
js/main.js       Mobile menu, header scroll border, footer year
```

## Customizing

- **Brand name:** search for `TEMPLATE` in both HTML files and replace it.
- **Fonts:** Space Grotesk (headings) and Inter (body) load from Google Fonts in each page's `<head>`. To swap them, change that link and the `--font-heading` / `--font-body` tokens in `css/styles.css`.
- **Colors and spacing:** edit the tokens in `:root` at the top of `css/styles.css`.
- **Navbar and footer:** these are duplicated in each HTML file. Keep them in sync when editing, and move `aria-current="page"` to the current page's nav link on any new page.

## Adding a page

Copy `about.html`, rename it, replace the content inside `<main>`, and add a link to it in the navbar and footer of every page.
