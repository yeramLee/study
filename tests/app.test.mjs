import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {once} from 'node:events';
import {createServer} from '../server.mjs';
import {callAI} from '../ai-client.mjs';
import {validateResult} from '../prompt.mjs';
const sample=await fs.readFile(new URL('../samples/meeting.txt',import.meta.url),'utf8');
const mock=JSON.parse(await fs.readFile(new URL('../mock-result.json',import.meta.url),'utf8'));
test('POSTECH a1/a2/a3 headers, body, response parsing',async()=>{
 for(const provider of ['gpt','gemini','claude']){
  let sent;
  const data=await callAI(sample,{POSTECH_AI_PROVIDER:provider,POSTECH_AI_API_KEY:'test-only-key'},async(url,options)=>{sent={url,options};return {ok:true,json:async()=>({message:JSON.stringify(mock)})};});
  assert.equal(data.actions.length,2);assert.match(sent.url,/https:\/\/genai.postech.ac.kr\/agent\/api\/a[123]\//);
  assert.equal(sent.options.headers['x-api-key'],'test-only-key');assert.equal(sent.options.headers.Authorization,provider==='gpt'?undefined:'test-only-key');
  const body=JSON.parse(sent.options.body);assert.equal(body.stream,false);assert.equal(body.model,undefined);assert.equal(body.messages,undefined);assert.ok(body.message.includes('미정'));
 }
});
test('missing key blocks request; HTTP and gateway failures are handled',async()=>{
 await assert.rejects(callAI(sample,{},()=>{throw new Error('should not call');}),/API_SETUP_REQUIRED/);
 for(const status of [401,403,429,500])await assert.rejects(callAI(sample,{POSTECH_AI_API_KEY:'test'},async()=>({ok:false,status})),new RegExp('UPSTREAM_'+status));
 await assert.rejects(callAI(sample,{POSTECH_AI_API_KEY:'test'},async()=>({ok:true,json:async()=>({code:'00012',message:'private detail'})})),/UPSTREAM_401/);
 await assert.rejects(callAI(sample,{POSTECH_AI_API_KEY:'test'},async()=>({ok:true,json:async()=>({message:'not json'})})),/INVALID_RESULT/);
});
test('evidence and schema checks',()=>{
 assert.ok(validateResult(mock,sample).actions.every(a=>a.evidenceMatched));
 assert.equal(validateResult(mock,'다른 원문').actions[0].evidenceMatched,false);
 assert.throws(()=>validateResult({...mock,actions:[{task:'잘못된 구조'}]},sample),/INVALID_RESULT/);
 assert.equal(validateResult(mock,sample).actions[1].due,'미정');
});
async function running(env,ai,fn){const s=createServer(env,ai);s.listen(0,'127.0.0.1');await once(s,'listening');try{await fn('http://127.0.0.1:'+s.address().port);}finally{await new Promise(r=>s.close(r));}}
const post=(base,transcript,extra={})=>fetch(base+'/api/summarize',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify({transcript})});
test('mock input, static file boundaries, cross-origin blocking',async()=>running({AI_MODE:'mock'},undefined,async base=>{
 assert.equal((await post(base,'')).status,400);assert.equal((await post(base,'변경된 자료')).status,400);assert.equal((await post(base,'x'.repeat(10001))).status,400);
 const response=await post(base,sample);assert.equal(response.status,200);assert.equal((await response.json()).mode,'mock');
 assert.equal((await fetch(base+'/.env')).status,404);assert.equal((await fetch(base+'/ai-client.mjs')).status,404);
 assert.equal((await post(base,sample,{Origin:'https://untrusted.invalid'})).status,403);
}));
test('live errors are sanitized and allow retry',async()=>{
 let first=true;
 await running({AI_MODE:'live'},async()=>{if(first){first=false;throw new Error('sensitive upstream details');}return mock;},async base=>{
  const fail=await post(base,sample);assert.equal(fail.status,502);assert.ok(!(await fail.text()).includes('sensitive'));
  assert.equal((await post(base,sample)).status,200);
 });
});
test('timeout is explained without returning a fake success',async()=>running({AI_MODE:'live'},async()=>{const e=new Error();e.name='TimeoutError';throw e;},async base=>{
 const res=await post(base,sample);assert.equal(res.status,502);assert.match((await res.json()).error,/시간/);
}));
