# POSTECH AI로 만드는 회의록 정리 도구

**VS Code + Git + POSTECH AI API** 입문 실습입니다. AI로 코드를 만들고, 완성한 앱에서도 AI를 호출합니다. 대상은 코딩 입문자, 수업은 60분입니다. 설치와 키 발급은 미리 준비합니다.

회의 메모를 넣으면 **핵심 요약 / 확정된 결정 / 담당자·기한이 있는 할 일 / 미정 사항**을 보여줍니다. 할 일에는 원문 근거도 붙입니다. 사용자가 원문과 비교한 뒤 Markdown 초안을 내려받습니다. 음성 녹음이나 음성 인식은 이번 범위에 포함하지 않습니다.

## 준비

1. VS Code, Git, Node.js 22.9 이상을 설치합니다. 현재 지원되는 LTS 버전을 권장합니다.
2. 터미널에서 `git --version`, `node --version`, `npm --version`을 확인합니다.
3. [POSTECH AI](https://genai.postech.ac.kr)에 본인 계정으로 로그인합니다. 제공 문서 기준 **설정 > API Key 관리**에서 키를 발급합니다. 화면과 권한은 계정에 따라 확인하세요.
4. 코딩을 도와줄 AI를 준비합니다. VS Code AI 또는 웹 AI를 사용할 수 있습니다. **학교 API 키가 VS Code 코딩 도구에 자동으로 연동되는 것은 아닙니다.** 이 실습에서는 우리가 만드는 Node.js 앱이 학교 API를 호출합니다.

## 완성 예제 바로 실행

프로젝트 폴더를 VS Code로 열고 그 폴더의 터미널에서 실행합니다. 외부 패키지가 없어 `npm install`은 필요 없습니다.

```sh
npm start
```

PowerShell에서 npm.ps1 실행 정책 오류가 나오면 정책을 바꾸지 말고 `npm.cmd start`를 사용하거나 아래 명령을 실행합니다.

```sh
node --env-file-if-exists=.env server.mjs
```

[http://127.0.0.1:8001](http://127.0.0.1:8001)에 접속합니다. **HTML 파일을 직접 열지 마세요.** ‘가상 회의록 불러오기’, ‘회의록 정리하기’를 차례로 누릅니다.

기본은 **예시 모드(mock)** 입니다. 외부 호출이나 키 없이 지정된 가상 회의록에 대한 고정 응답을 보여줍니다. 다른 입력을 넣으면 고정 결과를 진짜 분석처럼 보여주지 않고 안내합니다. 예시 모드는 모델의 분석 능력을 시연하는 모드가 아닙니다.

## 실제 학교 API 연결

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```sh
cp .env.example .env
```

VS Code에서 **로컬 .env**를 열어 다음 값을 설정합니다. 이미 .env가 있다면 복사로 덮어쓰지 말고 기존 파일을 수정합니다.

```dotenv
AI_MODE=live
PORT=8001
POSTECH_AI_PROVIDER=gpt
POSTECH_AI_API_KEY=여기에_본인_API_키
```

키를 저장한 뒤 기존 서버를 Ctrl+C로 종료하고 `npm start`로 다시 실행합니다. 화면에 ‘실제 API 모드’가 표시되는지 확인하고 **가상 자료로 먼저** 실행합니다. 실제 키는 채팅, 소스코드, 스크린샷, Git에 넣지 않습니다. 강사는 키 입력 중 화면 공유를 잠시 멈춥니다.

설정 확인:

```sh
git check-ignore .env
git status --short
```

첫 명령은 `.env`를 표시해야 하고, 두 번째 명령의 변경 목록에는 `.env`가 없어야 합니다. `.gitignore`는 이미 추적한 비밀을 과거 커밋에서 지우지 않습니다. 노출된 키는 먼저 폐기하고 다시 발급합니다.

## 실제 요청 구조

```text
브라우저: 회의록 입력, 결과 검토
    POST /api/summarize (우리 로컬 서버)
Node.js: 환경 변수의 키를 붙여 학교 API 호출
    POST https://genai.postech.ac.kr/agent/api/a1/gpt
POSTECH AI: { "message": "모델의 답변 문자열" } 반환
Node.js: 답변 JSON 구조와 원문 근거 확인
브라우저: 텍스트로 표시, 사용자 검토 후 다운로드
```

우리 서버는 아래 형태를 사용합니다. `message` 안에는 작업 지시, 원하는 JSON 형식, 회의록이 들어갑니다.

```js
const response = await fetch('https://genai.postech.ac.kr/agent/api/a1/gpt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.POSTECH_AI_API_KEY
  },
  body: JSON.stringify({ message: prompt, stream: false })
});
const envelope = await response.json();
// envelope.message가 모델 답변 문자열입니다.
```

이 코드는 설명용 발췌입니다. HTTP 상태·시간 초과·응답 형식 처리는 `ai-client.mjs`와 `server.mjs`에 있습니다. **a1~a3 API는 OpenAI SDK의 model/messages 형식과 다릅니다.** 개별 모델 ID를 임의로 넣지 않습니다. GPT가 기본이며 `.env`의 provider를 `gemini` 또는 `claude`로 바꾸면 해당 엔드포인트와 인증 헤더를 선택합니다. 이용 가능 여부와 한도는 학교 계정에서 확인합니다.

## Git으로 따라 하기

### 저장소 받기

GitHub 업로드 후 강사가 공유한 **실제 URL**로 아래 자리 표시자를 바꿉니다.

```sh
git clone <강사가-공유한-저장소-URL> meeting-study
cd meeting-study
```

인터넷 없이 배포할 경우 ZIP 속 bundle 파일이 있는 폴더에서 실행합니다.

```sh
git clone meeting-study.bundle meeting-study
cd meeting-study
```

ZIP의 `source`는 완성 코드이며 .git이 없습니다. 단계별 실습은 bundle을 clone하거나 GitHub에서 clone하세요. 처음 커밋 전에 본인 이름과 이메일을 설정합니다. 이메일은 커밋에 기록됩니다.

```sh
git config user.name "본인 이름"
git config user.email "본인 이메일"
git switch -c my-practice step-01
npm start
```

### 1단계 · 화면과 브라우저-서버 관계 (10분)

`step-01`은 화면과 정적 파일 서버만 준비된 상태입니다. 아래 요청으로 각 파일 역할을 이해한 다음 샘플을 입력하고 버튼 반응을 확인합니다.

```text
public/index.html, public/app.js, server.mjs를 읽고 역할을 설명해줘.
브라우저 코드와 서버 코드가 각각 어디서 실행되는지 알려줘.
실제 API를 부르기 전에 필요한 작업을 작은 단계로 나눠줘.
지금은 코드를 수정하지 마.
```

### 2단계 · 예시 응답으로 결과 화면 구현 (10분)

```text
가상의 연구실 회의록 정리 도구를 만들어줘.
서버의 POST /api/summarize에 transcript를 보내게 해줘.
일단 samples/meeting.txt와 mock-result.json으로 고정 예시만 보여줘.
다른 회의록이면 예시 모드의 한계를 안내해줘.
요약, 결정 사항, 담당자·기한·원문 근거가 있는 할 일,
미정 사항을 표시하고 입력 없음과 처리 중 상태를 구현해줘.
응답은 textContent로 표시하고 API 키는 만들거나 넣지 마.
```

예제 답안은 `step-02`입니다. 화면에서 ‘장소 확인 기한’이 ‘미정’인지, 자료 배포 제안이 결정으로 잘못 들어가지 않았는지 확인합니다.

```sh
git diff
git add public/app.js server.mjs
git diff --staged
git commit -m "예시 회의록 정리 화면 구현"
```

AI가 추가로 바꾼 파일이 있다면 확인하고 파일명을 지정해서 함께 add합니다.

### 3단계 · POSTECH AI 연결 (20분)

```text
다음 공식 문서의 a1~a3 단일 호출형 GPT API를 연결해줘.
https://github.com/posicube-services/llm-agent-api/blob/main/a1_a3_README.md
POST https://genai.postech.ac.kr/agent/api/a1/gpt
헤더는 x-api-key와 Content-Type: application/json,
본문은 {message: 요청문, stream: false}, 응답은 {message: 답변문}이야.
키는 서버에서 process.env.POSTECH_AI_API_KEY로만 읽어줘.
AI_MODE가 mock이면 기존 예시, live이면 실제 API를 호출해줘.
원문에 없는 담당자·기한은 미정으로 쓰고 제안과 결정을 구분해줘.
각 할 일에는 원문의 근거 문장을 넣고 JSON 구조를 검사해줘.
401·403·429, 시간 초과, 잘못된 JSON을 처리해줘.
키나 회의록을 로그로 출력하지 마. 먼저 변경 계획을 설명해줘.
```

예제 답안은 `step-03`입니다. 이 단계부터 `.env`를 설정해 실제 API를 사용할 수 있습니다. 실패 시 자동으로 mock 결과를 반환하지 않습니다.

```sh
git diff
git add ai-client.mjs prompt.mjs server.mjs .env.example .gitignore
git diff --staged
git commit -m "POSTECH AI 회의록 정리 연결"
```

### 4단계 · 검토 후 다운로드 (10분)

```text
결과를 원문과 비교했다는 체크박스를 넣어줘.
체크한 경우에만 Markdown 다운로드를 활성화해줘.
입력을 수정하거나 다시 요청하면 예전 결과와 체크 상태를 초기화해줘.
원문에서 근거 문장을 찾을 수 없으면 주의 표시를 해줘.
내보낸 파일은 예시 결과인지 실제 API 초안인지 구분해줘.
```

예제 답안은 `step-04`이며 `main`도 완성 예제입니다.

```sh
git diff
git add public/app.js public/index.html
git diff --staged
git commit -m "검토 후 Markdown 다운로드 추가"
```

### 답안 확인과 되돌리기 (5분)

```sh
git show step-03:ai-client.mjs
git diff step-02 step-03 -- ai-client.mjs server.mjs
git log --oneline --decorate
```

현재 작업을 커밋하고 `git status`가 깨끗한지 확인한 뒤 `git switch -c answer-check step-04`로 답안 브랜치를 만듭니다. 실행 중 서버를 재시작하고 브라우저를 새로고침합니다. 돌아갈 때는 `git switch my-practice`입니다. 브랜치가 이미 있다면 -c 없이 전환합니다.

취소 연습은 별도 브랜치에서 제목 한 줄 변경을 커밋한 뒤 `git revert --no-edit HEAD`로 취소 커밋을 만드는 방식으로 진행하세요. .env는 Git에서 제외하므로 브랜치를 바꿔도 로컬 파일이 남습니다. 앞 단계로 돌아갈 때는 mock으로 설정하고 서버를 재시작합니다.

## 확인할 동작

- 빈 입력은 차단한다.
- mock은 가상 자료에만 고정 결과를 보여준다.
- 실제 API 모드에서 원문을 바꾸면 모델이 새 입력을 처리한다.
- 담당자·기한이 없으면 ‘미정’이며, 제안은 확정 결정으로 둔갑하지 않는다.
- 할 일의 근거를 원문과 비교한다. 정확한 문자열 일치가 의미의 정확성을 보장하지는 않는다.
- 실패 메시지에 키나 원문이 포함되지 않고 다시 요청할 수 있다.
- 입력 변경 후 이전 결과를 다운로드할 수 없다.
- .env와 prompt를 변경했으면 서버를 재시작한다.

## 파일 역할

| 파일 | 역할 |
|---|---|
| public/index.html, style.css | 입력·결과 화면 |
| public/app.js | 로컬 서버 요청과 결과 렌더링 |
| server.mjs | 로컬 HTTP 서버, 입력 검증, mock/live 분기 |
| ai-client.mjs | 학교 API 요청과 응답 문자열 파싱 |
| prompt.mjs | 작업 지시와 결과 구조 검사 |
| .env.example | 키가 비어 있는 설정 예시 |
| samples/meeting.txt | 실습용 가상 회의록 |
| tests/ | 외부 API 호출 없는 자동 검사 |

## 테스트와 제한

`npm test`로 학교 API 규격, 오류 처리, 근거 검사, mock 결과를 모의 응답으로 검사합니다. 실제 키가 없는 상태에서는 실 API 성공 여부를 검증할 수 없습니다. 키를 로컬에 설정한 뒤 위 동작을 확인하세요. 요청은 45초 제한이며 자동 재시도는 하지 않습니다.

학습용으로 127.0.0.1에만 서버를 띄웁니다. 사용자 인증이 없으므로 그대로 공용 서버에 배포하지 마세요. 입력은 10,000자 이내, 동시에 한 요청만 처리합니다. 서버는 원문과 키를 저장하지 않지만 학교/모델 제공자의 처리·보관 정책은 별도로 적용됩니다. 실제 회의록은 학교 정책을 확인한 후 사용합니다.

## GitHub 공유

실제 업로드 전 내용과 공개 범위를 정합니다. 키 없는 이 저장소에서:

```sh
git remote add origin <본인의-빈-GitHub-저장소-URL>
git push -u origin main
git push origin --tags
```

origin이 이미 있으면 `git remote -v`로 확인하고 중복 추가하지 않습니다. 참가자는 자기 Fork를 clone하면 자신의 `my-practice` 브랜치를 push할 수 있습니다. 강사 저장소에 직접 push할 필요는 없습니다.

## 참고 자료

- [POSTECH AI 키 발급 사이트](https://genai.postech.ac.kr)
- [a1~a3 호출 규격](https://github.com/posicube-services/llm-agent-api/blob/main/a1_a3_README.md)
- [전체 API 안내](https://github.com/posicube-services/llm-agent-api)
- [Git 변경 기록](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)

작성 및 문서 확인: 2026-09-16. 본 자료는 비공식 학습 예제입니다.
