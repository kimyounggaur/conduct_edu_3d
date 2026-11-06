"use client";

import { useEffect, useMemo, useState } from "react";
import { PATTERNS, getPattern } from "@/engine/patterns";
import type { Exercise, PatternDef } from "@/engine/types";
import { DEFAULT_STYLE } from "@/engine/types";
import type { RenderOptions } from "@/render/CanvasRenderer";
import { isMirrored } from "@/render/transform";
import { BeatDisplay } from "@/components/BeatDisplay";
import { ConductorCanvas } from "@/components/ConductorCanvas";
import { TimeSig } from "@/components/MusicType";
import { PATTERN_ORDER } from "@/components/PatternList";
import { PatternBar } from "@/components/PatternBar";
import { SettingsSheet } from "@/components/SettingsSheet";
import { SiteHeader } from "@/components/SiteHeader";
import { Transport, playOrPause, stepBy } from "@/components/Transport";
import { FINITE_BARS, useLibrary } from "@/store/library";
import { getRuntime, type PlaybackRuntime } from "@/store/runtime";
import { useSettings } from "@/store/settings";
import { readRequestedPattern } from "@/lib/requestedPattern";

export function libraryExercise(pattern: PatternDef, bpm: number, countIn: 0 | 1 | 2, loop: boolean): Exercise {
  return {
    id: `library-${pattern.id}`,
    patternId: pattern.id,
    tempo: { bpm, unit: pattern.tempoUnit },
    bars: loop ? 0 : FINITE_BARS,
    countIn,
    readyHoldSec: 1.5,
    start: { beat: 1 },
    prep: "auto",
    style: DEFAULT_STYLE,
  };
}

/** 저장된 설정을 불러온 뒤(hydrate) 엔진을 만든다 */
function useLibraryRuntime(): PlaybackRuntime | null {
  const [rt, setRt] = useState<PlaybackRuntime | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([useSettings.persist.rehydrate(), useLibrary.persist.rehydrate()]).then(() => {
      if (!alive) return;
      // 홈의 링크나 미리보기 주소로 패턴을 지정한 경우: /library?pattern=FOUR (미리보기는 #library-four)
      const wanted = readRequestedPattern(PATTERNS.map((p) => p.id));
      if (wanted && wanted !== useLibrary.getState().patternId) useLibrary.getState().selectPattern(wanted);
      setRt(getRuntime());
    });
    return () => {
      alive = false;
    };
  }, []);
  return rt;
}

/**
 * 패턴 연습 화면 — 한 줄기로: 박자 고르기 → 궤적 → 조작.
 * 나머지(다른 박자 목록, 카운트인·반복·탭, 보기·소리·단축키)는 서랍 안에 있다.
 */
