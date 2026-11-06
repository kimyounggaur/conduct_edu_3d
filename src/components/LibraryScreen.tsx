"use client";

import { useEffect, useMemo, useState } from "react";
import { getPattern } from "@/engine/patterns";
import type { Exercise, PatternDef } from "@/engine/types";
import { DEFAULT_STYLE } from "@/engine/types";
import type { RenderOptions } from "@/render/CanvasRenderer";
import { isMirrored } from "@/render/transform";
import { BeatDisplay } from "@/components/BeatDisplay";
import { ConductorCanvas } from "@/components/ConductorCanvas";
import { TempoNote, TimeSig } from "@/components/MusicType";
import { OptionsPanel } from "@/components/OptionsPanel";
import { PATTERN_ORDER, PatternList } from "@/components/PatternList";
import { SiteHeader } from "@/components/SiteHeader";
import { Transport, playOrPause, stepBy } from "@/components/Transport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FINITE_BARS, useLibrary } from "@/store/library";
import { getRuntime, type PlaybackRuntime } from "@/store/runtime";
import { useSettings } from "@/store/settings";

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
      // 홈의 "패턴 연습에서 해 보기" 링크: /library?pattern=FOUR
      const wanted = new URLSearchParams(window.location.search).get("pattern");
      if (wanted && wanted !== useLibrary.getState().patternId) useLibrary.getState().selectPattern(wanted);
      setRt(getRuntime());
    });
    return () => {
      alive = false;
    };
  }, []);
  return rt;
}

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
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-[1440px] flex-1 gap-4 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[264px_minmax(0,1fr)_288px] xl:gap-5 xl:p-5">
        <aside className="hidden xl:block">
          <div className="sticky top-5 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1">
            <PatternList />
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-3" aria-label="지휘 궤적">
          <div className="mx-auto w-full md:w-[min(100%,calc((100dvh-15rem)*4/3))]">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-rule bg-sheet md:aspect-[4/3]">
              {rt ? (
                <ConductorCanvas
                  engine={rt.engine}
                  options={renderOptions}
                  label={`${pattern.nameKo} 지휘 패턴. ${pattern.summary}`}
                  className="absolute inset-0"
                />
              ) : null}
              {/* 종이 위의 표기: 왼쪽 위 박자표, 오른쪽 위 현재 박, 오른쪽 아래 빠르기 */}
              <div className="pointer-events-none absolute top-3 left-4 flex items-start gap-3 sm:top-4 sm:left-5">
                <TimeSig value={pattern.timeSignature} size={44} className="text-ink" />
                <div className="pt-0.5">
                  <div className="text-[15px] font-semibold text-ink sm:text-[17px]">{pattern.nameKo}</div>
                  <div className="hidden text-[13px] text-graphite sm:block">{pattern.summary}</div>
                </div>
              </div>
              <div className="pointer-events-none absolute top-3 right-4 sm:top-4 sm:right-5">
                <BeatDisplay size={52} />
              </div>
              <div className="pointer-events-none absolute right-5 bottom-4 hidden items-center gap-1 text-ink md:flex">
                <TempoNote unit={pattern.tempoUnit} className="text-[22px]" />
                <span className="text-[15px] tabular-nums">= {bpm}</span>
              </div>
            </div>
          </div>
          {rt && <Transport engine={rt.engine} tempoUnit={pattern.tempoUnit} />}

          {/* 휴대폰: 패턴과 보기 설정을 탭으로 */}
          <div className="md:hidden">
            <SidePanels onPicked={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
          </div>
        </section>

        <aside className="hidden md:block">
          <div className="sticky top-5 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border border-rule bg-sheet p-4">
            {/* 태블릿: 탭 / 큰 화면: 보기 설정만 (패턴 목록은 왼쪽) */}
            <div className="xl:hidden">
              <SidePanels />
            </div>
            <div className="hidden xl:block">
              <h2 className="mb-4 text-[15px] font-semibold text-ink">보기 설정</h2>
              <OptionsPanel />
            </div>
          </div>
        </aside>
      </main>
      <ShortcutHint />
    </div>
  );
}

function SidePanels({ onPicked }: { onPicked?: () => void }) {
  return (
    <Tabs defaultValue="patterns" className="gap-3">
      <TabsList className="h-11 w-full">
        <TabsTrigger value="patterns" className="text-[15px]">
          패턴
        </TabsTrigger>
        <TabsTrigger value="options" className="text-[15px]">
          보기 설정
        </TabsTrigger>
      </TabsList>
      <TabsContent value="patterns" className="rounded-2xl border border-rule bg-sheet p-3 md:border-0 md:p-0">
        <PatternList onPicked={onPicked} />
      </TabsContent>
      <TabsContent value="options" className="rounded-2xl border border-rule bg-sheet p-4 md:border-0 md:p-1">
        <OptionsPanel />
      </TabsContent>
    </Tabs>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ["Space", "재생/일시정지"],
  ["Esc", "정지"],
  ["← →", "한 박씩"],
  ["↑ ↓", "빠르기 (Shift는 10씩)"],
  ["L", "반복"],
  ["M", "소리 끄기"],
  ["1–9", "패턴 고르기"],
];

function ShortcutHint() {
  return (
    <div className="mx-auto hidden w-full max-w-[1440px] flex-wrap gap-x-5 gap-y-1 px-5 pb-4 text-[12.5px] text-graphite md:flex">
      {SHORTCUTS.map(([key, what]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <kbd className="rounded border border-rule bg-sheet px-1.5 py-px font-sans text-[11.5px] text-ink">{key}</kbd>
          {what}
        </span>
      ))}
    </div>
  );
}

/** DESIGN.md 5.5 단축키 */
function useShortcuts(rt: PlaybackRuntime | null) {
  useEffect(() => {
    if (!rt) return;
    const { engine } = rt;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
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
