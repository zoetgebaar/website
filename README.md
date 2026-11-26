# Zoet Gebaar

Static website with one small PHP mail script, hosted on Enhance at zoetgebaar.be (mailbox info@zoetgebaar.be). Every push to `main` is deployed automatically (see Deployment). Zoet Gebaar is a student enterprise (studentenonderneming) of VIVES Hogeschool, run by Aylien, Shaunie and Aelis. Slogan: “Waar zoet een gebaar wordt.”

## Pages

- `index.html`: home with the three box sizes, the seasons, the agenda (`#agenda`), the charity campaign, the business offer and the team.
- `webshop.html`: the six articles grouped by mix (gewone snoepmix, then gelatinevrij), with a Flip-animated filter and a local wishlist (“Mijn lijstje”).
- `bestellen.html`: order page reached from the wishlist (`noindex, nofollow`). It sends the order by e-mail; there is no online payment and no delivery, only pickup.
- `bedrijven.html`: offer for companies with a request form (quantity, size, mix, ribbon colour, optional logo upload).
- `goed-doel.html`: the De Warmste Week campaign (1 to 31 December).
- `over-ons.html`: team and story.

## Forms

Both forms post to `api/send.php`, which mails them to info@zoetgebaar.be over SMTP with PHPMailer 7.2 (vendored in `api/lib/PHPMailer`). The order form sends only product IDs and quantities; the script recalculates names, weights and totals from `data/content.json`. The business form posts multipart data with an optional logo (PNG, JPG, SVG or PDF, max 5 MB, checked by content type). Without JavaScript the business form still works and redirects to `bedrijven.html?verzonden=1`. Protection: a hidden honeypot field (`website`), strict validation and a limit of 5 submissions per IP address per 10 minutes. The reply address of each mail is the customer, so the team can answer directly.

SMTP settings live in `api/config.php` (see `api/config.example.php`). That file is never committed; the deploy workflow writes it from GitHub secrets.

## Content and development

`data/content.json` is the published source for the announcement, intro, shop note and the six products (name, description, weight in grams, price in integer cents, availability). `null` prices mean “Prijs volgt”. Product IDs and their order are fixed and validated by `content.js`; the HTML carries the same texts as a fallback. Content is inserted as text, never HTML. The wishlist stores product IDs under `zoet-gebaar-wishlist-v2` and migrates the older position-based list.

```sh
php -S 127.0.0.1:8000     # serves the site and api/send.php
node --test tests/*.test.cjs
```

Use HTTP rather than `file://`, as the site loads content with `fetch`. Tests cover content validation, wishlist and filter, the order page (validation, sending, failure) and the wording rules: no long dashes, no hyphen used as a dash, no eyebrow labels and no middle dots between words.

## Deployment (Enhance)

`.github/workflows/deploy.yml` runs on every push to `main` (and by hand under Actions). It runs the tests, checks the PHP, copies the site without the files listed in `.deployignore`, writes `api/config.php` and mirrors everything over SFTP to the web root. Files on the server that are no longer in the repo are removed, except `.well-known/`, `.user.ini` and `cgi-bin/`.

Repository secrets (Settings, Secrets and variables, Actions):

| Secret | Value |
| --- | --- |
| `SFTP_HOST` | SFTP server of the Enhance website |
| `SFTP_PORT` | optional, default 22 |
| `SFTP_USER` / `SFTP_PASSWORD` | SFTP login of the website in Enhance |
| `SFTP_PATH` | optional, default `public_html` |
| `SMTP_HOST` | mail server of info@zoetgebaar.be |
| `SMTP_PORT` / `SMTP_SECURE` | optional, default 465 / `ssl` (use 587 / `tls` for STARTTLS) |
| `SMTP_USER` / `SMTP_PASSWORD` | login of the mailbox |
| `MAIL_TO` | optional, default info@zoetgebaar.be |

Without the SMTP secrets the site is still deployed; the forms then answer that they are not set up yet.

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
