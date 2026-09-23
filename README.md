# Zoet Gebaar

Static website served by GitHub Pages from `main`.

## Pages

- `index.html`, `webshop.html`, `over-ons.html`: public website.
- `bestellen.html`: order preview, reached directly from “Mijn lijstje”, with `noindex, nofollow`. Saved favorites are preselected.

## Order preview

Anyone with the URL can open the preview. It does not accept real orders, collect payment or transmit customer information. Search directives are not access control. Amounts are integer cents; unknown prices never become free orders. Delivery fees and checkout are not configured.

## Content and development

`data/content.json` is the shared published source. `null` prices mean “Prijs volgt”. Product IDs and order remain fixed for wishlist compatibility. Content is inserted as text, never HTML.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
node --test tests/*.test.cjs
```

Use HTTP rather than `file://`, as the site loads content with `fetch`. Tests cover content validation, wishlist navigation, order totals and unavailable content. Real order processing requires a backend in a future version.

Local HTML links and script/style URLs carry a release version to prevent mixed cached pages after deployment. Bump the version across HTML and the legacy wishlist fallback when releasing asset changes.
