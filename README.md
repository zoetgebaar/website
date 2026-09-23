# Zoet Gebaar

Static website served by GitHub Pages from the `main` branch.

## Pages

- `index.html`, `webshop.html`, `over-ons.html`: public website.
- `admin.html`: team editor with GitHub authentication.
- `bestellen.html`: order preview, intentionally absent from public navigation and marked `noindex, nofollow`.

The order preview is accessible to anyone who knows its URL. It does not accept orders, collect payment, or transmit or persist customer information. Search directives are not access control.

## Team login and publishing

The first version uses personal GitHub access tokens because GitHub Pages cannot run a login server. There is no shared password or simulated client-side password check.

1. Each editor needs a GitHub account with write access to `zoetgebaar/website`.
2. Create an expiring **fine-grained personal access token**, scoped to this repository only, with **Contents: Read and write**. Organization approval may be necessary.
3. Open `admin.html` and enter the token. It is sent only to `api.github.com`, kept in page memory, and cleared on logout. Refreshing requires logging in again.
4. Edit announcement, homepage introduction, collection note, product names, descriptions, euro prices, and availability.
5. **Publiceren** commits `data/content.json` to `main`. GitHub Pages then redeploys; allow a few minutes.

Login checks the authenticated account and repository push permission. GitHub enforces token permission and branch protection on publication. The editor includes the file SHA in each update to reject concurrent changes. Conflicts and request failures keep entered edits intact. The reload action explicitly asks before discarding edits.

Never commit tokens or place them in browser storage, URLs, site content, or screenshots. Email/password or OAuth sign-in would need an additional configured authentication service.

GitHub reference: [Create or update repository file contents](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents).

## Content

`data/content.json` is the shared source for the public website, editor and order preview. Amounts are integer cents; `null` means the price is not known. IDs and order of the four products stay stable for compatibility with existing wishlists. Text is inserted as plain text, never HTML.

Existing public HTML is a readable fallback if the content request fails. The order preview remains unavailable on a content-loading error. Unknown prices never become a zero-price total. Delivery charges and checkout remain unconfigured.

## Development

```sh
python3 -m http.server 8000 --bind 127.0.0.1
node --test tests/workspace.test.cjs
```

Then open `http://127.0.0.1:8000/`. Use HTTP rather than `file://` because content is loaded with `fetch`.

Tests exercise content validation, denied logins, UTF-8 publication, conflict handling, subtotal calculation, unavailable products, and failure behavior using mocked GitHub responses. A real publication from the admin requires an editor's token and is not exercised by the automated tests.
