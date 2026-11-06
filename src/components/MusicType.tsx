/**
 * 악보 글꼴 표기: 박자표(세로로 쌓인 숫자)와 메트로놈 표기(♩ = 60).
 * 글꼴은 SMuFL 규격(Bravura 파생 'Podium Numerals')의 글자를 쓴다.
 */
import { cn } from "@/lib/utils";
import type { TempoUnit } from "@/engine/types";

const TIME_SIG_ZERO = 0xe080;
const DIGIT_WIDTH = 0.46;

const digits = (s: string) =>
  [...s].map((ch) => (/\d/.test(ch) ? String.fromCodePoint(TIME_SIG_ZERO + Number(ch)) : "")).join("");

/** 박자표. value 예: "4/4", "12/8". size는 위아래 전체 높이(px) */
export function TimeSig({ value, size = 32, className }: { value: string; size?: number; className?: string }) {
  const [top = "", bottom = ""] = value.split("/");
  const cols = Math.max(top.length, bottom.length, 1);
  const w = cols * DIGIT_WIDTH + 0.08;
  return (
    <svg
      className={cn("shrink-0 overflow-visible", className)}
      width={size * w}
      height={size}
      viewBox={`0 0 ${w} 1`}
      role="img"
      aria-label={`${bottom}분의 ${top} 박자`}
    >
      <g fill="currentColor" fontSize={1} textAnchor="middle" style={{ fontFamily: "var(--font-podium-numerals)" }}>
        {/* SMuFL 박자표 숫자는 기준선에 가운데가 오도록 그려져 있다 (높이 0.5em) */}
        <text x={w / 2} y={0.25}>
          {digits(top)}
        </text>
        <text x={w / 2} y={0.75}>
          {digits(bottom)}
        </text>
      </g>
    </svg>
  );
}

const NOTE: Record<TempoUnit, string> = {
  "♩": "",
  "♪": "",
  "♩.": "",
};

const NOTE_LABEL: Record<TempoUnit, string> = {
  "♩": "4분음표",
  "♪": "8분음표",
  "♩.": "점4분음표",
};

/** 메트로놈 표기의 음표 글자 (♩, ♪, ♩.) */
export function TempoNote({ unit, className }: { unit: TempoUnit; className?: string }) {
  return (
    <span
      className={cn("inline-block leading-none", className)}
      style={{ fontFamily: "var(--font-podium-numerals)" }}
      role="img"
      aria-label={NOTE_LABEL[unit]}
    >
      {NOTE[unit]}
    </span>
  );
}
