"use client";
import { useEffect, useState } from "react";
export function useResponsiveLayout() {
  const [width, setWidth] = useState(1280);
  useEffect(() => { const sync=()=>setWidth(window.innerWidth); sync(); window.addEventListener("resize",sync); return()=>window.removeEventListener("resize",sync); },[]);
  return { width, isPhone: width < 600, isTablet: width >= 600 && width < 1024, isCompact: width < 1024, contentPadding: width < 600 ? 14 : width < 1024 ? 20 : 30 };
}
