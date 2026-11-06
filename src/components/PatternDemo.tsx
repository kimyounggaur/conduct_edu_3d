"use client";

import { useEffect, useMemo, useState } from "react";
import { getPattern } from "@/engine/patterns";
import { PlaybackEngine } from "@/engine/playback";
import { createSilentAudio } from "@/engine/scheduler";
import { DEFAULT_STYLE } from "@/engine/types";
import { DEFAULT_RENDER_OPTIONS } from "@/render/CanvasRenderer";
import { ConductorCanvas } from "@/components/ConductorCanvas";

/** 홈 화면의 소리 없는 시연: 지휘봉이 4박자를 그린다. 동작 줄이기 설정이면 멈춘 그림만 */
export function PatternDemo({ patternId = "FOUR", bpm = 60 }: { patternId?: string; bpm?: number }) {
  const [engine] = useState(() => {
    const silent = createSilentAudio(() => performance.now() / 1000);
    return new PlaybackEngine({
      clock: silent,
      sink: silent,
      timer: { start: () => {}, stop: () => {} },
      wallNow: () => performance.now() / 1000,
    });
  });
  const pattern = getPattern(patternId);
  const options = useMemo(() => ({ ...DEFAULT_RENDER_OPTIONS, trailMs: 900 }), []);

  useEffect(() => {
    engine.load(pattern, {
      id: "demo",
      patternId: pattern.id,
      tempo: { bpm, unit: pattern.tempoUnit },
      bars: 0,
      countIn: 0,
      readyHoldSec: 0.6,
      start: { beat: 1 },
      prep: "auto",
      style: DEFAULT_STYLE,
    });
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) engine.play();
    return () => engine.stop();
  }, [engine, pattern, bpm]);

  useEffect(() => () => engine.dispose(), [engine]);

  return (
    <ConductorCanvas
      engine={engine}
      options={options}
      label={`${pattern.nameKo} 지휘 패턴 시연: ${pattern.summary}`}
      className="h-full w-full"
    />
  );
}
