const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const fixture = JSON.parse(fs.readFileSync('data/content.json', 'utf8'));
const KEY = 'zoet-gebaar-wishlist-v2';
function environment(respond, sendResult = {success: 'true'}) {
  const ids = new Map(); const requests = []; const storage = new Map();
  class Element {
    constructor(tag='div') { this.tag=tag; this.children=[]; this.events={}; this.value=''; this.textContent=''; this.hidden=false; this.disabled=false; this.attributes={}; }
    set id(value) { this._id=value; ids.set(value,this); }
    get id(){return this._id}
    setAttribute(name,value){this.attributes[name]=value}
    addEventListener(type,fn){this.events[type]=fn}
    append(...nodes){this.children.push(...nodes)}
    replaceChildren(...nodes){this.children=nodes}
    focus(){this.focused=true}
    click(){this.events.click?.()}
    async fire(type,extra={}){await this.events[type]?.({preventDefault(){},...extra})}
  }
  const document = {getElementById(id){if(!ids.has(id)){const node=new Element();node.id=id}return ids.get(id)},createElement:tag=>new Element(tag),createTextNode:text=>({text}),querySelectorAll:()=>[],querySelector:()=>null};
  const context = {document,console,Intl,structuredClone,JSON,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
    fetch:async(url,options={})=>{requests.push({url,options}); if(url.startsWith('https://formsubmit.co')) return {ok:true,json:async()=>sendResult}; return respond(url,options)},addEventListener(){}};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('content.js','utf8'),context);
  return {context,requests,storage,$:id=>document.getElementById(id),load:file=>vm.runInContext(fs.readFileSync(file,'utf8'),context)};
}
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const rows=e=>e.$('order-products').children;
const removeButton=row=>row.children[1].children[2];
const total=e=>e.$('summary-total').children[1].textContent;

test('An empty wishlist shows the empty state instead of the form',async()=>{
 const e=environment(()=>response(structuredClone(fixture)));e.$('order-form').hidden=true;e.load('order.js');await settle();
 assert.equal(e.$('order-form').hidden,true);assert.equal(e.$('order-empty').hidden,false);assert.equal(e.$('order-load-status').hidden,true);
});

test('Only wishlist items are listed, with exact cent totals, unknown prices and unavailable products handled',async()=>{
 const priced=structuredClone(fixture);priced.products[3].priceCents=null;priced.products[2].available=false;
 const e=environment(()=>response(priced));e.storage.set(KEY,'["klein-gewoon","klein-zonder-gelatine","middel-gewoon","groot-gewoon","nope"]');e.load('order.js');await settle();
 assert.equal(e.$('order-form').hidden,false);assert.equal(rows(e).length,4);
 assert.equal(e.$('quantity-middel-gewoon').value,'1');
 assert.equal(total(e),'Prijs volgt');
 e.$('quantity-klein-zonder-gelatine').value='0';await e.$('order-form').fire('input');assert.match(total(e),/16,00/);
 e.$('quantity-klein-gewoon').value='3';await e.$('order-form').fire('input');assert.match(total(e),/28,00/);
 assert.equal(e.$('quantity-groot-gewoon').disabled,true);assert.equal(e.$('quantity-groot-gewoon').value,'0');
});

test('A positional wishlist from the previous version is migrated',async()=>{
 const e=environment(()=>response(structuredClone(fixture)));e.storage.set('zoet-gebaar-wishlist-v1','[1,2]');e.load('order.js');await settle();
 assert.equal(rows(e).length,2);
 assert.ok(e.$('quantity-klein-zonder-gelatine')); assert.ok(e.$('quantity-middel-gewoon'));
});

test('Sending requires a name and a valid address, then mails the order once',async()=>{
 const e=environment(()=>response(structuredClone(fixture)));e.storage.set(KEY,'["middel-gewoon","groot-zonder-gelatine"]');e.load('order.js');await settle();
 assert.match(total(e),/23,00/);
 e.$('gift-message').value='<script>alert(1)</script>';await e.$('order-form').fire('input');assert.equal(e.$('summary-message').textContent,'<script>alert(1)</script>');
 await e.$('order-form').fire('submit');assert.equal(e.$('order-error').hidden,false);assert.equal(e.requests.length,1);
 e.$('order-name').value='Lien';e.$('order-email').value='geen-adres';await e.$('order-form').fire('submit');assert.match(e.$('order-error').textContent,/geldig/);assert.equal(e.requests.length,1);
 e.$('order-email').value='lien@example.com';await e.$('order-form').fire('submit');
 assert.equal(e.requests.length,2);
 const sent=JSON.parse(e.requests[1].options.body);
 assert.equal(e.requests[1].url,'https://formsubmit.co/ajax/info@zoetgebaar.be');
 assert.equal(sent.Naam,'Lien');assert.equal(sent.email,'lien@example.com');assert.match(sent.Bestelling,/1 x Middelgroot doosje, met gelatine, 500 gram/);assert.match(sent.Totaal,/23,00/);
 assert.equal(e.$('order-confirmation').hidden,false);assert.equal(e.$('review-order').disabled,true);assert.equal(e.storage.get(KEY),'[]');
 await e.$('order-form').fire('submit');assert.equal(e.requests.length,2);
});

test('A failed send keeps the order and shows a fallback',async()=>{
 const e=environment(()=>response(structuredClone(fixture)),{success:'false'});e.storage.set(KEY,'["klein-gewoon"]');e.load('order.js');await settle();
 e.$('order-name').value='Lien';e.$('order-email').value='lien@example.com';await e.$('order-form').fire('submit');
 assert.equal(e.$('order-confirmation').hidden,true);assert.match(e.$('order-error').textContent,/info@zoetgebaar\.be/);assert.equal(e.$('review-order').disabled,false);
 assert.equal(e.storage.get(KEY),'["klein-gewoon"]');
});

test('Removing an item or clearing the list updates the stored wishlist',async()=>{
 const e=environment(()=>response(structuredClone(fixture)));e.storage.set(KEY,'["klein-gewoon","middel-zonder-gelatine"]');e.load('order.js');await settle();
 assert.equal(rows(e).length,2);
 removeButton(rows(e)[0]).click();
 assert.equal(e.storage.get(KEY),'["middel-zonder-gelatine"]');assert.equal(rows(e).length,1);
 e.$('clear-list').click();
 assert.equal(e.storage.get(KEY),'[]');assert.equal(e.$('order-form').hidden,true);assert.equal(e.$('order-empty').hidden,false);
});

test('Unavailable content fails closed on the order page',async()=>{
 const e=environment(()=>response({},503));e.$('order-form').hidden=true;e.load('order.js');await settle();assert.equal(e.$('order-form').hidden,true);assert.match(e.$('order-load-status').textContent,/niet worden geladen/);
});
