"use client";

// lib/useClock.ts
// Simple ticking clock, updated every second, for display in the navbar.

import { useEffect, useState } from "react";

export function useClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return now;
}