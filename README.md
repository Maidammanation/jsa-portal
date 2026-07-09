# Jidda Standard Academy Portal (JSA Portal)

Next.js 14 (App Router) + Firebase scaffold for the JSA public website and
role-based dashboards (Super Admin, Admin, Teacher, Student, Parent).

## What's included

- **Public website**: `/`, `/website/about`, `/website/admissions`
- **Login**: `/login` — single login form, detects role from Firestore after
  auth, and forces a password change on first login (`mustChangePassword` flag)
- **Dashboards**: `/admin`, `/teacher`, `/student`, `/parent`, `/super-admin`
  — each wrapped in a shared `DashboardShell` (top navbar + role-based sidebar)
- **Admin home page**: stats grid, quick info, quick actions, recent-activity feed
- **Students** (`/admin/students`): list with search, add, edit, and a
  promote-class flow (`/admin/students/promote`)
- **Attendance** (`/admin/attendance`): pick a class + date, mark each student
  present/absent/late, submit — pre-fills if attendance was already taken that day
- **Results** (`/admin/results`): pick a class + subject, enter CA1/CA2/exam
  scores per student, auto-computes total + grade, saves to Firestore
- **Report cards** (`/admin/results/report-cards`): pick a student, view all
  subject results for the term with a print/PDF-ready layout
- **Server-side auth guard**: `middleware.ts` + `/api/auth/session` +
  `/api/auth/verify` enforce a real httpOnly session cookie (see below)
- **Services layer** (`/services`): `firebase.ts`, `authentication.ts`,
  `database.ts`, `storage.ts` — all Firestore/Firebase calls are isolated here
- **Reusable UI** (`/components`): Navbar, Sidebar, Footer, Cards, Tables,
  Forms, Buttons
- **Settings** (`/settings/config.ts`): school branding info, role→home route
  map, and role→sidebar menu map — edit this file to add new menu items

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in your Firebase project keys
npm run dev
```

## Firestore data model (expected collections)

- `users/{uid}` → `{ name, email, role, status, mustChangePassword }`
- `students/{id}` → `{ admissionNo, firstName, lastName, classId, className, gender, dateOfBirth, parentUid, status }`
- `classes/{id}` → `{ name, level, classTeacherUid, classTeacherName }`
- `subjects/{id}` → `{ name, code }`
- `teachers`, `parents` → used for admin dashboard stats
- `attendance/{id}` → `{ classId, date, records: [{ studentId, status }], takenBy }`
- `results/{id}` → `{ studentId, subjectId, classId, term, session, ca1, ca2, exam, total, grade, remark }`
- `activityLog/{id}` → `{ action, actor, details, createdAt }` — written to
  automatically by `logActivity()` whenever students/attendance/results change

## Server-side auth guard — how it works

1. On login, the client signs in with Firebase Auth, then exchanges the ID
   token for an **httpOnly session cookie** via `POST /api/auth/session`
   (see `establishServerSession()` in `services/authentication.ts`).
2. `middleware.ts` runs on every request to `/admin/*`, `/teacher/*`,
   `/student/*`, `/parent/*`, `/super-admin/*`. It calls `GET /api/auth/verify`
   (a Node-runtime route, since Edge middleware can't run firebase-admin
   directly) forwarding the request's cookies. No valid session → redirect to
   `/login`.
3. `DashboardShell` does the role-specific check client-side (role lives in
   Firestore, not the session cookie), redirecting a logged-in user to their
   *own* dashboard if they land on the wrong one.
4. Logout calls both client `signOut()` and `DELETE /api/auth/session` to
   clear the cookie.

**To enable this**, generate a service account key (Firebase Console >
Project Settings > Service Accounts > Generate new private key) and paste the
full JSON as a single-line string into `FIREBASE_SERVICE_ACCOUNT_KEY` in
`.env.local`. Without it, `/api/auth/session` and `/api/auth/verify` will
throw — the rest of the app runs fine either way in dev, but protected routes
will keep redirecting to `/login` until this is set.

## What's still stubbed

- Add/edit pages exist for **students** only — teachers/parents/classes admin
  pages follow the same pattern (`services/database.ts` generic
  `create`/`update`/`remove` + `getAll` helpers) but aren't built yet.
- Grading boundaries in `lib/grading.ts` are a placeholder (A=75+, B=65+, etc.)
  — adjust to the school's real grading policy.
- The school logo at `public/assets/logo/school-logo.svg` is a placeholder;
  replace it (and wire up the Admin > Branding upload flow using
  `services/storage.ts`) with the real logo, stamp, and signatures.
- Firestore security rules aren't included — the service account key bypasses
  them for server routes, but client reads/writes need rules written before
  going to production.

## Folder structure

```
jsa-portal/
├── app/
│   ├── api/auth/         # session + verify routes (server-side auth)
│   ├── admin/            # dashboard, students, attendance, results
│   ├── teacher|student|parent|super-admin/
│   ├── login/
│   └── website/          # public about/admissions pages
├── components/           # Shared UI components
├── services/             # Firebase, auth, database, storage
├── settings/              # School config, roles, menus
├── lib/                   # useAuth hook, types, grading helper, firebaseAdmin
├── public/assets/         # Served static files (logo, images, icons)
└── assets/                # Raw/source design assets (not served directly)
```

