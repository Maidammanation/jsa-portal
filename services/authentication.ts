// services/authentication.ts
// Wraps Firebase Auth + Firestore "users" collection lookups so components
// never talk to Firebase directly. Every user document is expected to look like:
// { uid, email, role, status, mustChangePassword, name, ... }

import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
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

/** Logs a user in and returns their profile (including role) from Firestore. */
export async function login(email: string, password: string): Promise<UserProfile> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await getUserProfile(credential.user.uid);

  if (!profile) {
    throw new Error("No user profile found. Contact your administrator.");
  }
  if (profile.status === "suspended") {
    await signOut(auth);
    throw new Error("This account is suspended. Contact your administrator.");
  }
  if (profile.status === "disabled") {
    await signOut(auth);
    throw new Error("This account has been disabled.");
  }

  await establishServerSession(credential.user);

  return profile;
}

export async function logout(): Promise<void> {
  await signOut(auth);
  await clearServerSession();
}

export async function establishServerSession(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    throw new Error("Could not establish a secure session. Please try again.");
  }
}

export async function clearServerSession(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { ...(snap.data() as UserProfile), uid: snap.id };
}

export async function changePassword(user: User, newPassword: string): Promise<void> {
  await updatePassword(user, newPassword);
  await updateDoc(doc(db, "users", user.uid), { mustChangePassword: false });
}

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function createLoginAccount(params: {
  email: string;
  password: string;
  name: string;
  role: "teacher" | "student" | "parent" | "super-admin";
  linkCollection?: string;
  linkId?: string;
}): Promise<string> {
  const res = await fetch("/api/admin/create-account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Could not create account.");
  }
  return data.uid;
}