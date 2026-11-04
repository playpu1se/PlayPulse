# 인수인계
마지막 갱신: 2026-11-04 23:30 (자동 수집 복구 중)

## 지금 상태 (한눈에)
- 사이트: https://playpulse-ochre.vercel.app — 열려 있음 · `/api/health` 정상
- 저장소: https://github.com/playpu1se/PlayPulse — 공개 · 작성자 playpu1se 만
- 수집: GitHub Actions `collect` 30분마다(매시 11·41분 · 예약 실행 확인 중) → Turso(도쿄) → 끝나면 `/api/revalidate` 로 사이트 바로 새로고침
- 이 컴퓨터에서 도는 것: 없음 (로컬 수집기·개발 서버 모두 끔). 컴퓨터를 꺼도 사이트·수집은 계속 돌아요.
- 데이터: 2026-11-04 17:40 부터 쌓이는 중 · 마지막 수집 21:10 · 게임 약 609개 · 수집 12번

## 한 일
- [x] v0.1: 순위 6종 · 검색 · 급성장 · 게임 상세(추정 수익·기간 표·그래프·14일 예측) · 내 게임 · 내 목록 · 알림 · 설정
- [x] 수익 계산법 페이지 = 관리자만(`ADMIN_EMAILS`) · 전체 합계 검사(로블록스 2026 Q3 실적과 비교)
- [x] DB: 로컬 = SQLite 파일 · 서버 = Turso(libSQL HTTP) — `src/lib/db.ts`
- [x] 공개 데이터 5분 저장(`src/lib/cached.ts`) + 수집 끝나면 바로 지움
- [x] 공개 올리기 = `scripts/push-public.sh` 만 (익명 검사 · 지난 기록까지 · 실패하면 안 올라감)
- [x] 60일 규칙 대비 `keepalive.yml`(매달 collect 다시 켜기 · 효과는 확인 전)

## 남은 일
- [ ] Vercel ↔ GitHub 자동 배포 연결(Vercel GitHub 앱을 이 저장소에 설치) — 그 전까지는 `vercel deploy --prod`
- [ ] 「왜 인기인가」 기능: ① 무료 신호(업데이트 날짜·설명 변화·유튜브) ② AI 요약(유료 API · 출처 필수)
- [ ] 게임별 수익 오차 확인(개발자가 직접 밝힌 수익 자료 더 모으기) — 지금은 검증 전 추정

## 결정
- 기술: Next.js 15.5.29 + TypeScript + SQLite/libSQL · 그래프 recharts · Node 24
- 수익 = 로블록스 공개 숫자 + 공식 「수익 순위」 차트로 추정 · 다른 분석 사이트 숫자로 보정하지 않음
- 배포: Vercel(Hobby) + Turso(무료) + GitHub Actions(공개 저장소) → `문서/배포.md`
- 결제 · 요금제 · 잠금 없음

## 비밀값 (값은 여기 없음)
- Vercel: `TURSO_DATABASE_URL` · `TURSO_AUTH_TOKEN` · `ADMIN_EMAILS` · `REVALIDATE_SECRET`
- GitHub Secrets: `TURSO_DATABASE_URL` · `TURSO_AUTH_TOKEN` · `REVALIDATE_SECRET` · Variables: `SITE_URL`
- 로컬 `.env.local`(git 제외): 위 값의 `_PROD` 사본 · 로컬 개발은 SQLite 를 씀

## 열린 결정
- 화면 언어(지금 한국어) · 장르 단가 다듬기 · 「왜 인기인가」 ①부터 할지
