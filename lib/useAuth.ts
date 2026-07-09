"use client";

// lib/useAuth.ts
// Client-side hook that exposes the logged-in Firebase user plus their
// Firestore profile (role, status, name). Use this inside dashboard layouts
// to guard pages and show the right sidebar/menu for the role.

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { watchAuthState, getUserProfile, type UserProfile } from "@/services/authentication";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      if (!user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }
      const profile = await getUserProfile(user.uid);
      setState({ user, profile, loading: false });
    });
    return () => unsubscribe();
  }, []);

  return state;
}
