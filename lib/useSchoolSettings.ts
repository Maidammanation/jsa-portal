"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "@/services/firebase";
import { SCHOOL } from "@/settings/config";

export type ResultStatus =
  | "open"
  | "locked"
  | "published";

export function useSchoolSettings() {
  const [session, setSession] =
    useState(SCHOOL.session);

  const [term, setTerm] =
    useState(SCHOOL.term);

  const [resultStatus, setResultStatus] =
    useState<ResultStatus>("open");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(
        db,
        "schoolSettings",
        "current"
      ),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();

          if (data.session) {
            setSession(data.session);
          }

          if (data.term) {
            setTerm(data.term);
          }

          if (
            data.resultStatus ===
              "locked" ||
            data.resultStatus ===
              "published"
          ) {
            setResultStatus(
              data.resultStatus
            );
          } else {
            setResultStatus("open");
          }
        } else {
          setResultStatus("open");
        }

        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return {
    session,
    term,
    resultStatus,
    loading,
  };
}