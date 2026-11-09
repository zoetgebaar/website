const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const fixture = JSON.parse(fs.readFileSync('data/content.json', 'utf8'));
const pages = ['index.html', 'webshop.html', 'over-ons.html'].map(file => [file, fs.readFileSync(file, 'utf8')]);
const order = fs.readFileSync('bestellen.html', 'utf8');
const VERSION = '20261109-2';

function environment(respond) {
  const context = {document: {querySelectorAll: () => [], querySelector: () => null}, console, Intl, fetch: async () => respond(), addEventListener() {}};
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('content.js', 'utf8'), context);
  return context;
}
const response = (body, status = 200) => ({ok: status >= 200 && status < 300, status, json: async () => body});

test('Content loads and formats the six prices', async () => {
  const e = environment(() => response(structuredClone(fixture)));
  const data = await e.ZoetContent.ready;
  assert.equal(data.products.length, 6);
  assert.deepEqual(data.products.map(p => p.priceCents), [600, 600, 1000, 1000, 1300, 1300]);
  assert.deepEqual(data.products.map(p => p.weightGrams), [250, 250, 500, 500, 800, 800]);
  assert.match(e.ZoetContent.price(data.products[0]), /6,00/);
});

test('Content rejects invalid cents, weights, changed identities and empty text', async () => {
  const e = environment(() => response(structuredClone(fixture)));
  await e.ZoetContent.ready;
  const mutations = [
    d => d.products[0].priceCents = 1.5, d => d.products[0].priceCents = -1, d => d.products[0].id = 'other',
    d => d.products[2].size = 'klein', d => d.products[0].weightGrams = 0, d => d.announcement = '',
    d => d.products[0].available = 'yes', d => d.products.pop(), d => d.version = 1,
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

test('Pages share one release version and use the agreed wording', () => {
  for (const [file, html] of pages) {
    assert.doesNotMatch(html, /kartonnen/i, `${file} still says kartonnen`);
    assert.doesNotMatch(html, /mini-onderneming|leerling|schoolproject|31 maart/i, `${file} still uses the old wording`);
    assert.match(html, /VIVES Hogeschool/, `${file} must name the school`);
    assert.match(html, /instagram\.com\/zoet\.gebaar/, `${file} must link Instagram`);
    assert.match(html, /facebook\.com\/share\/1DzBTi725m/, `${file} must link Facebook`);
    assert.match(html, /Waar zoet een gebaar wordt\./, `${file} must carry the slogan`);
    const versions = new Set([...html.matchAll(/\?v=([\w-]+)/g)].map(m => m[1]));
    assert.deepEqual([...versions], [VERSION], `${file} mixes release versions`);
  }
  const shop = pages[1][1];
  const ids = [...shop.matchAll(/class="tag-card shop-card" data-mix="(\w+)" data-product="([\w-]+)"/g)];
  assert.deepEqual(ids.map(m => m[2]), fixture.products.map(p => p.id));
  assert.deepEqual(ids.map(m => m[1]), fixture.products.map(p => p.mix));
  assert.doesNotMatch(order, /kartonnen/i);
  assert.deepEqual([...new Set([...order.matchAll(/\?v=([\w-]+)/g)].map(m => m[1]))], [VERSION]);
});
