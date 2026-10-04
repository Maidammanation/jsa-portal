import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export type ResultStatus =
  | "open"
  | "locked"
  | "published";

export interface ResultSettings {
  status: ResultStatus;
  updatedAt?: unknown;
  updatedBy?: string;
}

const SETTINGS_DOC = doc(
  db,
  "schoolSettings",
  "current"
);

export async function getResultStatus(): Promise<ResultStatus> {
  try {
    const snap = await getDoc(SETTINGS_DOC);

    if (!snap.exists()) {
      return "open";
    }

    const value =
      snap.data()?.resultStatus;

    if (
      value === "locked" ||
      value === "published"
    ) {
      return value;
    }

    return "open";
  } catch {
    return "open";
  }
}

export async function updateResultStatus(
  status: ResultStatus,
  actor: string
) {
  const snap = await getDoc(SETTINGS_DOC);

  if (snap.exists()) {
    await updateDoc(SETTINGS_DOC, {
      resultStatus: status,
      resultStatusUpdatedBy: actor,
      resultStatusUpdatedAt: new Date(),
    });

    return;
  }

  await setDoc(
    SETTINGS_DOC,
    {
      resultStatus: status,
      resultStatusUpdatedBy: actor,
      resultStatusUpdatedAt: new Date(),
    },
    { merge: true }
  );
}