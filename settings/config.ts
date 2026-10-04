// settings/config.ts
// Single source of truth for school branding info and role definitions.
// Update SCHOOL info here (or via env vars) and it reflects across the whole portal.

export const SCHOOL = {
  name:
    process.env.NEXT_PUBLIC_SCHOOL_NAME ||
    "Jidda Standard Academy",

  shortName: "JSA",

  session:
    process.env.NEXT_PUBLIC_CURRENT_SESSION ||
    "2025/2026",

  term:
    process.env.NEXT_PUBLIC_CURRENT_TERM ||
    "First Term",

  logoPath: "/assets/school-logo.png",

  stampPath: "/assets/logo/school-stamp.png",
};

export type Role =
  | "super-admin"
  | "admin"
  | "teacher"
  | "student"
  | "parent";

export type AccountStatus =
  | "active"
  | "suspended"
  | "disabled";

/*
|--------------------------------------------------------------------------
| ROLE HOME
|--------------------------------------------------------------------------
|
| This controls where each account type goes immediately after login.
|
| Super Admin -> /super-admin
| Admin      -> /admin
| Teacher    -> /teacher
| Student    -> /student
| Parent     -> /parent
|
*/

export const ROLE_HOME: Record<Role, string> = {
  "super-admin": "/super-admin",

  admin: "/admin",

  teacher: "/teacher",

  student: "/student",

  parent: "/parent",
};

/*
|--------------------------------------------------------------------------
| ROLE MENUS
|--------------------------------------------------------------------------
|
| Super Admin has its own dashboard at /super-admin.
|
| The Super Admin can still use the existing /admin management
| pages for Students, Teachers, Results, Classes, etc.
|
| Normal Admin remains completely separate and continues to use /admin.
|
*/

export const ROLE_MENUS: Record<
  Role,
  { label: string; href: string }[]
> = {
  /*
  |--------------------------------------------------------------------------
  | SUPER ADMIN
  |--------------------------------------------------------------------------
  */

  "super-admin": [
    {
      label: "Dashboard",
      href: "/super-admin",
    },

    {
      label: "Students",
      href: "/admin/students",
    },

    {
      label: "Teachers",
      href: "/admin/teachers",
    },

    {
      label: "Parents",
      href: "/admin/parents",
    },

    {
      label: "Classes & Subjects",
      href: "/admin/classes",
    },

    {
      label: "Attendance",
      href: "/admin/attendance",
    },

    {
      label: "Results",
      href: "/admin/results",
    },

    {
      label: "Fees",
      href: "/admin/fees",
    },

    {
      label: "Announcements",
      href: "/admin/announcements",
    },

    {
      label: "Team",
      href: "/admin/team",
    },

    {
      label: "Activity Log",
      href: "/admin/activity",
    },

    {
      label: "Settings",
      href: "/admin/settings",
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | ADMIN
  |--------------------------------------------------------------------------
  */

  admin: [
    {
      label: "Dashboard",
      href: "/admin",
    },

    {
      label: "Students",
      href: "/admin/students",
    },

    {
      label: "Teachers",
      href: "/admin/teachers",
    },

    {
      label: "Parents",
      href: "/admin/parents",
    },

    {
      label: "Classes & Subjects",
      href: "/admin/classes",
    },

    {
      label: "Attendance",
      href: "/admin/attendance",
    },

    {
      label: "Results",
      href: "/admin/results",
    },

    {
      label: "Fees",
      href: "/admin/fees",
    },

    {
      label: "Announcements",
      href: "/admin/announcements",
    },

    {
      label: "Team",
      href: "/admin/team",
    },

    {
      label: "Activity Log",
      href: "/admin/activity",
    },

    {
      label: "Settings",
      href: "/admin/settings",
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | TEACHER
  |--------------------------------------------------------------------------
  */

  teacher: [
    {
      label: "Dashboard",
      href: "/teacher",
    },

    {
      label: "My Classes",
      href: "/teacher/classes",
    },

    {
      label: "Attendance",
      href: "/teacher/attendance",
    },

    {
      label: "Upload Results",
      href: "/teacher/results",
    },

    {
      label: "Settings",
      href: "/teacher/settings",
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | STUDENT
  |--------------------------------------------------------------------------
  */

  student: [
    {
      label: "Dashboard",
      href: "/student",
    },

    {
      label: "My Results",
      href: "/student/results",
    },

    {
      label: "Attendance",
      href: "/student/attendance",
    },

    {
      label: "Fees",
      href: "/student/fees",
    },

    {
      label: "Settings",
      href: "/student/settings",
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | PARENT
  |--------------------------------------------------------------------------
  */

  parent: [
    {
      label: "Dashboard",
      href: "/parent",
    },

    {
      label: "My Children",
      href: "/parent/children",
    },

    {
      label: "Results",
      href: "/parent/results",
    },

    {
      label: "Fees",
      href: "/parent/fees",
    },

    {
      label: "Settings",
      href: "/parent/settings",
    },
  ],
};