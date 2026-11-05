import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

function scriptEnv(folderId='folder'){
 const saved=[];
 const ContentService={MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(type){this.type=type;return this;}})};
 const ctx={ContentService,PropertiesService:{getScriptProperties:()=>({getProperty:()=>folderId})},Utilities:{base64Decode:s=>[...Buffer.from(s,'base64')],formatDate:()=> '20261105_120000',getUuid:()=> '12345678-ffff',newBlob:(bytes,type,name)=>({bytes,type,name})},DriveApp:{getFolderById:id=>({getId:()=>id,createFile:f=>saved.push({id,...f})})}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(new URL('../submission-server/Code.gs',import.meta.url),'utf8'),ctx);
 return {ctx,saved};
}
test('submission creates a named image in the selected folder',()=>{
 const {ctx,saved}=scriptEnv(),id='a'.repeat(32),image=Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
 const result=JSON.parse(ctx.doPost({postData:{contents:JSON.stringify({requestId:id,name:'홍길동',final:true,image})}}).text);
 assert.equal(result.ok,true);assert.equal(saved.length,1);assert.equal(saved[0].id,'folder');assert.match(saved[0].name,/홍길동_최종_/);
 assert.match(ctx.doGet({parameter:{check:'1'}}).text,/접근할 수 있습니다/);
});
test('missing folder returns a failure',()=>{
 const {ctx,saved}=scriptEnv(''),id='b'.repeat(32),image=Buffer.from([137,80,78,71,13,10,26,10]).toString('base64');
 const result=JSON.parse(ctx.doPost({postData:{contents:JSON.stringify({requestId:id,name:'시험',final:false,image})}}).text);
 assert.equal(result.ok,false);assert.match(result.error,/FOLDER_ID/);assert.equal(saved.length,0);assert.match(ctx.doGet({parameter:{check:'1'}}).text,/FOLDER_ID/);
 assert.equal(ctx.doGet({parameter:{id,callback:'alert(1)'}}).text,'Invalid request');
});
