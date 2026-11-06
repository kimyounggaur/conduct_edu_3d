import { useRef } from "react";

/**
 * 서랍을 닫은 뒤 키보드 초점을 어디에 둘지 정한다.
 * - 키보드로 쓰다 닫으면(Esc, Enter로 고르기) 서랍을 열었던 버튼으로 초점을 돌려준다.
 *   키보드·화면 낭독 사용자가 자리를 잃지 않게 하는 기본 동작이다.
 * - 마우스·터치로 닫으면 초점을 버튼에 두지 않는다.
 *   그대로 두면 곧바로 Space를 눌러도 재생 대신 서랍이 다시 열려 버린다.
 * 사용: <SheetContent {...useDrawerFocus()}>
 */
export function useDrawerFocus() {
  const lastInput = useRef<"keyboard" | "pointer">("pointer");
  return {
    onKeyDown: () => {
      lastInput.current = "keyboard";
    },
    onEscapeKeyDown: () => {
      lastInput.current = "keyboard";
    },
    onPointerDown: () => {
      lastInput.current = "pointer";
    },
    onPointerDownOutside: () => {
      lastInput.current = "pointer";
    },
    onCloseAutoFocus: (e: Event) => {
      if (lastInput.current !== "keyboard") e.preventDefault();
      lastInput.current = "pointer";
    },
  };
}
