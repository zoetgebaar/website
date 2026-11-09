const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
class Element {
  constructor() { this.dataset={};this.attributes={};this.events={};this.children=[];this.nodes={};this.hidden=false;this.textContent=''; const classes=new Set();this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>{const yes=on??!classes.has(c);yes?classes.add(c):classes.delete(c);return yes}}; }
  addEventListener(type,fn){this.events[type]=fn}
  setAttribute(k,v){this.attributes[k]=v}
  querySelector(s){return this.nodes[s]}
  focus(){this.focused=true}
  click(){this.events.click?.({target:this})}
}
function setup(storage='[]',search=''){
 const nodes={};for(const k of ['.menu-toggle','.links','.product-count','.cart-pill','#shop-status'])nodes[k]=new Element();
 nodes['.cart-pill'].nodes['.count']=new Element();
 const cards=Array.from({length:6},(_,i)=>{const card=new Element();card.dataset.mix=i%2?'gelatinevrij':'gewoon';for(const k of ['.add-btn','h3','.weight'])card.nodes[k]=new Element();card.nodes.h3.textContent=['Klein','Klein','Middelgroot','Middelgroot','Groot','Groot'][i]+' doosje';return card});
 const chips=['alle','gewoon','gelatinevrij'].map(f=>{const e=new Element();e.dataset.filter=f;return e});
 const doc={querySelector:s=>nodes[s],querySelectorAll:s=>s==='.shop-card'?cards:chips,addEventListener:(t,fn)=>{if(t==='DOMContentLoaded')doc.ready=fn}};
 let data=storage;
 vm.runInNewContext(fs.readFileSync('site.js','utf8'),{document:doc,window:{matchMedia:()=>({addEventListener(){}})},localStorage:{getItem:()=>data,setItem:(_,value)=>data=value},location:{search},URLSearchParams});doc.ready();return{nodes,cards,chips,data:()=>data};
}
test('Wishlist stays visible when empty, persists selections and ignores stale ids',()=>{
 const t=setup('[1, 9, "x", 1]');
 assert.equal(t.nodes['.cart-pill'].classList.contains('show'),true);
 assert.equal(t.nodes['.cart-pill'].nodes['.count'].textContent,1);
 t.cards[5].nodes['.add-btn'].click();assert.equal(t.data(),'[1,5]');
 assert.equal(t.cards[5].nodes['.add-btn'].textContent,'Bewaard in je lijstje ✓');
 t.cards[1].nodes['.add-btn'].click();assert.equal(t.data(),'[5]');
});
test('Filter from the URL hides the other mix and counts the six boxes',()=>{
 const t=setup('[]','?mix=gelatinevrij');
 assert.deepEqual(t.cards.map(c=>c.hidden),[true,false,true,false,true,false]);
 assert.equal(t.nodes['.product-count'].textContent,'3 doosjes');
 t.chips[0].click();assert.equal(t.nodes['.product-count'].textContent,'6 doosjes');
});
test('The shop links the wishlist straight to the order preview',()=>{
 const html=fs.readFileSync('webshop.html','utf8');
 assert.match(html,/<a class="cart-pill show" href="bestellen.html\?v=20261109-2"/);
 assert.equal((html.match(/class="add-btn"/g)||[]).length,6);
});
