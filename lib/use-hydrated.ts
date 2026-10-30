"use client";

import { useEffect, useState } from "react";

/** Keep server-rendered controls inactive until React has attached their handlers. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}
