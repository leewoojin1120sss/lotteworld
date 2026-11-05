// Compare public reference nodes without changing the site's coordinates.
// Never reads, writes, or submits a visitor's position.
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../data/georeference.json',import.meta.url)));
const controls=data.anchors.map(a=>({...a,osmId:Number(new URL(a.sourceUrl).pathname.split('/').at(-1))}));
const ids=[...new Set([...controls.map(a=>a.osmId),...data.excluded.flatMap(a=>a.osmIds)])];
const endpoint='https://api.openstreetmap.org/api/0.6/nodes.json?nodes='+ids.join(',');
try{
 const response=await fetch(endpoint,{headers:{Accept:'application/json','User-Agent':'LotteworldYaho-coordinate-audit (https://github.com/leewoojin1120sss/lotteworld)'},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error('OSM HTTP '+response.status);
 const body=await response.text();if(body.length>500000)throw new Error('Unexpectedly large OSM response');
 const nodes=JSON.parse(body).elements;if(!Array.isArray(nodes))throw new Error('Invalid OSM response');
 const rows=controls.map(a=>{
  const node=nodes.find(n=>n.type==='node'&&n.id===a.osmId);
  return {id:a.id,osmId:a.osmId,sourceUrl:a.sourceUrl,match:!!node&&node.lat===a.lat&&node.lon===a.lng,
   expected:{lat:a.lat,lng:a.lng,version:a.osmVersion},
   current:node?{lat:node.lat,lng:node.lon,version:node.version,updatedAt:node.timestamp,name:node.tags?.name,level:node.tags?.level,layer:node.tags?.layer}:null};
 });
 const report={checkedAt:new Date().toISOString(),endpoint,checked:rows.length,matched:rows.filter(r=>r.match).length,rows,
  excludedCandidates:nodes.filter(n=>!controls.some(a=>a.osmId===n.id)).map(n=>({id:n.id,lat:n.lat,lng:n.lon,version:n.version,name:n.tags?.name}))};
 console.log(JSON.stringify(report,null,2));
 if(report.matched!==report.checked)process.exitCode=1;
}catch(error){
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),status:'unavailable',message:error.message,coordinatesUnchanged:true}));
 process.exitCode=1;
}
