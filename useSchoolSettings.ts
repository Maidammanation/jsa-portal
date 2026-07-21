"use client";

// lib/useSchoolSettings.ts
// Provides the CURRENT session/term, live from Firestore, so admins can change
// it from Settings without needing a redeploy. Falls back to the env-var
// defaults in settings/config.ts until Firestore has a value (first run).

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";
import { SCHOOL } from "@/settings/config";

export function useSchoolSettings() {
  const [session, setSession] = useState(SCHOOL.session);
  const [term, setTerm] = useState(SCHOOL.term);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "schoolSettings", "current"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.session) setSession(data.session);
          if (data.term) setTerm(data.term);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsubscribe();
  }, []);

  return { session, term, loading };
}