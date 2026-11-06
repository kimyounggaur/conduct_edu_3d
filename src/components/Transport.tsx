"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Square, StepBack, StepForward } from "lucide-react";
import type { PlaybackEngine } from "@/engine/playback";
import type { TempoUnit } from "@/engine/types";
import { Slider } from "@/components/ui/slider";
import { TempoNote } from "@/components/MusicType";
import { BPM_MAX, BPM_MIN, clampBpm, useLibrary } from "@/store/library";
import { usePlaybackView } from "@/store/playback";
import { isAppleMobile, unlockAudio } from "@/store/runtime";
import { useSettings } from "@/store/settings";
import { cn } from "@/lib/utils";

/** 재생과 조작은 버튼에서 오디오를 깨운 뒤 실행한다 (모바일 자동재생 정책) */
export async function playOrPause(engine: PlaybackEngine) {
  if (engine.getStatus() === "playing") {
    engine.pause();
    return;
  }
  await unlockAudio();
  engine.play();
}

export async function stepBy(engine: PlaybackEngine, dir: 1 | -1) {
  await unlockAudio();
  if (dir === 1) engine.stepForward();
  else engine.stepBackward();
}

const iconBtn =
  "inline-flex size-12 shrink-0 items-center justify-center rounded-lg border border-rule bg-sheet text-ink transition-colors hover:bg-wash";

/**
 * 아래 조작줄: [정지] [이전 박] [재생] [다음 박]  ♩ = 60 ━━●━━
 * 카운트인·반복·탭 같은 나머지는 '설정' 서랍에 있다.
 */
export function Transport({ engine, tempoUnit }: { engine: PlaybackEngine; tempoUnit: TempoUnit }) {
  const status = usePlaybackView((s) => s.status);
  const audioTried = usePlaybackView((s) => s.audioTried);
  const { bpm, setBpm, nudgeBpm } = useLibrary();
  const click = useSettings((s) => s.click);
  const [showIosHint, setShowIosHint] = useState(false);
  useEffect(() => setShowIosHint(isAppleMobile()), []);
  const playing = status === "playing";

  const hint =
    click === "off"
      ? "소리가 꺼져 있어요. 설정에서 켤 수 있어요 (M)."
      : showIosHint && audioTried
        ? "소리가 안 들리면 기기 옆의 무음 모드를 끄고 음량을 올려 보세요."
        : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button type="button" className={iconBtn} onClick={() => engine.stop()} aria-label="정지 (처음으로)" title="정지 (Esc)">
            <Square className="size-4" fill="currentColor" />
          </button>
          <button type="button" className={iconBtn} onClick={() => stepBy(engine, -1)} aria-label="이전 박으로" title="이전 박 (←)">
            <StepBack className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => playOrPause(engine)}
            className={cn(
              "inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-5 text-[16px] font-semibold text-white transition-colors sm:w-36 sm:flex-none",
              playing ? "bg-ink hover:bg-ink/90" : "bg-primary hover:bg-primary/90",
            )}
            aria-keyshortcuts="Space"
          >
            {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5" fill="currentColor" />}
            {playing ? "일시정지" : "재생"}
          </button>
          <button type="button" className={iconBtn} onClick={() => stepBy(engine, 1)} aria-label="다음 박으로" title="다음 박 (→)">
            <StepForward className="size-5" />
          </button>
        </div>

        <Tempo bpm={bpm} unit={tempoUnit} onChange={setBpm} onNudge={nudgeBpm} />
      </div>

      {hint && <p className="text-[13px] text-graphite">{hint}</p>}
    </div>
  );
}

function Tempo({
  bpm,
  unit,
  onChange,
  onNudge,
}: {
  bpm: number;
  unit: TempoUnit;
  onChange: (bpm: number) => void;
  onNudge: (d: number) => void;
}) {
  const [draft, setDraft] = useState(String(bpm));
  useEffect(() => setDraft(String(bpm)), [bpm]);

  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) onChange(clampBpm(n));
    else setDraft(String(bpm));
  };

  return (
    <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:min-w-[15rem] sm:flex-1">
      <label className="flex shrink-0 items-center gap-1.5 text-ink" title="빠르기 (↑↓, Shift는 10씩)">
        <TempoNote unit={unit} className="text-[26px] text-ink" />
        <span className="text-[17px]" aria-hidden="true">
          =
        </span>
        <input
          id="bpm-input"
          type="number"
          inputMode="numeric"
          min={BPM_MIN}
          max={BPM_MAX}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              onNudge((e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 2));
            }
          }}
          aria-label="빠르기 (분당 박 수)"
          className="h-12 w-[4.5rem] rounded-lg border border-rule bg-sheet px-2 text-center text-[18px] font-semibold tabular-nums text-ink [appearance:textfield] focus:border-beat-medium [&::-webkit-inner-spin-button]:appearance-none"
        />
      </label>
      <Slider
        className="min-w-24 flex-1 py-3 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-track]]:h-1.5"
        min={BPM_MIN}
        max={BPM_MAX}
        step={1}
        value={[bpm]}
        onValueChange={(v) => onChange(v[0])}
        aria-label="빠르기 조절"
      />
    </div>
  );
}
