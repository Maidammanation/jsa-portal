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

  // Super-admin (Director) is allowed to use the admin dashboard.
  const hasAccess =
    profile &&
    (profile.role === role ||
      (role === "admin" && profile.role === "super-admin"));

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      router.replace("/login");
      return;
    }

    if (
      profile.role !== role &&
      !(role === "admin" && profile.role === "super-admin")
    ) {
      router.replace(ROLE_HOME[profile.role]);
    }
  }, [loading, profile, role, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        userName={profile?.name}
        onMenuToggle={() => setSidebarOpen((v) => !v)}
      />

      <div className="flex flex-1">
        <Sidebar
          role={profile?.role === "super-admin" ? "super-admin" : role}
          open={sidebarOpen}
        />

        <main className="flex-1 p-4 sm:p-6 bg-gray-50 min-w-0 flex flex-col">
          {/* Main portal content */}
          <div className="flex-1">
            {loading || !hasAccess ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : (
              children
            )}
          </div>

          {/* Portal Developer Branding */}
          <footer className="pt-8 pb-2 text-center">
            <p className="text-xs text-gray-400">
              Designed &amp; Developed by{" "}
              <span className="font-semibold text-gray-500">
                Maidammanation Tech Company
              </span>
            </p>

            <p className="text-[11px] text-gray-400 mt-1">
              08032191668 / 08117106867
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}