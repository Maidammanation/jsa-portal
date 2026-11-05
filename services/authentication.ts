// services/authentication.ts
// Wraps Firebase Auth + Firestore "users" collection lookups so components
// never talk to Firebase directly. Every user document is expected to look like:
// { uid, email, role, status, mustChangePassword, name, ... }

import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import type { Role, AccountStatus } from "@/settings/config";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: Role;
  status: AccountStatus;
  mustChangePassword: boolean;
}

/** Stop a stalled network operation from leaving the login screen spinning forever. */
async function withTimeout<T>(
  operation: Promise<T>,
  message: string,
  timeoutMs = 15000
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(message)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** Logs a user in and returns their profile (including role) from Firestore. */
export async function login(
  email: string,
  password: string
): Promise<UserProfile> {
  const normalizedEmail = email.trim().toLowerCase();

  const credential = await withTimeout(
    signInWithEmailAndPassword(auth, normalizedEmail, password),
    "Login is taking too long. Check your internet connection and try again."
  );

  try {
    const profile = await withTimeout(
      getUserProfile(credential.user.uid),
      "Your account was verified, but your user profile could not be loaded. Please try again."
    );

    if (!profile) {
      throw new Error(
        "No user profile found. Contact your administrator."
      );
    }

    if (profile.status === "suspended") {
      throw new Error(
        "This account is suspended. Contact your administrator."
      );
    }

    if (profile.status === "disabled") {
      throw new Error(
        "This account has been disabled."
      );
    }

    await establishServerSession(credential.user);
    return profile;
  } catch (error) {
    // Avoid leaving Firebase signed in when the secure portal session failed.
    try {
      await signOut(auth);
    } catch {
      // Preserve the original, more useful login error.
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
  await clearServerSession();
}

export async function establishServerSession(
  user: User
): Promise<void> {
  const idToken = await withTimeout(
    user.getIdToken(),
    "Firebase took too long to verify your account. Please try again."
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      let detail = "";
      try {
        const data = await res.json();
        detail = typeof data.error === "string" ? data.error : "";
      } catch {
        // The endpoint may return an empty or non-JSON response.
      }
      throw new Error(
        detail || "Could not establish a secure session. Please try again."
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Secure login timed out. Check your connection and try again."
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function clearServerSession(): Promise<void> {
  await fetch("/api/auth/session", {
    method: "DELETE",
  });
}

export async function getUserProfile(
  uid: string
): Promise<UserProfile | null> {
  const snap = await getDoc(
    doc(db, "users", uid)
  );

  if (!snap.exists()) {
    return null;
  }

  return {
    ...(snap.data() as UserProfile),
    uid: snap.id,
  };
}

export async function changePassword(
  user: User,
  newPassword: string
): Promise<void> {
  await updatePassword(user, newPassword);

  await updateDoc(
    doc(db, "users", user.uid),
    {
      mustChangePassword: false,
    }
  );
}

/**
 * Sends a Firebase password-reset email.
 */
export async function sendPasswordReset(
  email: string
): Promise<void> {
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  if (!normalizedEmail) {
    throw new Error(
      "Please enter your email address."
    );
  }

  await sendPasswordResetEmail(
    auth,
    normalizedEmail
  );
}

export function watchAuthState(
  callback: (user: User | null) => void
) {
  return onAuthStateChanged(
    auth,
    callback
  );
}

/**
 * Creates a Firebase login account through the
 * secure server-side API.
 *
 * Admin accounts can only be created by a
 * Super Admin on the server.
 */
export async function createLoginAccount(params: {
  email: string;
  password: string;
  name: string;
  role:
    | "admin"
    | "teacher"
    | "student"
    | "parent"
    | "super-admin";
  linkCollection?: string;
  linkId?: string;
}): Promise<string> {
  const res = await fetch(
    "/api/admin/create-account",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error ||
        "Could not create account."
    );
  }

  return data.uid;
}
