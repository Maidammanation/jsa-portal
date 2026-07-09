"use client";

import Image from "next/image";
import { SCHOOL } from "@/settings/config";
import { logout } from "@/services/authentication";
import { useRouter } from "next/navigation";

interface NavbarProps {
  userName?: string;
  onMenuToggle?: () => void;
}

export default function Navbar({ userName, onMenuToggle }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

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
            {SCHOOL.session} &middot; {SCHOOL.term}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
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
