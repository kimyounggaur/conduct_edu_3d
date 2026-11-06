import Link from "next/link";
import { CURRICULUM } from "@/content/curriculum";
import { PatternDemo } from "@/components/PatternDemo";
import { SiteHeader } from "@/components/SiteHeader";
import { TimeSig } from "@/components/MusicType";

export default function Home() {
  const first = CURRICULUM.filter((c) => c.release === 1);
  const later = CURRICULUM.filter((c) => c.release === 2);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 sm:px-6">
        <section className="grid items-center gap-8 py-10 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:py-16">
          <div className="max-w-xl">
            <h1 className="text-[44px] leading-[1.1] font-extrabold tracking-[-0.02em] text-ink sm:text-[56px]">지휘 기초</h1>
            <p className="mt-5 text-[18px] leading-relaxed text-ink">
              지휘봉이 지나가는 길을 눈으로 보고, 메트로놈 소리에 맞춰 따라 하며 배웁니다.
            </p>
            <p className="mt-3 text-[16px] leading-relaxed text-graphite">
              2·3·4박자에서 시작해 예비박, 끝맺음, 진입 신호까지 쉬운 순서대로 나아갑니다. 교실 화면에 띄워 함께 연습해도 좋아요.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/library"
                className="inline-flex h-12 items-center rounded-lg bg-primary px-6 text-[16px] font-semibold text-white transition-colors hover:bg-primary/90"
              >
                패턴 연습 시작
              </Link>
              <a
                href="#curriculum"
                className="inline-flex h-12 items-center rounded-lg border border-rule bg-sheet px-5 text-[16px] font-medium text-ink transition-colors hover:bg-wash"
              >
                배우는 순서 보기
              </a>
            </div>
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
        </section>

        <section id="curriculum" className="scroll-mt-6 border-t border-rule py-12">
          <h2 className="text-[28px] font-bold tracking-tight text-ink">배우는 순서</h2>
          <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-graphite">
            쉬운 박부터 차례로 배웁니다. 레슨 화면은 준비 중이며, 패턴이 있는 단계는 지금 패턴 연습에서 바로 해 볼 수 있어요.
          </p>
          <CurriculumList items={first} />
          <h3 className="mt-12 text-[18px] font-semibold text-ink">더 나아가기</h3>
          <CurriculumList items={later} />
        </section>
      </main>
      <footer className="border-t border-rule bg-sheet">
        <div className="mx-auto max-w-[1200px] px-4 py-6 text-[12.5px] leading-relaxed text-graphite sm:px-6">
          글꼴: Pretendard(SIL OFL 1.1). 박자표·음표 글자: Bravura에서 뽑아 이름을 바꾼 파생 글꼴(SIL OFL 1.1, © Steinberg Media
          Technologies). 설명과 그림은 이 앱에서 새로 만든 것입니다.
        </div>
      </footer>
    </div>
  );
}

function CurriculumList({ items }: { items: typeof CURRICULUM }) {
  return (
    <ol className="mt-6 divide-y divide-rule border-y border-rule">
      {items.map((item) => (
        <li key={item.level} className="grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-3 py-4 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]">
          <span className="text-[22px] font-bold tabular-nums text-beat-strong" aria-label={`${item.level}단계`}>
            {item.level}
          </span>
          <div>
            <div className="text-[17px] font-semibold text-ink">{item.title}</div>
            <div className="mt-0.5 text-[15px] leading-relaxed text-graphite">{item.summary}</div>
          </div>
          <div className="col-start-2 mt-2 sm:col-start-3 sm:mt-0">
            {item.patternId ? (
              <Link
                href={`/library?pattern=${item.patternId}`}
                className="inline-flex h-9 items-center rounded-md border border-rule px-3 text-[14px] font-medium text-ink hover:bg-wash"
              >
                패턴 연습에서 해 보기
              </Link>
            ) : (
              <span className="text-[14px] text-graphite">레슨 준비 중</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
