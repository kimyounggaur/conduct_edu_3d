"use client";

import { useRef } from "react";
import { clampBpm, useLibrary } from "@/store/library";

/** 박자에 맞춰 여러 번 누르면 그 빠르기로 맞춘다 (최근 4번 탭의 평균) */
export function TapTempoButton() {
  const bpm = useLibrary((s) => s.bpm);
  const setBpm = useLibrary((s) => s.setBpm);
  const taps = useRef<number[]>([]);

  const tap = () => {
    const now = performance.now();
    const list = taps.current.filter((t) => now - t < 2000);
    list.push(now);
    taps.current = list.slice(-4);
    if (taps.current.length >= 2) {
      const ts = taps.current;
      const avg = (ts[ts.length - 1] - ts[0]) / (ts.length - 1);
      setBpm(clampBpm(60000 / avg));
    }
  };

  return (
    <button
      type="button"
      onClick={tap}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-rule bg-sheet text-[15px] font-semibold text-ink transition-colors hover:bg-wash"
    >
      탭
      <span className="font-normal text-graphite tabular-nums">지금 {bpm}</span>
    </button>
  );
}
