/**
 * 기기 저장소(localStorage)를 안전하게 쓰기 위한 감싸개.
 * 사생활 보호 모드·미리보기 등에서는 저장소가 비어 있거나 오류를 낼 수 있어서 모든 접근을 try/catch로 감싼다.
 */
import { createJSONStorage } from "zustand/middleware";

export const safeStorage = createJSONStorage(() => ({
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* 저장 실패는 무시: 다음 방문 때 기본값으로 시작 */
    }
  },
  removeItem: (key: string) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* 무시 */
    }
  },
}));
