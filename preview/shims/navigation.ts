/**
 * 미리보기(한 파일 빌드)용 next/navigation 대체: #library… 해시를 /library 경로로 읽는다.
 */
import { useEffect, useState } from "react";

export function hashPath(): string {
  const h = window.location.hash.replace(/^#/, "");
  return h === "library" || h.startsWith("library-") ? "/library" : "/";
}

export function usePathname(): string {
  const [path, setPath] = useState("/");
  useEffect(() => {
    const update = () => setPath(hashPath());
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return path;
}
