const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const fixture = JSON.parse(fs.readFileSync('data/content.json', 'utf8'));
const pageFiles = ['index.html', 'webshop.html', 'over-ons.html', 'bedrijven.html', 'goed-doel.html'];
const pages = pageFiles.map(file => [file, fs.readFileSync(file, 'utf8')]);
const order = fs.readFileSync('bestellen.html', 'utf8');
const VERSION = '20261126-1';
// Visible text only: drop scripts, styles and tags.
const visibleText = html => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');

function environment(respond) {
  const context = {document: {querySelectorAll: () => [], querySelector: () => null}, console, Intl, fetch: async () => respond(), addEventListener() {}};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('content.js', 'utf8'), context);
  return context;
}
const response = (body, status = 200) => ({ok: status >= 200 && status < 300, status, json: async () => body});

test('Content loads and formats the six prices, grouped by mix', async () => {
  const e = environment(() => response(structuredClone(fixture)));
  const data = await e.ZoetContent.ready;
  assert.equal(data.products.length, 6);
  assert.deepEqual(data.products.map(p => p.mix), ['gewoon', 'gewoon', 'gewoon', 'gelatinevrij', 'gelatinevrij', 'gelatinevrij']);
  assert.deepEqual(data.products.map(p => p.priceCents), [600, 1000, 1300, 600, 1000, 1300]);
  assert.deepEqual(data.products.map(p => p.weightGrams), [350, 500, 800, 350, 500, 800]);
  assert.match(e.ZoetContent.price(data.products[0]), /6,00/);
  assert.equal(e.ZoetContent.mixLabel(data.products[3]), 'Gelatinevrij');
});

test('Content rejects invalid cents, weights, changed identities and empty text', async () => {
  const e = environment(() => response(structuredClone(fixture)));
  await e.ZoetContent.ready;
  const mutations = [
    d => d.products[0].priceCents = 1.5, d => d.products[0].priceCents = -1, d => d.products[0].id = 'other',
    d => d.products[1].size = 'klein', d => d.products[0].weightGrams = 0, d => d.announcement = '',
    d => d.products[0].available = 'yes', d => d.products.pop(), d => d.version = 2, d => d.products[0].mix = 'gelatinevrij',
  ];
  for (const mutate of mutations) {
    const data = structuredClone(fixture); mutate(data);
    assert.throws(() => e.ZoetContent.validate(data));
  }
  assert.equal(e.ZoetContent.price({priceCents: null}), 'Prijs volgt');
});

test('Unavailable content rejects without breaking the page', async () => {
  const e = environment(() => response({}, 503));
  await assert.rejects(e.ZoetContent.ready, /niet worden geladen/);
});

test('Pages share one release version, contact details and the agreed wording', () => {
  for (const [file, html] of pages) {
    const text = visibleText(html);
    assert.doesNotMatch(html, /kartonnen|mini-onderneming|leerling|schoolproject|31 maart|250 g/i, `${file} uses old wording`);
    assert.doesNotMatch(html, /class="[^"]*\b(eyebrow|kicker)\b/, `${file} still has eyebrow labels`);
    assert.doesNotMatch(html, /[–—]|&[mn]dash;/, `${file} contains a long dash`);
    assert.doesNotMatch(text, /\s-\s/, `${file} uses a hyphen as a dash`);
    assert.doesNotMatch(text, /\b\p{L}+ · \p{L}+/u, `${file} separates words with a middle dot`);
    assert.match(html, /VIVES Hogeschool/, `${file} must name the school`);
    assert.match(html, /instagram\.com\/zoet\.gebaar/, `${file} must link Instagram`);
    assert.match(html, /facebook\.com\/share\/1DzBTi725m/, `${file} must link Facebook`);
    assert.match(html, /linkedin\.com\//, `${file} must link LinkedIn`);
    assert.match(html, /href="mailto:info@zoetgebaar\.be"/, `${file} must show the e-mail address`);
    for (const target of ['webshop.html', 'bedrijven.html', 'goed-doel.html', 'over-ons.html', 'index.html?v=' + VERSION + '#agenda']) {
      assert.ok(html.includes(target), `${file} must link ${target}`);
    }
    const versions = new Set([...html.matchAll(/\?v=([\w-]+)/g)].map(m => m[1]));
    assert.deepEqual([...versions], [VERSION], `${file} mixes release versions`);
  }
  const shop = pages[1][1];
  const ids = [...shop.matchAll(/class="shop-card" data-mix="(\w+)" data-product="([\w-]+)"/g)];
  assert.deepEqual(ids.map(m => m[2]), fixture.products.map(p => p.id));
  assert.deepEqual(ids.map(m => m[1]), fixture.products.map(p => p.mix));
  assert.doesNotMatch(shop, /Levering|bezorg|verzending/i, 'the shop no longer offers delivery');
  assert.doesNotMatch(order, /[–—]|eyebrow|bezorg/i);
  assert.deepEqual([...new Set([...order.matchAll(/\?v=([\w-]+)/g)].map(m => m[1]))], [VERSION]);
});

test('The business form collects quantity, ribbon colour and an optional logo', () => {
  const html = pages.find(([file]) => file === 'bedrijven.html')[1];
  assert.match(html, /action="api\/send\.php"/);
  assert.match(html, /name="type" value="bedrijf"/);
  assert.doesNotMatch(html, /formsubmit/);
  assert.match(html, /enctype="multipart\/form-data"/);
  assert.match(html, /name="aantal" type="number"[^>]*required/);
  assert.match(html, /name="lintkleur"/);
  assert.match(html, /type="file"/);
});
