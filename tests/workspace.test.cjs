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
  const context = {document,console,Intl,TextDecoder,TextEncoder,Uint8Array,AbortSignal,structuredClone,URLSearchParams,URL,atob,btoa,confirm:()=>true,location:{search:'',href:'https://example.test/admin.html',origin:'https://example.test',pathname:'/admin.html'},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},fetch:async(url,options={})=>{requests.push({url,options}); return respond(url,options)},addEventListener(){}};
  context.window=context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('content.js','utf8'),context);
  return {context,requests,storage,$:id=>document.getElementById(id),load:file=>vm.runInContext(fs.readFileSync(file,'utf8'),context)};
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
test('Demo login rejects incorrect credentials and accepts the displayed demo account',async()=>{
 const e=environment(api);e.load('admin.js');e.$('editor-panel').hidden=true;
 e.$('username').value='demo';e.$('access-code').value='wrong';await e.$('login-form').fire('submit');
 assert.equal(e.$('editor-panel').hidden,true);assert.equal(e.$('access-code').value,'');
 e.$('access-code').value='zoetgebaar';await e.$('login-form').fire('submit');
 assert.equal(e.$('editor-panel').hidden,false);assert.equal(e.requests.length,1);
});
test('Demo edits save locally, survive a new login and never call GitHub',async()=>{
 const e=environment(api);e.load('admin.js');e.$('username').value='demo';e.$('access-code').value='zoetgebaar';await e.$('login-form').fire('submit');
 e.$('announcement').value='Liefs van de meisjes ♡';e.$('price-0').value='4.95';await e.$('editor-form').fire('input');await e.$('editor-form').fire('submit');
 const data=JSON.parse(e.storage.get('zoet-gebaar-demo-content-v1'));
 assert.equal(data.products[0].priceCents,495);assert.equal(data.announcement,'Liefs van de meisjes ♡');assert.equal(e.requests.length,1);
 await e.$('logout').fire('click');assert.equal(e.$('editor-panel').hidden,true);
 e.$('access-code').value='zoetgebaar';await e.$('login-form').fire('submit');assert.equal(e.$('announcement').value,'Liefs van de meisjes ♡');
 await e.$('reset-demo').fire('click');assert.equal(e.storage.has('zoet-gebaar-demo-content-v1'),false);assert.equal(e.$('announcement').value,fixture.announcement);
});
test('Blocked browser storage keeps edits and reports that saving failed',async()=>{
 const e=environment(api);e.load('admin.js');e.$('username').value='demo';e.$('access-code').value='zoetgebaar';await e.$('login-form').fire('submit');
 e.context.localStorage.setItem=()=>{throw new Error('blocked')};e.$('announcement').value='Mijn wijziging';await e.$('editor-form').fire('input');await e.$('editor-form').fire('submit');
 assert.equal(e.$('announcement').value,'Mijn wijziging');assert.equal(e.$('publish').disabled,false);assert.match(e.$('save-status').textContent,/Opslaan lukt niet/);
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

test('Local demo drafts only affect explicit demo URLs and have a working exit link',async()=>{
 const normal=environment(api);const changed=structuredClone(fixture);changed.announcement='Demo only';normal.storage.set('zoet-gebaar-demo-content-v1',JSON.stringify(changed));
 assert.equal((await normal.context.ZoetContent.ready).announcement,fixture.announcement);
 const demo=environment(api);demo.context.location.search='?demo=1';demo.context.location.pathname='/index.html';demo.storage.set('zoet-gebaar-demo-content-v1',JSON.stringify(changed));
 assert.equal((await demo.context.ZoetContent.ready).announcement,'Demo only');
 assert.equal(demo.context.document.body.children[0].children[0].href,'/index.html');
});

test('Demo admin can log in when the content request fails',async()=>{
 const e=environment(()=>{throw new Error('Failed to fetch')});e.load('admin.js');
 e.$('username').value='demo';e.$('access-code').value='zoetgebaar';await e.$('login-form').fire('submit');
 assert.equal(e.$('editor-panel').hidden,false);assert.equal(e.$('announcement').value,fixture.announcement);
 e.$('announcement').value='Offline demo';await e.$('editor-form').fire('input');await e.$('editor-form').fire('submit');
 assert.equal(JSON.parse(e.storage.get('zoet-gebaar-demo-content-v1')).announcement,'Offline demo');
});
