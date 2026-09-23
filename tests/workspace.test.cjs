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
    reset(){}
    reportValidity(){return true}
    querySelectorAll(){return [...ids.values()].filter(el=>['input','textarea','button'].includes(el.tag))}
    async fire(type,extra={}){await this.events[type]?.({preventDefault(){},submitter:new Element('button'),...extra})}
  }
  const document = {body:{children:[],prepend(node){this.children.unshift(node)}},getElementById(id){if(!ids.has(id)){const node=new Element();node.id=id}return ids.get(id)},createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),querySelectorAll:()=>[],querySelector:()=>null};
  const context = {document,console,Intl,TextDecoder,TextEncoder,Uint8Array,AbortSignal,structuredClone,URLSearchParams,URL,atob,btoa,confirm:()=>true,location:{search:'',href:'https://example.test/index.html',origin:'https://example.test',pathname:'/index.html'},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},fetch:async(url,options={})=>{requests.push({url,options}); return respond(url,options)},addEventListener(){}};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('content.js','utf8'),context);
  return {context,requests,storage,$:id=>document.getElementById(id),load:file=>vm.runInContext(fs.readFileSync(file,'utf8'),context)};
}
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const api=()=>response(structuredClone(fixture));
test('Content rejects invalid cents, changed product identities and empty content',async()=>{
 const e=environment(api);await e.context.ZoetContent.ready;
 for(const mutate of [d=>d.products[0].priceCents=1.5,d=>d.products[0].priceCents=-1,d=>d.products[0].id='other',d=>d.announcement='',d=>d.products[0].available='yes']){
 const data=structuredClone(fixture);mutate(data);assert.throws(()=>e.context.ZoetContent.validate(data));
 }
 assert.equal(e.context.ZoetContent.price(fixture.products[0]),'Prijs volgt');
});
test('Order preview handles unknown prices, exact cent totals and unavailable products without submission',async()=>{
 const priced=structuredClone(fixture);priced.products[0].priceCents=495;priced.products[2].available=false;
 const e=environment(()=>response(priced));e.load('order.js');await settle();
 assert.equal(e.$('order-form').hidden,false);assert.equal(e.$('review-order').disabled,true);
 e.$('quantity-klein-gewoon').value='3';await e.$('order-form').fire('input');assert.match(e.$('summary-total').children[1].textContent,/14,85/);
 e.$('quantity-klein-zonder-gelatine').value='1';await e.$('order-form').fire('input');assert.equal(e.$('summary-total').children[1].textContent,'Prijs volgt');
 assert.equal(e.$('quantity-groot-gewoon').disabled,true);
 e.$('gift-message').value='<script>alert(1)</script>';await e.$('order-form').fire('input');assert.equal(e.$('summary-message').textContent,'<script>alert(1)</script>');
 await e.$('order-form').fire('submit');assert.equal(e.$('order-confirmation').hidden,false);assert.equal(e.requests.length,1);
});
test('Unavailable content fails closed on the order page',async()=>{
 const e=environment(()=>response({},503));e.$('order-form').hidden=true;e.load('order.js');await settle();assert.equal(e.$('order-form').hidden,true);assert.match(e.$('order-load-status').textContent,/niet worden geladen/);
});
