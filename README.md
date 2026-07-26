# BidMate Frontend

회사 자격조건과 관심사를 바탕으로 나라장터 공고를 탐색·추천하는 BidMate의 Next.js
프론트엔드입니다.

## 기술 스택

Next.js App Router · React · TypeScript · Tailwind CSS · AWS Cognito

## 로컬 개발 서버

필수 환경:

- Node.js 20 이상
- 함께 실행할 `bidmate-backend` API 서버

PowerShell 기준:

```powershell
# 최초 1회
npm install

# 환경변수 파일 준비
Copy-Item .env.example .env.local

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. 코드 변경은 자동으로
반영됩니다.

`.env.local`에서 로컬 백엔드를 사용하려면 다음처럼 설정합니다.

```dotenv
API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_COGNITO_USER_POOL_ID=<Cognito User Pool ID>
NEXT_PUBLIC_COGNITO_CLIENT_ID=<Cognito App Client ID>
```

`API_BASE_URL`은 Next 서버만 읽는 값입니다. `NEXT_PUBLIC_*` 값은 브라우저 번들에
포함되므로 비밀번호나 비밀키를 넣지 마세요. 실제 값이 들어간 `.env.local`은 Git에
커밋하지 않습니다.

백엔드는 별도 터미널에서 실행합니다.

```powershell
Set-Location ..\bidmate-backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- 프론트: [http://localhost:3000](http://localhost:3000)
- 백엔드 상태: [http://localhost:8000/health](http://localhost:8000/health)
- 백엔드 Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)

## 검사

```powershell
npm run lint
npm run build
```

## 주요 디렉터리

```text
src/app/         App Router 페이지와 백엔드 프록시 Route Handler
src/components/  화면 컴포넌트
src/lib/api/     브라우저에서 호출하는 API 클라이언트
src/lib/         인증, 타입, 표시용 변환, 이벤트 수집
```

브라우저는 Cognito ID 토큰을 같은 오리진 `/api/*` 경로로 보내고, Next Route Handler가
`API_BASE_URL`의 백엔드로 중계합니다.
