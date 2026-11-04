# 인수인계
마지막 갱신: 2026-11-04

## 지금 하던 일
- [x] v0.1: 순위 · 검색 · 급성장 · 게임 상세(추정 수익) · 내 게임 · 내 목록 · 알림 · 설정
- [x] DB 를 Turso(libSQL) 로도 붙게 바꾸기 · 수집을 GitHub Actions 로(30분)
- [x] 저장소: https://github.com/playpu1se/PlayPulse (공개 · 2026-11-04 기록 정리 위해 새로 만듦 · 첫 커밋 b6d8068)
- [x] 올리기는 `scripts/push-public.sh` 만 (검사 실패면 안 올라감 · 기록까지 검사)
- [x] Turso DB(도쿄) · GitHub Secrets · `collect` 30분마다 켜짐(첫 실행 성공 · 게임 606개)
- [x] Vercel 배포: https://playpulse-ochre.vercel.app (환경 변수 3개 · Next 15.5.29)
- [ ] Vercel ↔ GitHub 자동 배포 연결(Vercel GitHub 앱 설치 필요) — 그 전까지는 `vercel deploy --prod`
- [x] 속도: 공개 데이터 5분 저장(`src/lib/cached.ts`) · 두 번째부터 0.01초
- [x] 수집 끝나면 `/api/revalidate` 로 저장 바로 지움(코드 끝) · 비밀값·변수 넣음 · 신호 성공 확인(2026-11-04)
- [x] 새 저장소에서 GitHub 수집 다시 성공(2026-11-04 GitHub 장애 뒤)
- [ ] 「왜 인기인가」 기능: ① 무료 신호(업데이트·유튜브) ② AI 요약(유료 API · 출처 필수) — 운영자 결정 기다림
- [x] 수익 보정 1차: 로블록스 공식 실적으로 전체 합계 검사(관리자 페이지) · 단가 유지 → `문서/보정-자료.md`
- [ ] 게임별 오차 확인(공개 수익 자료 더 모으기)

## 결정
- 기술: Next.js 15 + TypeScript + SQLite/libSQL · 그래프 recharts
- 수익 = 로블록스 공개 숫자 + 공식 수익 순위로 추정 · 계산법 페이지는 관리자만
- 배포: Vercel + Turso + GitHub Actions (무료) → `문서/배포.md`
- 결제 · 요금제 · 잠금 없음

## 열린 결정
- 화면 언어(지금 한국어) · 장르 단가 다듬기 · 개발자 본인 게임 실제 수익(로블록스 Open Cloud) 붙이기
