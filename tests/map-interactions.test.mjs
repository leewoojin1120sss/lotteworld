import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function bindMapGestures(){'),source.indexOf('function bindEvents(){'));
function fixture(){
 const handlers={},captured=new Set(),opened=[],manual=[],view={x:0,y:0,scale:1,width:100,height:100},state={floor:'1F',pick:false};let transforms=0;
 const stage={clientWidth:100,clientHeight:100,getBoundingClientRect:()=>({left:0,top:0}),addEventListener:(name,fn)=>handlers[name]=fn,setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture:id=>captured.delete(id)};
 const ctx={$:()=>stage,view,state,park:null,openPlace:id=>opened.push(id),setManualPosition:p=>manual.push(p),toast:()=>{},zoom:()=>{},applyTransform:()=>transforms++,fitMap:()=>{},ResizeObserver:class{observe(){}}};
 vm.runInNewContext(code+';bindMapGestures();',ctx);
 const target=(id=null,control=false)=>({closest:selector=>selector.startsWith('#mapPins')?(id?{dataset:{openPlace:id}}:null):(id||control?{}:null)});
 const event=(id,x,y,poi=null)=>({pointerId:id,clientX:x,clientY:y,button:0,pointerType:'touch',target:target(poi)});
 return {handlers,opened,manual,view,state,event,target,transforms:()=>transforms,captured};
}
test('a small finger jitter opens the tapped pin exactly once without moving the map',()=>{
 const f=fixture();f.handlers.pointerdown(f.event(1,30,30,'ride-13'));f.handlers.pointermove(f.event(1,34,32,'ride-13'));f.handlers.pointerup(f.event(1,34,32,'ride-13'));
 assert.deepEqual(f.opened,['ride-13']);assert.equal(f.transforms(),0);assert.equal(f.captured.size,0);
 let prevented=false;f.handlers.click({detail:1,target:f.target('ride-13'),preventDefault:()=>prevented=true,stopPropagation(){}});assert.ok(prevented);
 let keyboardPrevented=false;f.handlers.click({detail:0,target:f.target('ride-13'),preventDefault:()=>keyboardPrevented=true,stopPropagation(){}});assert.equal(keyboardPrevented,false);
});
test('dragging from a pin pans the map instead of activating the attraction',()=>{
 const f=fixture();f.handlers.pointerdown(f.event(1,20,20,'ride-13'));f.handlers.pointermove(f.event(1,50,55,'ride-13'));f.handlers.pointerup(f.event(1,50,55,'ride-13'));
 assert.equal(f.view.x,30);assert.equal(f.view.y,35);assert.deepEqual(f.opened,[]);
});
test('a cancelled touch releases capture and never opens a place',()=>{
 const f=fixture();f.handlers.pointerdown(f.event(1,20,20,'ride-13'));f.handlers.pointercancel(f.event(1,20,20,'ride-13'));assert.deepEqual(f.opened,[]);assert.equal(f.captured.size,0);
});
test('pinching over pins never opens either place when fingers lift',()=>{
 const f=fixture();f.handlers.pointerdown(f.event(1,10,10,'ride-13'));f.handlers.pointerdown(f.event(2,70,70,'ride-14'));f.handlers.pointermove(f.event(2,80,80,'ride-14'));f.handlers.pointerup(f.event(2,80,80));f.handlers.pointerup(f.event(1,10,10));assert.deepEqual(f.opened,[]);assert.equal(f.captured.size,0);
});
test('manual placement still accepts a stationary background touch',()=>{
 const f=fixture();f.state.pick=true;f.handlers.pointerdown(f.event(1,50,40));f.handlers.pointerup(f.event(1,50,40));assert.equal(f.manual.length,1);assert.equal(f.manual[0].x,500);assert.equal(f.manual[0].y,400);
});
test('ordinary control buttons retain native click behavior',()=>{
 const f=fixture(),e=f.event(1,50,40);e.target=f.target(null,true);f.handlers.pointerdown(e);f.handlers.pointerup(e);assert.equal(f.captured.size,0);assert.equal(f.transforms(),0);assert.deepEqual(f.opened,[]);
});
