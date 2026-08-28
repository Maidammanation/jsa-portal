"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  watchAuthState,
  getUserProfile,
  type UserProfile,
} from "@/services/authentication";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = watchAuthState(async (user) => {
      if (!user) {
        setState({
          user: null,
          profile: null,
          loading: false,
        });
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);

        if (!profile) {
          console.error(
            "No Firestore profile found for Firebase UID:",
            user.uid
          );

          setState({
            user,
            profile: null,
            loading: false,
          });

          return;
        }

        console.log("Authenticated user:", user.email);
        console.log("User profile:", profile);

        setState({
          user,
          profile,
          loading: false,
        });
      } catch (error) {
        console.error("Failed to load user profile:", error);

        setState({
          user,
          profile: null,
          loading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return state;
}