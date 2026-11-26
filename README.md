# Zoet Gebaar

Static website served by GitHub Pages from `main` (domain: zoetgebaar.be, mailbox info@zoetgebaar.be). Zoet Gebaar is a student enterprise (studentenonderneming) of VIVES Hogeschool, run by Aylien, Shaunie and Aelis. Slogan: “Waar zoet een gebaar wordt.”

## Pages

- `index.html`: home with the three box sizes, the seasons, the agenda (`#agenda`), the charity campaign, the business offer and the team.
- `webshop.html`: the six articles grouped by mix (gewone snoepmix, then gelatinevrij), with a Flip-animated filter and a local wishlist (“Mijn lijstje”).
- `bestellen.html`: order page reached from the wishlist (`noindex, nofollow`). It sends the order by e-mail; there is no online payment and no delivery, only pickup.
- `bedrijven.html`: offer for companies with a request form (quantity, size, mix, ribbon colour, optional logo upload).
- `goed-doel.html`: the De Warmste Week campaign (1 to 31 December).
- `over-ons.html`: team and story.

## Forms

Both forms use [FormSubmit](https://formsubmit.co) and arrive at info@zoetgebaar.be. The first submission of each form triggers an activation e-mail to that address; click the link once, and later submissions are delivered. The business form posts multipart data (so the logo arrives as an attachment, max 5 MB checked in `business.js`) and redirects back with `?verzonden=1`. The order page posts JSON to the AJAX endpoint (`order.js`); the CSP on `bestellen.html` allows only that origin. Both forms have a honeypot field.

## Content and development

`data/content.json` is the published source for the announcement, intro, shop note and the six products (name, description, weight in grams, price in integer cents, availability). `null` prices mean “Prijs volgt”. Product IDs and their order are fixed and validated by `content.js`; the HTML carries the same texts as a fallback. Content is inserted as text, never HTML. The wishlist stores product IDs under `zoet-gebaar-wishlist-v2` and migrates the older position-based list.

```sh
npx http-server -p 8000   # or: python3 -m http.server 8000 --bind 127.0.0.1
node --test tests/*.test.cjs
```

Use HTTP rather than `file://`, as the site loads content with `fetch`. Tests cover content validation, wishlist and filter, the order page (validation, sending, failure) and the wording rules: no long dashes, no hyphen used as a dash, no eyebrow labels and no middle dots between words.

## Motion

`motion.js` uses GSAP 3.15 (vendored in `assets/vendor`: core, ScrollTrigger, SplitText, Flip). Headings rise line by line (`data-split`), blocks fade up (`data-reveal`), images open like a curtain (`data-clip`) with light parallax (`data-parallax`), the marquee follows the scroll speed and direction, and buttons lean towards the pointer. An inline script in `<head>` only adds `.has-motion` when the visitor does not prefer reduced motion and removes it again if GSAP does not start, so content is never stuck hidden.

## Assets

- `assets/logo.jpg` and `favicon.png`: the ZG logo.
- `assets/doosje-kerst.jpg` (klein), `assets/doosje-zwart.jpg` (middelgroot), `assets/doosje-roze.jpg` (groot): product photos. Both mixes of a size share the photo.
- `assets/team.jpg` and `assets/team-aelis.jpg`, `assets/team-aylien.jpg`, `assets/team-shaunie.jpg`: team photos.

Local HTML links and script/style URLs carry a release version (`?v=…`). Bump it across all HTML files and `tests/` when releasing.

## Voor het team: de agenda aanpassen

De agenda op de startpagina toont automatisch alleen de komende verkoopmomenten. Er zijn twee manieren om hem bij te werken.

**Google Sheet (aangeraden, geen code nodig)**

1. Maak een Google Sheet met in de eerste rij precies deze kolommen: `datum`, `einddatum`, `uur`, `wat`, `waar`.
2. Vul per rij een verkoopmoment in. Datum als `5/12/2026` of `2026-12-05`. `einddatum` en `uur` mag je leeg laten.
3. Kies Bestand, Delen, Publiceren op internet. Kies het tabblad en het formaat “Door komma's gescheiden waarden (.csv)” en klik op Publiceren.
4. Plak de link die je krijgt één keer in `data/agenda.json` bij `googleSheetCsv`.

Daarna pas je alleen nog de Sheet aan. De website toont de wijzigingen binnen enkele minuten.

**Zonder Google Sheet**

Pas `data/agenda.json` aan via GitHub (potloodje “Edit this file”):

```json
{
  "googleSheetCsv": "",
  "events": [
    {"datum": "2026-12-05", "uur": "10:00 tot 17:00", "wat": "Kerstmarkt", "waar": "Markt, Brugge"}
  ]
}
```
