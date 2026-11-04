"use client";
// 수익 숫자: 위 막대의 R$ / $ 전환을 따라가요
import { money, moneyPrecise } from "@/lib/format";
import { useCurrency } from "./CurrencyContext";

export function Money({ robux, precise, className }: { robux: number | null | undefined; precise?: boolean; className?: string }) {
  const { currency } = useCurrency();
  return <span className={"num " + (className ?? "")}>{precise ? moneyPrecise(robux, currency) : money(robux, currency)}</span>;
}

export function Estimate() {
  return (
    <span className="estimate-tag" title="로블록스는 수익을 공개하지 않아요. 공개 숫자로 계산한 추정이에요.">
      추정
    </span>
  );
}
