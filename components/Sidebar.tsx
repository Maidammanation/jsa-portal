"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROLE_MENUS, type Role } from "@/settings/config";

interface SidebarProps {
  role: Role;
  open: boolean;
}

export default function Sidebar({ role, open }: SidebarProps) {
  const pathname = usePathname();
  const items = ROLE_MENUS[role];

  return (
    <aside
      className={`bg-brand-dark text-white w-64 shrink-0 flex flex-col fixed lg:static inset-y-0 left-0 z-20 transform transition-transform duration-200 ${
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-brand-dark"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
