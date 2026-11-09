# Zoet Gebaar

Static website served by GitHub Pages from `main`. Zoet Gebaar is a student enterprise (studentenonderneming) of VIVES Hogeschool, run by Aylien, Shaunie and Aelis. Slogan: “Waar zoet een gebaar wordt.”

## Pages

- `index.html`: home, with the three box sizes, the seasonal finishes and the team.
- `webshop.html`: the six articles (three sizes × two candy mixes) with a local wishlist (“Mijn lijstje”).
- `bestellen.html`: order preview, reached from the wishlist, with `noindex, nofollow`. It lists only the saved boxes, with quantities, a card message and a delivery preference.
- `over-ons.html`: team, story and the timeline from 1 December to 31 May.

## Order preview

Anyone with the URL can open the preview. It does not accept real orders, collect payment or transmit customer information; items can be removed from the list, and the wishlist lives only in the visitor's browser. Amounts are integer cents; unknown prices never become free orders. Real order processing (for example into a shared spreadsheet) needs a backend or form service in a future version.

## Content and development

`data/content.json` is the shared published source for the announcement, intro, shop note and the six products (name, description, weight in grams, price in integer cents, availability). `null` prices mean “Prijs volgt”. Product IDs and their order are fixed and validated by `content.js`; the HTML carries the same texts as a fallback when the JSON cannot be loaded. Content is inserted as text, never HTML.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
node --test tests/*.test.cjs
```

Use HTTP rather than `file://`, as the site loads content with `fetch`. Tests cover content validation, wishlist navigation, the order preview and unavailable content, plus the wording and link rules of the pages.

## Assets

- `assets/logo.jpg` and `favicon.png`: the ZG logo.
- `assets/doosje-roze.jpg`, `assets/doosje-kerst.jpg`, `assets/doosje-zwart.jpg`: product photos: Christmas ribbon = klein, black ribbon = middelgroot, pink ribbon = groot. Both mixes of a size share the photo.
- `assets/team.jpg`: the photo of the three founders on the home page. `assets/team-aelis.jpg`, `assets/team-aylien.jpg`, `assets/team-shaunie.jpg`: portraits on the founder cards of `over-ons.html`.

Local HTML links and script/style URLs carry a release version (`?v=…`) to prevent mixed cached pages after deployment. Bump it across all HTML files and `tests/content.test.cjs` when releasing asset changes.
