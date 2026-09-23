const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
class Element {
  constructor() { this.dataset={};this.attributes={};this.events={};this.children=[];this.nodes={};this.hidden=false;this.textContent=''; const classes=new Set();this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>{const yes=on??!classes.has(c);yes?classes.add(c):classes.delete(c);return yes}}; }
  addEventListener(type,fn){this.events[type]=fn}
  setAttribute(k,v){this.attributes[k]=v}
  querySelector(s){return this.nodes[s]}
  append(...children){this.children.push(...children)}
  replaceChildren(){this.children=[]}
  cloneNode(){return new Element()}
  focus(){this.focused=true}
  showModal(){this.open=true}
  close(){this.open=false;this.events.close?.()}
  click(){this.events.click?.({target:this})}
}
function setup(storage='[]',search=''){
 const nodes={};for(const k of ['.menu-toggle','.links','.product-count','.cart-pill','.wishlist-dialog','.wishlist-items','#shop-status'])nodes[k]=new Element();
 nodes['.cart-pill'].tagName='BUTTON';nodes['.cart-pill'].nodes['.count']=new Element();
 for(const k of ['.close-dialog','.clear-list'])nodes['.wishlist-dialog'].nodes[k]=new Element();
 const cards=Array.from({length:4},(_,i)=>{const card=new Element();card.dataset.mix=i%2?'gelatinevrij':'gewoon';for(const k of ['.add-btn','h3','img'])card.nodes[k]=new Element();card.nodes.h3.textContent=i<2?'Klein doosje':'Groot doosje';return card});
 const chips=['alle','gewoon','gelatinevrij'].map(f=>{const e=new Element();e.dataset.filter=f;return e});
 const doc={querySelector:s=>nodes[s],querySelectorAll:s=>s==='.shop-card'?cards:chips,createElement:()=>new Element(),addEventListener:(t,fn)=>{if(t==='DOMContentLoaded')doc.ready=fn}};
 let data=storage;
 vm.runInNewContext(fs.readFileSync('site.js','utf8'),{document:doc,window:{matchMedia:()=>({addEventListener(){}})},localStorage:{getItem:()=>data,setItem:(_,value)=>data=value},location:{search,href:'https://zoetgebaar.github.io/website/webshop.html'+search,assign:url=>nodes.destination=url},URL,URLSearchParams});doc.ready();return{nodes,cards,chips,data:()=>data};
}

const t=setup();
assert.equal(t.nodes['.cart-pill'].classList.contains('show'),true);
t.cards[1].nodes['.add-btn'].click();assert.equal(t.data(),'[1]');
t.nodes['.cart-pill'].click();assert.equal(new URL(t.nodes.destination).pathname,'/website/bestellen.html');
assert.equal(new URL(t.nodes.destination).searchParams.get('v'),'20260923-4');
const demo=setup('[]','?demo=1');demo.nodes['.cart-pill'].click();assert.equal(new URL(demo.nodes.destination).searchParams.get('demo'),'1');
const html=fs.readFileSync('webshop.html','utf8');assert.match(html,/<a class="cart-pill show" href="bestellen.html\?v=20260923-4"/);
assert.doesNotMatch(html,/aria-haspopup="dialog"/);
console.log('Passed: empty wishlist stays clickable; legacy button navigates; selection persists; demo mode carries over; current HTML uses a real order link.');
