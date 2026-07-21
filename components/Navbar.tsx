"use client";

import Image from "next/image";
import { SCHOOL } from "@/settings/config";
import { logout } from "@/services/authentication";
import { useRouter } from "next/navigation";
import { useSchoolSettings } from "@/lib/useSchoolSettings";
import { useClock } from "@/lib/useClock";

interface NavbarProps {
  userName?: string;
  onMenuToggle?: () => void;
}

export default function Navbar({ userName, onMenuToggle }: NavbarProps) {
  const router = useRouter();
  const { session, term } = useSchoolSettings();
  const now = useClock();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded hover:bg-gray-100"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <div className="w-9 h-9 relative shrink-0">
          <Image
            src={SCHOOL.logoPath}
            alt={`${SCHOOL.name} logo`}
            fill
            className="object-contain"
          />
        </div>
        <div className="leading-tight">
          <p className="font-semibold text-brand text-sm sm:text-base">{SCHOOL.name}</p>
          <p className="text-xs text-gray-500">
            {session} &middot; {term}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:block text-xs text-gray-500 text-right leading-tight">
          <p>{dateStr}</p>
          <p>{timeStr}</p>
        </div>
        <button className="relative p-2 rounded hover:bg-gray-100" aria-label="Notifications">
          🔔
        </button>
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-medium text-gray-800">{userName || "User"}</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm font-medium text-brand hover:text-brand-dark px-3 py-1.5 rounded border border-brand/30 hover:bg-brand/5"
        >
          Logout
        </button>
      </div>
    </header>
  );
}