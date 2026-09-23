const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const fixture = JSON.parse(fs.readFileSync('data/content.json', 'utf8'));
function environment(respond) {
  const ids = new Map(); const requests = [];
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
  const document = {getElementById(id){if(!ids.has(id)){const node=new Element();node.id=id}return ids.get(id)},createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),querySelectorAll:()=>[],querySelector:()=>null};
  const context = {document,console,Intl,TextDecoder,TextEncoder,Uint8Array,AbortSignal,structuredClone,URLSearchParams,atob,btoa,confirm:()=>true,localStorage:{getItem:()=> '[]'},fetch:async(url,options={})=>{requests.push({url,options}); return respond(url,options)},addEventListener(){}};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('content.js','utf8'),context);
  return {context,requests,$:id=>document.getElementById(id),load:file=>vm.runInContext(fs.readFileSync(file,'utf8'),context)};
}
const response=(body,status=200)=>({ok:status>=200&&status<300,status,json:async()=>body});
const file=()=>({sha:'old-sha',content:Buffer.from(JSON.stringify(fixture)).toString('base64')});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function api(url,options){
 if(url==='data/content.json')return response(structuredClone(fixture));
 if(url.endsWith('/user'))return response({login:'aelis'});
 if(url.endsWith('/website'))return response({permissions:{push:true}});
 if(options.method==='PUT')return response({content:{sha:'new-sha'}});
 return response(file());
}
test('Content rejects invalid cents, changed product identities and empty content',async()=>{
 const e=environment(api);await e.context.ZoetContent.ready;
 for(const mutate of [d=>d.products[0].priceCents=1.5,d=>d.products[0].priceCents=-1,d=>d.products[0].id='other',d=>d.announcement='',d=>d.products[0].available='yes']){
 const data=structuredClone(fixture);mutate(data);assert.throws(()=>e.context.ZoetContent.validate(data));
 }
 assert.equal(e.context.ZoetContent.price(fixture.products[0]),'Prijs volgt');
});
test('Admin rejects invalid tokens and accounts without push permission',async()=>{
 for(const mode of ['invalid','readonly']){
 const e=environment((url,options)=>url.endsWith('/user')&&mode==='invalid'?response({},401):url.endsWith('/website')?response({permissions:{push:false}}):api(url,options));
 e.load('admin.js');e.$('editor-panel').hidden=true;e.$('access-code').value='test-token';await e.$('login-form').fire('submit');
 assert.equal(e.$('editor-panel').hidden,true);assert.equal(e.$('access-code').value,'');assert.ok(e.$('login-status').textContent.length>0);assert.ok(!e.requests.some(r=>r.options.method==='PUT'));
 }
});
test('Admin publishes validated UTF-8 data with the loaded SHA and token only in Authorization',async()=>{
 const e=environment(api);e.load('admin.js');e.$('access-code').value='test-token';await e.$('login-form').fire('submit');
 assert.equal(e.$('editor-panel').hidden,false);
 e.$('announcement').value='Liefs van de meisjes ♡';e.$('price-0').value='4.95';await e.$('editor-form').fire('input');await e.$('editor-form').fire('submit');
 const req=e.requests.find(r=>r.options.method==='PUT');assert.ok(req);
 const body=JSON.parse(req.options.body);const data=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
 assert.equal(body.sha,'old-sha');assert.equal(body.branch,'main');assert.equal(data.products[0].priceCents,495);assert.equal(data.announcement,'Liefs van de meisjes ♡');assert.equal(req.options.headers.Authorization,'Bearer test-token');assert.ok(!req.url.includes('test-token'));assert.ok(!req.options.body.includes('test-token'));
 assert.match(e.$('save-status').textContent,/Opgeslagen/);
});
test('A conflicting publication keeps unsaved content and offers reloading',async()=>{
 const e=environment((url,options)=>options.method==='PUT'?response({},409):api(url,options));e.load('admin.js');e.$('access-code').value='test-token';await e.$('login-form').fire('submit');
 e.$('announcement').value='Mijn wijziging';await e.$('editor-form').fire('input');await e.$('editor-form').fire('submit');
 assert.equal(e.$('announcement').value,'Mijn wijziging');assert.equal(e.$('reload-content').hidden,false);assert.equal(e.$('publish').disabled,false);assert.match(e.$('save-status').textContent,/niet opgeslagen/);
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
