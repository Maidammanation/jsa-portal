// settings/config.ts
// Single source of truth for school branding info and role definitions.
// Update SCHOOL info here (or via env vars) and it reflects across the whole portal.

export const SCHOOL = {
  name: process.env.NEXT_PUBLIC_SCHOOL_NAME || "Jidda Standard Academy",
  shortName: "JSA",
  session: process.env.NEXT_PUBLIC_CURRENT_SESSION || "2025/2026",
  term: process.env.NEXT_PUBLIC_CURRENT_TERM || "First Term",
  logoPath: "/assets/logo/school-logo.svg",
  stampPath: "/assets/logo/school-stamp.png",
};

export type Role =
  | "super-admin"
  | "admin"
  | "teacher"
  | "student"
  | "parent";

export type AccountStatus = "active" | "suspended" | "disabled";

// Route each role lands on immediately after login.
export const ROLE_HOME: Record<Role, string> = {
  "super-admin": "/super-admin",
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

// Sidebar menu items per role. Extend freely as features are built out.
export const ROLE_MENUS: Record<Role, { label: string; href: string }[]> = {
  "super-admin": [
    { label: "Dashboard", href: "/super-admin" },
    { label: "Manage Admins", href: "/super-admin/admins" },
    { label: "Schools/Branches", href: "/super-admin/branches" },
    { label: "System Settings", href: "/super-admin/settings" },
  ],
  admin: [
    { label: "Dashboard", href: "/admin" },
    { label: "Students", href: "/admin/students" },
    { label: "Teachers", href: "/admin/teachers" },
    { label: "Parents", href: "/admin/parents" },
    { label: "Classes & Subjects", href: "/admin/classes" },
    { label: "Attendance", href: "/admin/attendance" },
    { label: "Results", href: "/admin/results" },
    { label: "Fees", href: "/admin/fees" },
    { label: "Announcements", href: "/admin/announcements" },
    { label: "Branding", href: "/admin/branding" },
    { label: "Activity Log", href: "/admin/activity" },
    { label: "Settings", href: "/admin/settings" },
  ],
  teacher: [
    { label: "Dashboard", href: "/teacher" },
    { label: "My Classes", href: "/teacher/classes" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Upload Results", href: "/teacher/results" },
    { label: "Settings", href: "/teacher/settings" },
  ],
  student: [
    { label: "Dashboard", href: "/student" },
    { label: "My Results", href: "/student/results" },
    { label: "Attendance", href: "/student/attendance" },
    { label: "Fees", href: "/student/fees" },
    { label: "Settings", href: "/student/settings" },
  ],
  parent: [
    { label: "Dashboard", href: "/parent" },
    { label: "My Children", href: "/parent/children" },
    { label: "Results", href: "/parent/results" },
    { label: "Fees", href: "/parent/fees" },
    { label: "Settings", href: "/parent/settings" },
  ],
};
