import Link from "next/link";
import { PatternDemo } from "@/components/PatternDemo";
import { SiteHeader } from "@/components/SiteHeader";
import { TimeSig } from "@/components/MusicType";

/** 홈: 소개 한 줄과 시작 버튼 하나. (배우는 순서 목록은 레슨이 생기는 Phase 3에서 다시 둔다 — src/content/curriculum.ts) */
export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-[1100px] flex-1 content-center items-center gap-8 px-4 py-10 sm:px-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-12 md:py-16">
        <div className="max-w-xl">
          <h1 className="text-[44px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink sm:text-[56px]">지휘 기초</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-ink">
            지휘봉이 지나가는 길을 눈으로 보고, 메트로놈 소리에 맞춰 따라 하며 배웁니다.
          </p>
          <Link
            href="/library"
            className="mt-8 inline-flex h-12 items-center rounded-lg bg-primary px-7 text-[16px] font-semibold text-white transition-colors hover:bg-primary/90"
          >
            연습 시작
          </Link>
        </div>
        <figure>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-rule bg-sheet">
            <PatternDemo patternId="FOUR" bpm={60} />
            <TimeSig value="4/4" size={44} className="pointer-events-none absolute top-4 left-5 text-ink" />
          </div>
          <figcaption className="mt-3 text-[14px] text-graphite">
            4박자: 아래, 왼쪽, 오른쪽, 위. 점선은 모든 박이 찍히는 박점면이에요.
          </figcaption>
        </figure>
      </main>
      <footer className="border-t border-rule bg-sheet">
        <div className="mx-auto max-w-[1100px] px-4 py-6 text-[12.5px] leading-relaxed text-graphite sm:px-6">
          글꼴: Pretendard(SIL OFL 1.1). 박자표·음표 글자: Bravura에서 뽑아 이름을 바꾼 파생 글꼴(SIL OFL 1.1, © Steinberg Media
          Technologies). 설명과 그림은 이 앱에서 새로 만든 것입니다.
        </div>
      </footer>
    </div>
  );
}
