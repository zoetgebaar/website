const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
class Element {
  constructor() { this.dataset={};this.attributes={};this.events={};this.children=[];this.nodes={};this.hidden=false;this.textContent=''; const classes=new Set();this.classList={add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle:(c,on)=>{const yes=on??!classes.has(c);yes?classes.add(c):classes.delete(c);return yes}}; }
  addEventListener(type,fn){this.events[type]=fn}
  setAttribute(k,v){this.attributes[k]=v}
  querySelector(s){return this.nodes[s]}
  contains(){return false}
  focus(){this.focused=true}
  click(){this.events.click?.({target:this})}
}
const ids=['klein-gewoon','middel-gewoon','groot-gewoon','klein-zonder-gelatine','middel-zonder-gelatine','groot-zonder-gelatine'];
function setup(storage={},search=''){
 const nodes={};for(const k of ['.menu-toggle','.links','.site-header','.product-count','.cart-pill','#shop-status'])nodes[k]=new Element();
 nodes['.cart-pill'].nodes['.count']=new Element();
 const cards=ids.map((id,i)=>{const card=new Element();card.dataset.product=id;card.dataset.mix=i<3?'gewoon':'gelatinevrij';for(const k of ['.add-btn','.name','.variant'])card.nodes[k]=new Element();card.nodes['.name'].textContent=id;card.nodes['.variant'].textContent=i<3?'Met gelatine':'Gelatinevrij';return card});
 const groups=['gewoon','gelatinevrij'].map(m=>{const g=new Element();g.dataset.mix=m;return g});
 const chips=['alle','gewoon','gelatinevrij'].map(f=>{const e=new Element();e.dataset.filter=f;return e});
 const doc={documentElement:new Element(),activeElement:null,querySelector:s=>nodes[s],querySelectorAll:s=>s==='.shop-card'?cards:s==='.shop-group'?groups:chips,addEventListener:(t,fn)=>{if(t==='DOMContentLoaded')doc.ready=fn}};
 const data={...storage};
 const win={scrollY:0,matchMedia:()=>({addEventListener(){}}),addEventListener(){}};
 vm.runInNewContext(fs.readFileSync('site.js','utf8'),{document:doc,window:win,localStorage:{getItem:k=>data[k]??null,setItem:(k,v)=>data[k]=v},location:{search},URLSearchParams});doc.ready();return{nodes,cards,groups,chips,data};
}
test('Wishlist stores product ids and ignores unknown ones',()=>{
 const t=setup({'zoet-gebaar-wishlist-v2':'["middel-zonder-gelatine","nope","middel-zonder-gelatine"]'});
 assert.equal(t.nodes['.cart-pill'].nodes['.count'].textContent,1);
 t.cards[5].nodes['.add-btn'].click();assert.equal(t.data['zoet-gebaar-wishlist-v2'],'["middel-zonder-gelatine","groot-zonder-gelatine"]');
 assert.equal(t.cards[5].nodes['.add-btn'].textContent,'In je lijstje');
 assert.match(t.nodes['#shop-status'].textContent,/gelatinevrij, bewaard in je lijstje/);
 t.cards[4].nodes['.add-btn'].click();assert.equal(t.data['zoet-gebaar-wishlist-v2'],'["groot-zonder-gelatine"]');
});
test('An old wishlist with positions is migrated to product ids',()=>{
 const t=setup({'zoet-gebaar-wishlist-v1':'[1,4]'});
 assert.equal(t.nodes['.cart-pill'].nodes['.count'].textContent,2);
 t.cards[0].nodes['.add-btn'].click();
 assert.deepEqual(JSON.parse(t.data['zoet-gebaar-wishlist-v2']).sort(),['groot-gewoon','klein-gewoon','klein-zonder-gelatine']);
});
test('Filter from the URL hides the other mix and its group',()=>{
 const t=setup({},'?mix=gelatinevrij');
 assert.deepEqual(t.cards.map(c=>c.hidden),[true,true,true,false,false,false]);
 assert.deepEqual(t.groups.map(g=>g.hidden),[true,false]);
 assert.equal(t.nodes['.product-count'].textContent,'3 doosjes');
 t.chips[0].click();assert.equal(t.nodes['.product-count'].textContent,'6 doosjes');
});
test('The shop links the wishlist straight to the order page',()=>{
 const html=fs.readFileSync('webshop.html','utf8');
 assert.match(html,/<a class="cart-pill" href="bestellen.html\?v=20261126-2"/);
 assert.equal((html.match(/class="add-btn"/g)||[]).length,6);
});
