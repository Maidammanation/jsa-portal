"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { ROLE_HOME, type Role } from "@/settings/config";
import { useAuth } from "@/lib/useAuth";

export default function DashboardShell({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // middleware.ts already blocks unauthenticated requests to this route at the
    // edge, but the client-side Firebase Auth state can lag a beat behind — this
    // is the belt-and-suspenders check, plus the role-mismatch check middleware
    // can't do (role lives in Firestore, not the session cookie).
    if (!profile) {
      router.replace("/login");
      return;
    }
    if (profile.role !== role) {
      router.replace(ROLE_HOME[profile.role]);
    }
  }, [loading, profile, role, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar userName={profile?.name} onMenuToggle={() => setSidebarOpen((v) => !v)} />
      <div className="flex flex-1">
        <Sidebar role={role} open={sidebarOpen} />
        <main className="flex-1 p-4 sm:p-6 bg-gray-50 min-w-0">
          {loading || !profile || profile.role !== role ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
