const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const fixture = JSON.parse(fs.readFileSync('data/content.json', 'utf8'));
function environment(respond) {
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
    reportValidity(){return true}
    click(){this.events.click?.()}
    async fire(type,extra={}){await this.events[type]?.({preventDefault(){},...extra})}
  }
  const document = {getElementById(id){if(!ids.has(id)){const node=new Element();node.id=id}return ids.get(id)},createElement:tag=>new Element(tag),querySelectorAll:()=>[],querySelector:()=>null};
  const context = {document,console,Intl,structuredClone,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},fetch:async(url,options={})=>{requests.push({url,options}); return respond(url,options)},addEventListener(){}};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('content.js','utf8'),context);
  for (const [id,tag] of [['gift-message','textarea'],['delivery','select'],['review-order','button'],['clear-list','button']]) { const el=new Element(tag); el.id=id; }
  return {context,requests,storage,$:id=>document.getElementById(id),load:file=>vm.runInContext(fs.readFileSync(file,'utf8'),context)};
}
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const rows=e=>e.$('order-products').children;
const removeButton=row=>row.children[1].children[2];

test('An empty wishlist shows the empty state instead of the form',async()=>{
 const e=environment(()=>response(structuredClone(fixture)));e.$('order-form').hidden=true;e.load('order.js');await settle();
 assert.equal(e.$('order-form').hidden,true);assert.equal(e.$('order-empty').hidden,false);assert.equal(e.$('order-load-status').hidden,true);
});

test('Only wishlist items are listed, with exact cent totals, unknown prices and unavailable products handled',async()=>{
 const priced=structuredClone(fixture);priced.products[1].priceCents=null;priced.products[4].available=false;
 const e=environment(()=>response(priced));e.storage.set('zoet-gebaar-wishlist-v1','[0,1,2,4,9,"x"]');e.load('order.js');await settle();
 assert.equal(e.$('order-form').hidden,false);assert.equal(e.$('order-empty').hidden,true);
 assert.equal(rows(e).length,4);
 assert.equal(e.$('quantity-middel-gewoon').value,'1');
 assert.equal(e.$('summary-total').children[1].textContent,'Prijs volgt');
 e.$('quantity-klein-zonder-gelatine').value='0';await e.$('order-form').fire('input');assert.match(e.$('summary-total').children[1].textContent,/16,00/);
 e.$('quantity-klein-gewoon').value='3';await e.$('order-form').fire('input');assert.match(e.$('summary-total').children[1].textContent,/28,00/);
 e.$('quantity-klein-zonder-gelatine').value='1';await e.$('order-form').fire('input');assert.equal(e.$('summary-total').children[1].textContent,'Prijs volgt');
 assert.equal(e.$('quantity-groot-gewoon').disabled,true);assert.equal(e.$('quantity-groot-gewoon').value,'0');
});

test('Card message and delivery preference appear in the summary; the preview never submits',async()=>{
 const e=environment(()=>response(structuredClone(fixture)));e.storage.set('zoet-gebaar-wishlist-v1','[2,5]');e.load('order.js');await settle();
 assert.match(e.$('summary-total').children[1].textContent,/23,00/);
 assert.equal(e.$('summary-delivery').textContent,'Voorkeur: afhalen');
 e.$('delivery').value='shipping';await e.$('order-form').fire('change');assert.match(e.$('summary-delivery').textContent,/bezorgen/);assert.match(e.$('delivery-note').textContent,/Bezorgkosten/);
 e.$('gift-message').value='<script>alert(1)</script>';await e.$('order-form').fire('input');assert.equal(e.$('summary-message').textContent,'<script>alert(1)</script>');assert.equal(e.$('summary-message').hidden,false);
 assert.equal(e.$('review-order').disabled,false);
 await e.$('order-form').fire('submit');assert.equal(e.$('order-confirmation').hidden,false);assert.equal(e.requests.length,1);
 e.$('quantity-middel-gewoon').value='0';e.$('quantity-groot-zonder-gelatine').value='0';await e.$('order-form').fire('input');assert.equal(e.$('review-order').disabled,true);
});

test('Removing an item or clearing the list updates the stored wishlist',async()=>{
 const e=environment(()=>response(structuredClone(fixture)));e.storage.set('zoet-gebaar-wishlist-v1','[0,3]');e.load('order.js');await settle();
 assert.equal(rows(e).length,2);
 removeButton(rows(e)[0]).click();
 assert.equal(e.storage.get('zoet-gebaar-wishlist-v1'),'[3]');assert.equal(rows(e).length,1);
 e.$('clear-list').click();
 assert.equal(e.storage.get('zoet-gebaar-wishlist-v1'),'[]');assert.equal(e.$('order-form').hidden,true);assert.equal(e.$('order-empty').hidden,false);
});

test('Unavailable content fails closed on the order page',async()=>{
 const e=environment(()=>response({},503));e.$('order-form').hidden=true;e.load('order.js');await settle();assert.equal(e.$('order-form').hidden,true);assert.match(e.$('order-load-status').textContent,/niet worden geladen/);
});
