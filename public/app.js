const $=id=>document.getElementById(id);
let sample='', result=null, resultMode='';
function resetResult(){result=null;$('result').hidden=true;$('reviewed').checked=false;$('download').disabled=true;}
function fillList(id,items){$(id).replaceChildren();for(const text of items.length?items:['없음']){const li=document.createElement('li');li.textContent=text;$(id).append(li);}}
function render(data){
 result=data.result;resultMode=data.mode;
 fillList('summary',result.summary);fillList('decisions',result.decisions);fillList('questions',result.openQuestions);
 $('actions').replaceChildren();
 for(const a of result.actions){const row=document.createElement('tr');for(const value of [a.task,a.owner,a.due,a.evidence]){const td=document.createElement('td');td.textContent=value;row.append(td);}if(!a.evidenceMatched){const warn=document.createElement('p');warn.textContent='원문과 정확히 일치하지 않음: 직접 확인 필요';warn.className='warning';row.lastChild.append(warn);}$('actions').append(row);}
 if(!result.actions.length){const row=document.createElement('tr'),td=document.createElement('td');td.colSpan=4;td.textContent='추출된 할 일이 없습니다.';row.append(td);$('actions').append(row);}
 $('result-mode').textContent=resultMode==='mock'?'예시 결과: 제공된 가상 회의록에 대응하는 고정 응답입니다.':'실제 API 응답 초안: 원문과 비교해 검토하세요.';
 $('result').hidden=false;
}
$('sample').addEventListener('click',()=>{$('transcript').value=sample;resetResult();$('status').textContent='가상 회의록을 불러왔습니다.';});
$('transcript').addEventListener('input',()=>{resetResult();$('status').textContent='입력이 바뀌었습니다. 다시 정리해 주세요.';});
$('reviewed').addEventListener('change',()=>{$('download').disabled=!$('reviewed').checked||!result;});
$('submit').addEventListener('click',async()=>{
 resetResult();const transcript=$('transcript').value.trim();if(!transcript){$('status').textContent='회의록을 입력해 주세요.';return;}
 $('submit').disabled=true;$('sample').disabled=true;$('transcript').disabled=true;$('status').textContent='회의록을 정리하는 중입니다…';
 try{const response=await fetch('/api/summarize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({transcript})});const data=await response.json();if(!response.ok)throw new Error(data.error||'요청 실패');render(data);$('status').textContent='정리가 끝났습니다. 원문과 비교해 결과를 검토하세요.';}
 catch(error){$('status').textContent=error.message||'연결에 실패했습니다. 서버 실행 상태를 확인해 주세요.';}
 finally{$('submit').disabled=false;$('sample').disabled=false;$('transcript').disabled=false;}
});
$('download').addEventListener('click',()=>{
 if(!result||!$('reviewed').checked)return;
 const md=['# 회의록 정리 초안',resultMode==='mock'?'가상 회의록 고정 예시 결과':'AI API 결과를 사용자가 검토한 초안','## 핵심 요약',...result.summary.map(x=>'- '+x),'## 결정 사항',...result.decisions.map(x=>'- '+x),'## 할 일',...result.actions.map(a=>`- ${a.task}\n  - 담당자: ${a.owner}\n  - 기한: ${a.due}\n  - 근거: ${a.evidence}${a.evidenceMatched?'':' (원문 정확 일치 미확인)'}`),'## 미정 사항',...result.openQuestions.map(x=>'- '+x)].join('\n\n');
 const url=URL.createObjectURL(new Blob([md],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='meeting-notes.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
fetch('/api/config').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(data=>{sample=data.sample;$('mode').textContent=data.mode==='mock'?'예시 모드 · 외부 API 호출 없음':'실제 API 모드 · 입력 내용을 학교 API로 전송';$('submit').disabled=false;}).catch(()=>{$('mode').textContent='서버 연결 실패: npm start 실행 후 127.0.0.1 주소로 접속하세요.';});
