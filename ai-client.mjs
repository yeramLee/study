import { SYSTEM_PROMPT } from './prompt.mjs';

// 출처: posicube-services/llm-agent-api 의 a1_a3_README.md
// a1~a3 단일 호출형 API를 사용합니다. OpenAI SDK 형식과 다릅니다.
const endpoints = {
  gpt: 'https://genai.postech.ac.kr/agent/api/a1/gpt',
  gemini: 'https://genai.postech.ac.kr/agent/api/a2/gemini',
  claude: 'https://genai.postech.ac.kr/agent/api/a3/claude'
};
export async function callAI(transcript, env = process.env, fetchImpl = fetch) {
  const provider=env.POSTECH_AI_PROVIDER || 'gpt';
  const endpoint=endpoints[provider];
  const key=env.POSTECH_AI_API_KEY;
  if (!endpoint || !key || key==='여기에_본인_API_키') throw new Error('API_SETUP_REQUIRED');
  const headers={'Content-Type':'application/json','x-api-key':key};
  // Claude/Gemini는 Bearer 접두사 없이 같은 키를 Authorization에도 보냅니다.
  if(provider!=='gpt')headers.Authorization=key;
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    redirect: 'error',
    headers,
    body: JSON.stringify({message:SYSTEM_PROMPT+'\n\n분석 대상 회의록 (JSON 문자열):\n'+JSON.stringify(transcript),stream:false}),
    signal: AbortSignal.timeout(45000)
  });
  if (!response.ok) throw new Error(`UPSTREAM_${response.status}`);
  const envelope = await response.json();
  if(envelope.code==='00012')throw new Error('UPSTREAM_401');
  if(envelope.code)throw new Error('UPSTREAM_GATEWAY');
  const content = envelope.message;
  if (typeof content !== 'string') throw new Error('INVALID_RESULT');
  const normalized=content.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i,'$1');
  try { return JSON.parse(normalized); } catch { throw new Error('INVALID_RESULT'); }
}
