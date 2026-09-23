# Zoet Gebaar

Static website served by GitHub Pages from `main`.

## Pages

- `index.html`, `webshop.html`, `over-ons.html`: public website.
- `admin.html`: demonstration of the team editor, linked from the homepage.
- `bestellen.html`: order preview, reached directly from “Mijn lijstje”, with `noindex, nofollow`. Saved favorites are preselected.

## Demo login

Username: **demo** · Password: **zoetgebaar**

This is an intentionally public UI demonstration, not secure authentication. There are no real accounts, private admin data, tokens, or server-side writes. Do not use real passwords.

Editors can try changes to the announcement, homepage introduction, collection note, product names, descriptions, prices and availability. **Demo opslaan** stores content only in this browser under `zoet-gebaar-demo-content-v1`. The public website and GitHub content are not changed. Logout returns to the demo login; refreshing requires logging in again.

The editor's preview links append `?demo=1` to show locally saved content. Normal URLs always show published content. A banner identifies demo previews. **Demo terugzetten** removes the local draft after confirmation.

## Order preview

Anyone with the URL can open the preview. It does not accept real orders, collect payment or transmit customer information. Search directives are not access control. Amounts are integer cents; unknown prices never become free orders. Delivery fees and checkout are not configured.

## Content and development

`data/content.json` is the shared published source. `null` prices mean “Prijs volgt”. Product IDs and order remain fixed for wishlist compatibility. Content is inserted as text, never HTML.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
node --test tests/*.test.cjs
```

Use HTTP rather than `file://`, as the site loads content with `fetch`. Tests cover content validation, demo login, local persistence, storage failure, order totals and unavailable content. Real authentication and order processing require a backend in a future version.

Local HTML links and script/style URLs carry a release version to prevent mixed cached pages after deployment. Bump the version across HTML and the legacy wishlist fallback when releasing asset changes.
