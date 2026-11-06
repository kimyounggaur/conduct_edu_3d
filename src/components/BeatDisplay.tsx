"use client";

import type { Accent } from "@/engine/types";
import { usePlaybackView } from "@/store/playback";
import { cn } from "@/lib/utils";

const TIME_SIG_ZERO = 0xe080;

/** 약박의 연한 파랑(#93C5FD)은 큰 숫자로 쓰면 흐려서 회색 잉크로 대신한다 */
const NUMERAL_COLOR: Record<Accent, string> = {
  strong: "var(--beat-strong)",
  medium: "var(--beat-medium)",
  weak: "var(--graphite)",
};

/** 악보 박자표 숫자 모양의 큰 숫자 */
export function BeatNumeral({ n, height, color }: { n: number; height: number; color: string }) {
  const text = [...String(n)].map((d) => String.fromCodePoint(TIME_SIG_ZERO + Number(d))).join("");
  const w = 0.46 * text.length + 0.04;
  return (
    <svg width={height * 2 * w} height={height} viewBox={`0 0 ${w} 0.5`} aria-hidden="true" className="overflow-visible">
      <text
        x={w / 2}
        y={0.25}
        fontSize={1}
        textAnchor="middle"
        fill={color}
        style={{ fontFamily: "var(--font-podium-numerals)" }}
      >
        {text}
      </text>
    </svg>
  );
}

function labelOf(kind: string, bar: number): string {
  switch (kind) {
    case "ready":
      return "준비";
    case "countin":
      return "카운트인";
    case "prep":
      return "예비박";
    case "end":
      return "끝";
    default:
      return bar <= 0 ? "못갖춘마디" : `${bar}마디`;
  }
}

/** 지금 몇 박인지: 큰 숫자 + 마디/상태. 박이 바뀔 때마다 숫자가 '통' 튄다 */
export function BeatDisplay({ size = 56, className }: { size?: number; className?: string }) {
  const beat = usePlaybackView((s) => s.beat);
  const label = labelOf(beat.kind, beat.bar);
  const numeralColor = beat.kind === "countin" ? "var(--graphite)" : NUMERAL_COLOR[beat.accent];
  return (
    <div className={cn("flex flex-col items-end gap-1 select-none", className)}>
      <div className="flex items-center justify-end" style={{ height: size, minWidth: size * 0.6 }}>
        {beat.beat !== null ? (
          <span key={beat.key} className="beat-bump inline-flex origin-center">
            <BeatNumeral n={beat.beat} height={size} color={numeralColor} />
          </span>
        ) : (
          <span className="h-1.5 w-6 rounded-full bg-rule" aria-hidden="true" />
        )}
      </div>
      <div className="text-[13px] font-medium text-graphite tabular-nums" aria-live="off">
        {label}
      </div>
    </div>
  );
}
