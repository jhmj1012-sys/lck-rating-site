# GG 레이팅

Next.js 16 기반의 LCK 경기 허브입니다. 비로그인 사용자는 경기와 반응을 읽을 수 있고, Google 로그인 사용자는 승부예측, 선수 평점, 댓글에 참여할 수 있습니다. 운영자는 `/admin`에서 경기/결과/로스터/댓글 공개 상태를 관리할 수 있습니다.

## 실행

```bash
cmd /c npm run dev
```

PowerShell 실행 정책 때문에 이 저장소에서는 `cmd /c npm run dev` 방식이 가장 안정적입니다.

## 환경변수

`.env.local`에 아래 값을 넣어 주세요.

```bash
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
ADMIN_EMAILS=admin@example.com
```

`ADMIN_EMAILS`에는 관리자 권한을 줄 이메일을 쉼표로 구분해 넣습니다.

## 현재 저장 구조

- 현재 구현은 `data/service-store.json` 파일을 영속 저장소로 사용합니다.
- 첫 실행 시 시드 데이터가 자동 생성됩니다.
- 이 구조 덕분에 로컬에서는 바로 동작하지만, Vercel 배포용 실서비스에서는 관리형 SQL DB로 교체하는 것이 필요합니다.

## 검증

```bash
cmd /c npm run lint
cmd /c node_modules\.bin\tsc --noEmit
cmd /c npm run build
```
