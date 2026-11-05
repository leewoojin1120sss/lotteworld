import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {getSubmissionReceipt} from '../missions.js';

function scriptEnv(folderId='folder'){
 const cache=new Map(),saved=[];
 const ContentService={MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(type){this.type=type;return this;}})};
 const ctx={ContentService,CacheService:{getScriptCache:()=>({put:(k,v)=>cache.set(k,v),get:k=>cache.get(k)})},PropertiesService:{getScriptProperties:()=>({getProperty:()=>folderId})},Utilities:{base64Decode:s=>[...Buffer.from(s,'base64')],formatDate:()=> '20261105_120000',getUuid:()=> '12345678-ffff',newBlob:(bytes,type,name)=>({bytes,type,name})},DriveApp:{getFolderById:id=>({getId:()=>id,createFile:f=>saved.push({id,...f})})}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../submission-server/Code.gs',import.meta.url),'utf8'),ctx);
 return {ctx,saved};
}
test('submission creates a named image and exposes its actual stored result by random receipt',()=>{
 const {ctx,saved}=scriptEnv(),id='a'.repeat(32),image=Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
 const result=JSON.parse(ctx.doPost({postData:{contents:JSON.stringify({requestId:id,name:'홍길동',final:true,image})}}).text);
 assert.equal(result.ok,true);assert.equal(saved.length,1);assert.equal(saved[0].id,'folder');assert.match(saved[0].name,/홍길동_최종_/);
 const response=ctx.doGet({parameter:{id,callback:'__missionReceipt_'+id}});assert.equal(response.type,'js');assert.ok(response.text.includes('"ok":true'));assert.match(ctx.doGet({parameter:{check:'1'}}).text,/접근할 수 있습니다/);
});
test('missing folder returns a failure receipt, and invalid callbacks cannot inject code',()=>{
 const {ctx,saved}=scriptEnv(''),id='b'.repeat(32),image=Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
 const result=JSON.parse(ctx.doPost({postData:{contents:JSON.stringify({requestId:id,name:'시험',final:false,image})}}).text);
 assert.equal(result.ok,false);assert.match(result.error,/FOLDER_ID/);assert.equal(saved.length,0);assert.match(ctx.doGet({parameter:{check:'1'}}).text,/FOLDER_ID/);
 assert.ok(ctx.doGet({parameter:{id,callback:'__missionReceipt_'+id}}).text.includes('"ok":false'));
 assert.equal(ctx.doGet({parameter:{id,callback:'alert(1)'}}).text,'Invalid request');
});
test('a missing server response remains unconfirmed; a received response is returned accurately',async()=>{
 const prevWindow=globalThis.window,prevDocument=globalThis.document;
 try{
  globalThis.window={};globalThis.document={createElement:()=>({remove(){}}),head:{append(){}}};
  assert.deepEqual(await getSubmissionReceipt('c'.repeat(32),{timeoutMs:15,intervalMs:5}),{pending:true});
  globalThis.document.head.append=script=>{const cb=new URL(script.src).searchParams.get('callback');queueMicrotask(()=>globalThis.window[cb]({ok:false,error:'저장 실패'}));};
  assert.deepEqual(await getSubmissionReceipt('d'.repeat(32),{timeoutMs:100,intervalMs:5}),{ok:false,error:'저장 실패'});
 }finally{globalThis.window=prevWindow;globalThis.document=prevDocument;}
});
