"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Repeat, Square, StepBack, StepForward } from "lucide-react";
import type { PlaybackEngine } from "@/engine/playback";
import type { TempoUnit } from "@/engine/types";
import { Slider } from "@/components/ui/slider";
import { Segmented } from "@/components/controls/Segmented";
import { TempoNote } from "@/components/MusicType";
import { BPM_MAX, BPM_MIN, FINITE_BARS, clampBpm, useLibrary } from "@/store/library";
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
  "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-rule bg-sheet text-ink transition-colors hover:bg-wash disabled:opacity-40";

export function Transport({ engine, tempoUnit }: { engine: PlaybackEngine; tempoUnit: TempoUnit }) {
  const status = usePlaybackView((s) => s.status);
  const audioTried = usePlaybackView((s) => s.audioTried);
  const { bpm, setBpm, nudgeBpm, countIn, setCountIn, loop, setLoop } = useLibrary();
  const click = useSettings((s) => s.click);
  const [showIosHint, setShowIosHint] = useState(false);
  useEffect(() => setShowIosHint(isAppleMobile()), []);
  const playing = status === "playing";

  return (
    <div className="rounded-2xl border border-rule bg-sheet p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {/* 재생 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => playOrPause(engine)}
            className={cn(
              "inline-flex h-11 min-w-[6.5rem] items-center justify-center gap-2 rounded-lg px-4 text-[15px] font-semibold text-white transition-colors sm:min-w-[7.5rem]",
              playing ? "bg-ink hover:bg-ink/90" : "bg-primary hover:bg-primary/90",
            )}
            aria-keyshortcuts="Space"
          >
            {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5" fill="currentColor" />}
            {playing ? "일시정지" : "재생"}
          </button>
          <button type="button" className={iconBtn} onClick={() => engine.stop()} aria-label="정지 (처음으로)" title="정지 (Esc)">
            <Square className="size-4" fill="currentColor" />
          </button>
          <button
            type="button"
            className={cn(iconBtn, loop && "border-primary/40 bg-wash text-primary")}
            onClick={() => setLoop(!loop)}
            aria-pressed={loop}
            aria-label="반복"
            title={loop ? "반복 켜짐 (L)" : `반복 꺼짐: ${FINITE_BARS}마디 후 멈춤 (L)`}
          >
            <Repeat className="size-5" />
          </button>
          {/* 한 박씩: 다음/이전 박점까지 1초 동안 천천히 */}
          <span className="mx-1 hidden h-6 w-px bg-rule sm:block" aria-hidden="true" />
          <button type="button" className={iconBtn} onClick={() => stepBy(engine, -1)} aria-label="이전 박점으로" title="이전 박 (←)">
            <StepBack className="size-5" />
          </button>
          <button type="button" className={iconBtn} onClick={() => stepBy(engine, 1)} aria-label="다음 박점으로" title="다음 박 (→)">
            <StepForward className="size-5" />
          </button>
          <span className="hidden text-[13px] text-graphite sm:inline">한 박씩</span>
        </div>

        {/* 카운트인 */}
        <div className="flex min-w-[15rem] flex-1 items-center gap-2 sm:flex-none">
          <span className="shrink-0 text-[13px] text-graphite">카운트인</span>
          <Segmented
            label="카운트인"
            value={String(countIn) as "0" | "1" | "2"}
            onChange={(v) => setCountIn(Number(v) as 0 | 1 | 2)}
            options={[
              { value: "0", label: "없음" },
              { value: "1", label: "1마디" },
              { value: "2", label: "2마디" },
            ]}
          />
        </div>

        {/* 빠르기 */}
        <Tempo bpm={bpm} unit={tempoUnit} onChange={setBpm} onNudge={nudgeBpm} />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-graphite">
        {!loop && <span>반복을 끄면 {FINITE_BARS}마디 재생 후 멈춥니다.</span>}
        {click === "off" && <span>소리가 꺼져 있습니다. 보기 설정에서 켤 수 있어요 (M).</span>}
        {showIosHint && audioTried && click !== "off" && (
          <span>소리가 안 들리면 기기 옆의 무음 모드를 끄고 음량을 올려 보세요.</span>
        )}
      </div>
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
  const taps = useRef<number[]>([]);
  useEffect(() => setDraft(String(bpm)), [bpm]);

  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && n > 0) onChange(clampBpm(n));
    else setDraft(String(bpm));
  };

  const tap = () => {
    const now = performance.now();
    const list = taps.current.filter((t) => now - t < 2000);
    list.push(now);
    taps.current = list.slice(-4); // 최근 4번 탭의 평균
    if (taps.current.length >= 2) {
      const ts = taps.current;
      const avg = (ts[ts.length - 1] - ts[0]) / (ts.length - 1);
      onChange(clampBpm(60000 / avg));
    }
  };

  return (
    <div className="flex min-w-[17rem] flex-[1_1_20rem] items-center gap-3">
      <label className="flex shrink-0 items-center gap-1.5 text-ink" title="빠르기 (↑↓, Shift는 10씩)">
        <TempoNote unit={unit} className="text-[26px] text-ink" />
        <span className="text-[17px]" aria-hidden="true">
          =
        </span>
        <input
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
          className="h-11 w-[4.5rem] rounded-lg border border-rule bg-sheet px-2 text-center text-[18px] font-semibold tabular-nums text-ink [appearance:textfield] focus:border-beat-medium [&::-webkit-inner-spin-button]:appearance-none"
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
      <button
        type="button"
        onClick={tap}
        className="h-11 shrink-0 rounded-lg border border-rule bg-sheet px-3 text-[14px] font-semibold text-ink hover:bg-wash"
        title="박자에 맞춰 여러 번 누르면 그 빠르기로 맞춥니다"
      >
        탭
      </button>
    </div>
  );
}
