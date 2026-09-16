import http from 'node:http';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {callAI} from './ai-client.mjs';
import {validateResult} from './prompt.mjs';

const read = name => fs.readFile(new URL(name, import.meta.url), 'utf8');
const sample = await read('samples/meeting.txt');
const mock = JSON.parse(await read('mock-result.json'));
const publicFiles = {'/':['public/index.html','text/html; charset=utf-8'],'/app.js':['public/app.js','text/javascript; charset=utf-8'],'/style.css':['public/style.css','text/css; charset=utf-8']};
const errors = {
  API_SETUP_REQUIRED: '.env의 POSTECH_AI_API_KEY와 POSTECH_AI_PROVIDER를 확인해 주세요.',
  INVALID_RESULT: 'AI 응답이 정해진 JSON 형식과 다릅니다. 결과를 원문과 비교하고 다시 요청해 주세요.',
  UPSTREAM_401: 'API 인증 실패입니다. 서버의 키 설정을 확인해 주세요.',
  UPSTREAM_403: 'API 접근 권한이 없습니다. 학교 계정의 사용 권한을 확인해 주세요.',
  UPSTREAM_429: 'API 호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.'
};
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
export function createServer(env = process.env, ai = callAI) {
 let busy=false;
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
  const host=req.headers.host;
  if (!/^127\.0\.0\.1:\d+$/.test(host || '')) {json(res,403,{error:'127.0.0.1 주소로 접속해 주세요.'});return;}
  const url=new URL(req.url,`http://${host}`);
  const mode=env.AI_MODE || 'mock';
  if(req.method==='GET' && url.pathname==='/api/config'){json(res,200,{mode,sample});return;}
  if(req.method==='POST' && url.pathname==='/api/summarize'){
   if(req.headers.origin && req.headers.origin!==`http://${host}`){json(res,403,{error:'허용되지 않은 요청 출처입니다.'});return;}
   if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'JSON 요청이 필요합니다.'});return;}
   if(busy){json(res,429,{error:'이전 요청을 처리 중입니다. 완료 후 다시 시도해 주세요.'});return;}
   busy=true;
   try{
    const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>60000){json(res,413,{error:'입력이 너무 큽니다.'});return;}chunks.push(chunk);}const raw=Buffer.concat(chunks).toString('utf8');
    let payload;try{payload=JSON.parse(raw);}catch{json(res,400,{error:'요청 JSON을 확인해 주세요.'});return;}
    const transcript=typeof payload.transcript==='string'?payload.transcript.trim():'';
    if(!transcript || transcript.length>10000){json(res,400,{error:'회의록은 1~10,000자로 입력해 주세요.'});return;}
    let value;
    if(mode==='mock'){
     if(transcript!==sample.trim()){json(res,400,{error:'예시 모드는 제공된 가상 회의록만 처리합니다. 예시 불러오기를 누르세요.'});return;}
     value=mock;
    }else if(mode==='live'){value=await ai(transcript,env);}
    else {json(res,400,{error:'AI_MODE는 mock 또는 live여야 합니다.'});return;}
    json(res,200,{mode,result:validateResult(value,transcript)});
   }catch(error){
    const timeout=error.name==='TimeoutError'||error.name==='AbortError';
    json(res,502,{error:timeout?'응답 대기 시간이 초과되었습니다. 다시 시도해 주세요.':errors[error.message]||'AI 호출에 실패했습니다. 서버 설정과 네트워크를 확인해 주세요.'});
   }finally{busy=false;}
   return;
  }
  const file=publicFiles[url.pathname];
  if(req.method==='GET'&&file){try{res.writeHead(200,{'Content-Type':file[1],'Cache-Control':'no-store'});res.end(await read(file[0]));}catch{res.end('파일을 읽지 못했습니다.');}return;}
  json(res,404,{error:'찾을 수 없습니다.'});
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||8001);
 if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('PORT는 1024~65535 정수여야 합니다.');
 const server=createServer();
 server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'포트가 사용 중입니다. 기존 서버를 종료하거나 PORT를 바꾸세요.':'서버를 시작할 수 없습니다.');process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`회의록 실습: http://127.0.0.1:${port} (${process.env.AI_MODE||'mock'})`));
}
