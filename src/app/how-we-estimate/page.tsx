import { notFound } from "next/navigation";
import { currentAdmin } from "@/lib/auth";
import { platformCheck } from "@/lib/cached";
import { compact } from "@/lib/format";
import { DEFAULT_RPH, GENRE_RPH, RANGE_HIGH, RANGE_LOW, RANK_FACTOR_EARN_ONLY, RANK_FACTOR_MAX, RANK_FACTOR_MIN, RANK_FACTOR_OUTSIDE, USD_PER_ROBUX, PUBLIC_COLLECT_MIN, PLATFORM_CREATOR_ROBUX_PER_DAY, PLATFORM_HOURS_PER_DAY } from "@/lib/config";

export const dynamic = "force-dynamic";

// 관리자만 볼 수 있어요. 다른 사람에게는 없는 페이지처럼 보여요.
export default async function HowPage() {
  if (!(await currentAdmin())) notFound();
  const pc = await platformCheck();
  const { low, high } = PLATFORM_CREATOR_ROBUX_PER_DAY;
  const hourShare = pc.hours / PLATFORM_HOURS_PER_DAY;
  const over = pc.daily > high;
  return (
    <article className="mx-auto max-w-3xl space-y-6 text-[15px] leading-relaxed">
      <header>
        <h1 className="text-[26px] font-bold">수익은 어떻게 계산하나요?</h1>
        <p className="text-ink-2">로블록스는 게임 수익을 공개하지 않아요. 그래서 PlayPulse 의 수익은 모두 공개 숫자로 계산한 <b className="text-money">추정</b>이에요.</p>
      </header>

      <section className="card space-y-2 p-5">
        <h2 className="text-[17px] font-bold">1. 모으는 숫자</h2>
        <ul className="list-disc space-y-1 pl-5 text-ink-2">
          <li>{PUBLIC_COLLECT_MIN}분마다: 지금 접속자, 총 방문 수, 좋아요·싫어요</li>
          <li>로블록스 공식 차트 순위: 수익 순위, 접속자 순위, 급상승, 새로 뜨는 게임, 다시 찾는 게임</li>
          <li>그래프는 우리가 모으기 시작한 때부터 쌓여요. 7·28·91·364일 칸은 그만큼 쌓이면 채워져요.</li>
        </ul>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-[17px] font-bold">2. 계산 순서</h2>
        <ol className="list-decimal space-y-2 pl-5 text-ink-2">
          <li>
            <b className="text-ink">하루 플레이 시간</b> = 하루 평균 접속자 × 24시간
          </li>
          <li>
            <b className="text-ink">장르별 시간당 수익</b>을 곱해요. 기본 {DEFAULT_RPH} R$, 예: {Object.entries(GENRE_RPH).slice(0, 5).map(([g, v]) => `${g} ${v}`).join(" · ")}
          </li>
          <li>
            <b className="text-ink">순위 보정</b>: 접속자 순위에 비해 수익 순위가 높으면 한 사람이 더 많이 쓰는 게임이에요. √(접속자 순위 ÷ 수익 순위) 를 곱하고 {RANK_FACTOR_MIN}~{RANK_FACTOR_MAX} 로 잘라요. 수익 순위에만 있으면 {RANK_FACTOR_EARN_ONLY}, 수익 순위 밖이면 {RANK_FACTOR_OUTSIDE}.
          </li>
          <li>
            <b className="text-ink">범위</b>: 진짜 값은 대략 × {RANGE_LOW} ~ × {RANGE_HIGH} 사이에 있다고 봐요.
          </li>
          <li>
            <b className="text-ink">방문당 수익</b> = 하루 수익 ÷ 하루 방문 수
          </li>
          <li>
            <b className="text-ink">달러</b> = R$ × {USD_PER_ROBUX} (로블록스 개발자 환전율)
          </li>
          <li>
            <b className="text-ink">예측</b>: 지난 날들의 일 수익에 직선을 맞춰 14일 앞을 그려요. 멀수록 범위가 넓어져요.
          </li>
        </ol>
      </section>

      <section className={"card space-y-2 p-5 " + (over ? "!border-down" : "")}>
        <h2 className="text-[17px] font-bold">전체 합계 검사 (관리자)</h2>
        <p className="text-ink-2">추적 중인 게임 {pc.games.toLocaleString()}개의 추정 수익 합계를 로블록스 공식 실적(2026년 3분기, 개발자 몫 전체)과 비교해요.</p>
        <ul className="list-disc space-y-1 pl-5 text-ink-2">
          <li>우리 합계: 하루 <b className="text-ink">{compact(pc.daily)} R$</b> · 플레이 1시간에 {pc.rph?.toFixed(2) ?? "—"} R$</li>
          <li>로블록스 개발자 몫 전체: 하루 {compact(low)} ~ {compact(high)} R$ · 평균 1시간에 약 2.5~3 R$</li>
          <li>우리 게임 비중: 플레이 시간 {(hourShare * 100).toFixed(0)}% · 수익 {((pc.daily / high) * 100).toFixed(0)}~{((pc.daily / low) * 100).toFixed(0)}%</li>
        </ul>
        <p className={"font-semibold " + (over ? "text-down" : "text-up")}>
          {over ? "합계가 로블록스 전체보다 커요. 장르 단가를 낮춰야 해요." : "합계가 로블록스 전체 안에 있어요. 인기 게임에 수익이 몰리는 것과 맞는 범위예요."}
        </p>
      </section>

      <section className="card space-y-2 p-5">
        <h2 className="text-[17px] font-bold">3. 못 보는 것</h2>
        <ul className="list-disc space-y-1 pl-5 text-ink-2">
          <li>게임 안 상품 가격과 판매 수, 프리미엄 지급액은 공개되지 않아요.</li>
          <li>광고 수익, 그룹 지분 나눔도 알 수 없어요.</li>
          <li>그래서 한 게임 값보다 <b className="text-ink">게임끼리 비교</b>와 <b className="text-ink">시간에 따른 변화</b>를 보는 데 쓰는 게 좋아요.</li>
        </ul>
      </section>
    </article>
  );
}