export function LibraryScreen() {
  const rt = useLibraryRuntime();
  const { patternId, bpm, countIn, loop } = useLibrary();
  const settings = useSettings();
  const pattern = getPattern(patternId);

  const renderOptions: RenderOptions = useMemo(
    () => ({
      mirror: isMirrored(settings.view, settings.leftHanded),
      baton: settings.baton,
      trailMs: settings.trailMs,
      showGhost: settings.showGhost,
      showNumbers: settings.showNumbers,
      showPlane: settings.showPlane,
    }),
    [settings.view, settings.leftHanded, settings.baton, settings.trailMs, settings.showGhost, settings.showNumbers, settings.showPlane],
  );

  // 패턴이 바뀌면 처음(준비 자세)부터
  useEffect(() => {
    if (!rt) return;
    const { bpm: b, countIn: c, loop: l } = useLibrary.getState();
    rt.engine.load(pattern, libraryExercise(pattern, b, c, l));
  }, [rt, pattern]);

  // 카운트인·반복 변경: 재생 중이면 다음 재생부터
  useEffect(() => {
    if (!rt) return;
    rt.engine.setExercise(libraryExercise(pattern, useLibrary.getState().bpm, countIn, loop));
  }, [rt, pattern, countIn, loop]);

  // 빠르기: 다음 박부터
  useEffect(() => {
    rt?.engine.setBpm(bpm);
  }, [rt, bpm]);

  useEffect(() => {
    rt?.audio.setSound(settings.click);
  }, [rt, settings.click]);

  useEffect(() => {
    rt?.engine.setVisualOffset(settings.audioOffsetMs / 1000);
  }, [rt, settings.audioOffsetMs]);

  useShortcuts(rt);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader actions={<SettingsSheet />} widthClass="md:max-w-[max(30rem,calc((100dvh-17rem)*4/3))]" />
      <main className="flex flex-1 flex-col px-4 py-4 sm:px-6 sm:py-5">
        <h1 className="sr-only">패턴 연습</h1>
        {/* 화면 높이에 맞춰 그림(4:3)이 한눈에 들어오는 폭으로 가운데 정렬. 박자 버튼·조작줄도 같은 폭 */}
        <div className="mx-auto flex w-full flex-col gap-3 md:max-w-[max(30rem,calc((100dvh-17rem)*4/3))]">
          <PatternBar />

          <div className="relative aspect-square overflow-hidden rounded-2xl border border-rule bg-sheet md:aspect-[4/3]">
            {rt ? (
              <ConductorCanvas
                engine={rt.engine}
                options={renderOptions}
                label={`${pattern.nameKo} 지휘 패턴. ${pattern.summary}`}
                className="absolute inset-0"
              />
            ) : null}
            {/* 종이 위의 표기는 둘만: 왼쪽 위 박자표와 이름, 오른쪽 위 지금 몇 박 */}
            <div className="pointer-events-none absolute top-3 left-4 flex items-center gap-2.5 sm:top-4 sm:left-5">
              <TimeSig value={pattern.timeSignature} size={40} className="text-ink" />
              <span className="text-[15px] font-semibold text-ink">{pattern.nameKo}</span>
            </div>
            <div className="pointer-events-none absolute top-3 right-4 sm:top-4 sm:right-5">
              <BeatDisplay size={52} showBar={false} />
            </div>
          </div>

          {/* 손 움직임 설명 한 줄 (두 줄이 되는 좁은 화면에서도 아래 조작줄이 밀리지 않게 높이를 잡아 둔다) */}
          <p className="min-h-[2.6rem] text-center text-[15px] leading-snug text-graphite sm:min-h-0">{pattern.summary}</p>

          {rt && <Transport engine={rt.engine} tempoUnit={pattern.tempoUnit} />}
        </div>
      </main>
    </div>
  );
}

/** DESIGN.md 5.5 단축키 */
function useShortcuts(rt: PlaybackRuntime | null) {
  useEffect(() => {
    if (!rt) return;
    const { engine } = rt;
    const onKey = (e: KeyboardEvent) => {
      // 이미 다른 곳에서 처리한 키(예: 서랍을 닫는 Esc)와 조합 키는 건드리지 않는다
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      // 설정·박자 서랍이 열려 있는 동안에는 단축키를 쓰지 않는다
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      const role = el?.getAttribute("role");
      const interactive = tag === "BUTTON" || tag === "A" || role === "slider" || role === "radio" || role === "switch" || role === "tab";
      const lib = useLibrary.getState();
      switch (e.key) {
        case " ":
          if (interactive) return; // 버튼에 초점이 있으면 버튼이 직접 처리
          e.preventDefault();
          void playOrPause(engine);
          break;
        case "Escape":
          engine.stop();
          break;
        case "ArrowUp":
        case "ArrowDown":
          if (role === "slider" || role === "radio" || role === "tab") return;
          e.preventDefault();
          lib.nudgeBpm((e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : 2));
          break;
        case "ArrowRight":
        case "ArrowLeft":
          if (role === "slider" || role === "radio" || role === "tab") return;
          e.preventDefault();
          void stepBy(engine, e.key === "ArrowRight" ? 1 : -1);
          break;
        case "l":
        case "L":
        case "ㅣ":
          lib.setLoop(!lib.loop);
          break;
        case "m":
        case "M":
        case "ㅡ":
          useSettings.getState().toggleMute();
          break;
        default:
          if (/^[1-9]$/.test(e.key)) {
            const id = PATTERN_ORDER[Number(e.key) - 1];
            if (id) lib.selectPattern(id);
          }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rt]);
}
