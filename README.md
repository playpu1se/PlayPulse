# PlayPulse
로블록스 게임의 접속자 · 방문 · **추정 수익**을 보여 주는 분석 사이트예요. 유료 결제·잠긴 칸이 없어요.
상태: v0.1 · 마지막 확인: 2026-11-04

## 실행
```bash
npm install
npm run collect        # 로블록스 공개 정보 한 번 모으기 (약 2분)
npm run collect:loop   # 10분마다 계속 모으기 (켜 두면 그래프가 쌓여요)
npm run dev            # http://localhost:3000
npm run seed:dev       # 로컬 시험 계정 만들기 (값은 scripts/seed-dev.ts)
npm test               # 수익 공식 시험
```
- Node 24 이상(내장 `node:sqlite` 사용). DB 파일 = `data/playpulse.db` (git 에 안 올라가요).

## 화면
| 주소 | 하는 일 |
|---|---|
| `/` | 추적 게임 전체 접속자 그래프 + 순위 6종(수익·접속자·방문당 수익·급상승·새로 뜸·다시 찾음) |
| `/rankings/<종류>` | 순위 100 |
| `/search` | 이름·만든이·id 검색, 장르·접속자 필터, 6가지 정렬 |
| `/trending` | 폭발 성장 · 꾸준한 성장 · 새로 뜨는 게임 |
| `/game/<id>` | **추정 하루·30일 수익(범위) · 방문당 수익** · 기간 표 · 그래프(수익+14일 예측 / 참여 / 순위) · 비슷한 게임 |
| `/how-we-estimate` | 수익 계산법 (관리자만) |
| `/dashboard` | 내 게임(로블록스 링크로 추가) · 합계 수익 |
| `/lists` | 내 관심 목록 여러 개 |
| `/alerts` | 알림(🔔 켠 게임의 접속자가 하루 전보다 ±50%) |
| `/settings` | 이름 · 기본 화폐(R$/$) |

## 구조
- `src/lib/config.ts` — 모든 숫자(장르 단가·범위·수집 주기)
- `src/lib/estimate.ts` — 수익 공식(순수 계산) + `estimate.test.ts`
- `src/lib/roblox.ts` — 로블록스 공개 API(요청 간격 지킴 · 429 면 기다림)
- `src/lib/collect.ts` — 수집기 한 번 · `scripts/collect.ts` — 실행 파일
- `src/lib/queries.ts` — 화면용 읽기 · `src/lib/userdata.ts` — 로그인 사용자 데이터 · `src/lib/auth.ts` — 이메일 로그인
- `src/app/actions.ts` — 서버 동작

## 문서
- `문서/배포.md` — Vercel + Turso + GitHub Actions 배포
- `HANDOVER.md` — 지금 하던 일 · 결정

## 지킬 것
- 결제·요금제·잠금 기능은 만들지 않아요.
- 로블록스 공개 API 만, 천천히 불러요.
