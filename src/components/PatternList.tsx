"use client";

import { PATTERN_GROUPS, getPattern } from "@/engine/patterns";
import { TimeSig } from "@/components/MusicType";
import { useLibrary } from "@/store/library";
import { cn } from "@/lib/utils";

/** 키보드 숫자(1~9)로 바로 고를 수 있는 패턴 순서 = 목록에 보이는 순서 */
export const PATTERN_ORDER = PATTERN_GROUPS.flatMap((g) => g.patternIds);

export function PatternList({ onPicked }: { onPicked?: () => void }) {
  const patternId = useLibrary((s) => s.patternId);
  const select = useLibrary((s) => s.selectPattern);
  return (
    <nav aria-label="패턴 목록" className="space-y-5">
      {PATTERN_GROUPS.map((group) => (
        <section key={group.id}>
          <h3 className="mb-1.5 flex items-center gap-2 px-2 text-[13px] font-semibold text-graphite">
            {group.title}
            {group.release === 2 && (
              <span className="rounded-full border border-rule px-1.5 py-px text-[11px] font-medium text-graphite">고급</span>
            )}
          </h3>
          <ul className="space-y-0.5">
            {group.patternIds.map((id) => {
              const p = getPattern(id);
              const active = id === patternId;
              const quick = PATTERN_ORDER.indexOf(id) + 1;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => {
                      select(id);
                      onPicked?.();
                    }}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-wash",
                      active && "bg-wash shadow-[inset_3px_0_0_var(--beat-strong)]",
                    )}
                    title={quick <= 9 ? `키보드 ${quick}` : undefined}
                  >
                    <span className={cn("flex w-9 justify-center", active ? "text-ink" : "text-graphite")}>
                      <TimeSig value={p.timeSignature} size={30} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[15px] text-ink", active && "font-semibold")}>{p.nameKo}</span>
                      <span className="line-clamp-2 block text-[12.5px] leading-snug text-graphite">{p.summary}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
