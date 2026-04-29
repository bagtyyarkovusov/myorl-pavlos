import { useState } from "react";

export function useNavigationState() {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeId = hoveredId || openMenuId;

  const openMenu = (id: string) => setOpenMenuId(id);
  const closeMenus = () => setOpenMenuId(null);
  const clickToToggle = (id: string) => {
    setOpenMenuId((prev) => (prev === id ? null : id));
  };

  return {
    openMenuId,
    hoveredId,
    activeId,
    setHoveredId,
    openMenu,
    closeMenus,
    clickToToggle,
  };
}
