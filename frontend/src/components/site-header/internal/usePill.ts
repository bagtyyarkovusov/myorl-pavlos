import { useCallback, useRef, useState } from "react";

type PillRect = { width: number; left: number };

export function usePill() {
  const rectMap = useRef<Map<string, PillRect>>(new Map());
  const [pillStyle, setPillStyle] = useState<PillRect & { opacity: number }>({
    width: 0,
    left: 0,
    opacity: 0,
  });

  const registerRect = useCallback((id: string, rect: PillRect) => {
    rectMap.current.set(id, rect);
  }, []);

  const sync = useCallback((activeId: string | null) => {
    if (!activeId) {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }
    const rect = rectMap.current.get(activeId);
    if (rect) {
      setPillStyle({ width: rect.width, left: rect.left, opacity: 1 });
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, []);

  return { pillStyle, registerRect, sync };
}
