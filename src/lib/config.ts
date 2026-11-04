// 모든 숫자는 여기 한 곳에만 둬요. 설명 = 문서/수익-추정.md

export const DB_PATH = process.env.PLAYPULSE_DB ?? "data/playpulse.db";

// 수집 주기(분). 스냅샷 시각도 이 단위로 맞춰요.
export const COLLECT_EVERY_MIN = 10;
// 화면에 적는 수집 주기(분). 배포판은 GitHub Actions 가 30분마다 돌려요(.github/workflows/collect.yml)
export const PUBLIC_COLLECT_MIN = 30;

// 로블록스 공식 차트(explore-api sortId) → 몇 페이지까지 볼지 (한 페이지 ≈ 100개)
export const CHARTS: { id: string; label: string; pages: number }[] = [
  { id: "top-earning", label: "수익 순위", pages: 5 },
  { id: "top-playing-now", label: "지금 접속자 순위", pages: 5 },
  { id: "top-trending", label: "급상승", pages: 1 },
  { id: "up-and-coming", label: "새로 뜨는 게임", pages: 1 },
  { id: "top-revisited", label: "다시 찾는 게임", pages: 1 },
];

// 장르별 플레이 1시간당 평균 수익(R$). 모르는 장르 = DEFAULT_RPH.
export const DEFAULT_RPH = 6;
export const GENRE_RPH: Record<string, number> = {
  RPG: 8,
  Strategy: 7,
  Simulation: 7,
  Shooter: 6,
  Action: 6,
  Survival: 6,
  Obby: 3,
  "Obby & Platformer": 3,
  Roleplay: 4,
  "Roleplay & Avatar Sim": 4,
  Social: 3,
  Sports: 5,
  "Sports & Racing": 5,
  Party: 4,
  "Party & Casual": 4,
  Puzzle: 4,
  Shopping: 4,
};

export const RANK_FACTOR_MIN = 0.5;
export const RANK_FACTOR_MAX = 2.5;
export const RANK_FACTOR_EARN_ONLY = 1.2; // 수익 순위만 있음
export const RANK_FACTOR_OUTSIDE = 0.8; // 수익 순위 밖

export const RANGE_LOW = 0.6;
export const RANGE_HIGH = 1.7;

export const USD_PER_ROBUX = 0.0038; // DevEx 환전율

export const FORECAST_DAYS = 14;

// 알림: 하루 전보다 접속자가 이만큼 바뀌면 알림
export const ALERT_CCU_CHANGE = 0.5;

// /api/health: 마지막 수집이 이보다 오래되면 「문제 있음」 (30분 수집 + GitHub 지연 여유)
export const HEALTH_MAX_AGE_MIN = 180;

// 보정 기준: 로블록스 2026년 3분기 공식 실적(문서/보정-자료.md)
// 개발자 몫 전체 = 하루 약 8.5억~11.5억 R$ · 전체 플레이 = 분기 약 340억 시간
export const PLATFORM_CREATOR_ROBUX_PER_DAY = { low: 850_000_000, high: 1_150_000_000 };
export const PLATFORM_HOURS_PER_DAY = 34_000_000_000 / 92;
