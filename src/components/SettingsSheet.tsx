"use client";

import { SlidersHorizontal } from "lucide-react";
import { OptionsPanel } from "@/components/OptionsPanel";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useDrawerFocus } from "@/lib/drawerFocus";

/** 위쪽 줄 오른쪽의 '설정' 버튼과, 누르면 열리는 서랍 */
export function SettingsSheet() {
  const focus = useDrawerFocus();
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-rule bg-sheet px-3.5 text-[14px] font-medium text-ink transition-colors hover:bg-wash"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          설정
        </button>
      </SheetTrigger>
      <SheetContent side="right" {...focus}>
        <SheetHeader>
          <SheetTitle className="text-[17px]">설정</SheetTitle>
          <SheetDescription className="sr-only">연습 방식, 보기, 소리를 바꿉니다. 바꾼 값은 이 기기에 저장됩니다.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          <OptionsPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
