import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatKRW } from "./payroll-utils";

/** 전월 대비 증감을 화살표 + 금액으로 표시. 변화가 없으면 아무것도 그리지 않는다. */
export function diffBadge(curr: number, prev: number) {
  const diff = curr - prev;
  if (diff === 0) return null;
  const isUp = diff > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? "text-emerald-500" : "text-red-500"}`}
    >
      {isUp ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {formatKRW(Math.abs(diff))}
    </span>
  );
}
