"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getPattern } from "@/engine/patterns";
import { Segmented } from "@/components/controls/Segmented";
import { PatternList } from "@/components/PatternList";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLibrary } from "@/store/library";
import { useDrawerFocus } from "@/lib/drawerFocus";
import { cn } from "@/lib/utils";

/** 늘 보이는 박자 버튼. 키보드 1~4와 같은 순서 */
const QUICK_IDS = ["ONE", "TWO", "THREE", "FOUR"];

/**
 * 박자 고르기: 자주 쓰는 4개는 버튼으로, 나머지(6박자·5박자·7박자·분할·불규칙 박)는 "다른 박자" 서랍에서.
 * 서랍에서 고른 박자가 있으면 "다른 박자" 버튼이 파랗게 채워진다. (이름은 그림 왼쪽 위에 나온다)
 */
export function PatternBar() {
  const patternId = useLibrary((s) => s.patternId);
  const select = useLibrary((s) => s.selectPattern);
  const [open, setOpen] = useState(false);
  const focus = useDrawerFocus();
  const isQuick = QUICK_IDS.includes(patternId);

  return (
    <div className="flex items-center gap-2">
      <Segmented<string>
        label="박자"
        value={isQuick ? patternId : ""}
        onChange={select}
        options={QUICK_IDS.map((id) => ({ value: id, label: getPattern(id).nameKo }))}
        variant="primary"
        size="lg"
        className="min-w-0 flex-1 sm:max-w-md"
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-12 shrink-0 items-center gap-1.5 rounded-lg border border-rule bg-sheet px-3.5 text-[15px] text-ink transition-colors hover:bg-wash",
              !isQuick && "border-primary bg-primary font-semibold text-white hover:bg-primary/90",
            )}
          >
            다른 박자
            <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" {...focus}>
          <SheetHeader>
            <SheetTitle className="text-[17px]">박자 고르기</SheetTitle>
            <SheetDescription className="sr-only">연습할 박자 패턴을 고릅니다.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
            <PatternList onPicked={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
