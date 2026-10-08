"use client";

import { useEffect, useState } from "react";

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

import {
  TextInput,
  SelectInput,
} from "@/components/Forms";

import { Button } from "@/components/Buttons";

import { auth } from "@/services/firebase";

import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";

import {
  updateSchoolSettings,
} from "@/services/database";

import { updateResultStatus } from "@/services/resultSettings";

import { SCHOOL } from "@/settings/config";

type ResultStatus =
  | "open"
  | "locked"
  | "published";

type SchoolIdentity = {
  schoolName: string;
  shortName: string;
  motto: string;

  mainCampusName: string;
  mainCampusAddress: string;

  annexName: string;
  annexAddress: string;

  phone1: string;
  phone2: string;
  email: string;
  website: string;
};

const DEFAULT_IDENTITY: SchoolIdentity = {
  schoolName: SCHOOL.name || "Jidda Standard Academy",
  shortName: SCHOOL.shortName || "JSA",
  motto: "Knowledge is Light",

  mainCampusName: "Main Campus — Zaria",
  mainCampusAddress:
    "No. 5 Hayin Dogo, Anguwan Rafi Danmagaji, Zaria",

  annexName: "Annex — Gaskiya Road",
  annexAddress:
    "No. 5 Aminu Mai Kai Close, Behind Baba Kaduna's Garage, Gaskiya Road, Zaria",

  phone1: "08121414008",
  phone2: "08069121401",
  email: "",
  website: "",
};

export default function SettingsPage() {
  const { profile } = useAuth();

  const {
    session,
    term,
    resultStatus,
    loading: settingsLoading,
  } = useSchoolSettings();

  // ============================================================
  // SCHOOL IDENTITY
  // ============================================================

  const [identity, setIdentity] =
    useState<SchoolIdentity>(DEFAULT_IDENTITY);

  const [savingIdentity, setSavingIdentity] =
    useState(false);

  const [identityMessage, setIdentityMessage] =
    useState("");

  const [identityError, setIdentityError] =
    useState("");

  // ============================================================
  // PASSWORD
  // ============================================================

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [savingPassword, setSavingPassword] =
    useState(false);

  const [passwordError, setPasswordError] =
    useState("");

  const [passwordSuccess, setPasswordSuccess] =
    useState("");

  // ============================================================
  // SESSION / TERM
  // ============================================================

  const [sessionInput, setSessionInput] =
    useState(session);

  const [termInput, setTermInput] =
    useState(term);

  const [savingTerm, setSavingTerm] =
    useState(false);

  const [termMessage, setTermMessage] =
    useState("");

  // ============================================================
  // RESULT STATUS
  // ============================================================

  const [selectedResultStatus, setSelectedResultStatus] =
    useState<ResultStatus>(resultStatus);

  const [savingResultStatus, setSavingResultStatus] =
    useState(false);

  const [resultStatusMessage, setResultStatusMessage] =
    useState("");

  // ============================================================
  // LOAD SCHOOL IDENTITY
  // ============================================================

  useEffect(() => {
    const loadIdentity = async () => {
      try {
        const response = await fetch(
          "/api/admin/school-settings",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (data?.settings) {
          setIdentity({
            ...DEFAULT_IDENTITY,
            ...data.settings,
          });
        }
      } catch {
        // Keep default settings if the request fails.
      }
    };

    loadIdentity();
  }, []);

  // ============================================================
  // SYNC LIVE SETTINGS
  // ============================================================

  useEffect(() => {
    setSessionInput(session);
    setTermInput(term);
  }, [session, term]);

  useEffect(() => {
    setSelectedResultStatus(resultStatus);
  }, [resultStatus]);

  // ============================================================
  // ACTOR
  // ============================================================

  const actor =
    profile?.name ||
    profile?.email ||
    "admin";

  // ============================================================
  // UPDATE IDENTITY FIELD
  // ============================================================

  const updateIdentity = (
    field: keyof SchoolIdentity,
    value: string
  ) => {
    setIdentity((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ============================================================
  // SAVE SCHOOL IDENTITY
  // ============================================================

  const handleSaveIdentity = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setIdentityMessage("");
    setIdentityError("");

    if (!identity.schoolName.trim()) {
      setIdentityError(
        "School name is required."
      );
      return;
    }

    if (!identity.shortName.trim()) {
      setIdentityError(
        "School short name is required."
      );
      return;
    }

    if (!identity.motto.trim()) {
      setIdentityError(
        "School motto is required."
      );
      return;
    }

    setSavingIdentity(true);

    try {
      const response = await fetch(
        "/api/admin/school-settings",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identity: {
              schoolName:
                identity.schoolName.trim(),

              shortName:
                identity.shortName.trim(),

              motto:
                identity.motto.trim(),

              mainCampusName:
                identity.mainCampusName.trim(),

              mainCampusAddress:
                identity.mainCampusAddress.trim(),

              annexName:
                identity.annexName.trim(),

              annexAddress:
                identity.annexAddress.trim(),

              phone1:
                identity.phone1.trim(),

              phone2:
                identity.phone2.trim(),

              email:
                identity.email.trim(),

              website:
                identity.website.trim(),
            },

            actor,
          }),
        }
      );

      const data =
        await response.json().catch(
          () => ({})
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Could not save school information."
        );
      }

      setIdentityMessage(
        "School information updated successfully. The saved information is now available to connected portal components."
      );
    } catch (err) {
      setIdentityError(
        err instanceof Error
          ? err.message
          : "Could not save school information."
      );
    } finally {
      setSavingIdentity(false);
    }
  };

  // ============================================================
  // CHANGE PASSWORD
  // ============================================================

  const handleChangePassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError(
        "Enter your current password."
      );
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "New password must be at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "New passwords do not match."
      );
      return;
    }

    const user = auth.currentUser;

    if (!user || !user.email) {
      setPasswordError(
        "Your session has expired. Please log out and sign in again."
      );
      return;
    }

    setSavingPassword(true);

    try {
      const credential =
        EmailAuthProvider.credential(
          user.email,
          currentPassword
        );

      await reauthenticateWithCredential(
        user,
        credential
      );

      await updatePassword(
        user,
        newPassword
      );

      setPasswordSuccess(
        "Password updated successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not update password.";

      if (
        message.includes(
          "auth/invalid-credential"
        )
      ) {
        setPasswordError(
          "Current password is incorrect."
        );
      } else {
        setPasswordError(message);
      }
    } finally {
      setSavingPassword(false);
    }
  };

  // ============================================================
  // SAVE SESSION & TERM
  // ============================================================

  const handleSaveTerm = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setTermMessage("");

    const cleanSession =
      sessionInput.trim();

    if (!cleanSession) {
      setTermMessage(
        "Please enter a valid school session."
      );
      return;
    }

    setSavingTerm(true);

    try {
      await updateSchoolSettings(
        cleanSession,
        termInput,
        actor
      );

      setTermMessage(
        "Session and term updated successfully. The new academic period is now live across the portal."
      );
    } catch (err) {
      setTermMessage(
        err instanceof Error
          ? err.message
          : "Could not update session and term."
      );
    } finally {
      setSavingTerm(false);
    }
  };

  // ============================================================
  // SAVE RESULT STATUS
  // ============================================================

  const handleSaveResultStatus =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      setResultStatusMessage("");
      setSavingResultStatus(true);

      try {
        await updateResultStatus(
          selectedResultStatus,
          actor
        );

        if (
          selectedResultStatus ===
          "open"
        ) {
          setResultStatusMessage(
            "Results are now OPEN. Teachers can upload, edit and delete results."
          );
        } else if (
          selectedResultStatus ===
          "locked"
        ) {
          setResultStatusMessage(
            "Results are now LOCKED. Teachers cannot change results, while administrators can still make corrections."
          );
        } else {
          setResultStatusMessage(
            "Results are now PUBLISHED. Students and parents can view their results."
          );
        }
      } catch (err) {
        setResultStatusMessage(
          err instanceof Error
            ? err.message
            : "Could not update result status."
        );
      } finally {
        setSavingResultStatus(false);
      }
    };

  // ============================================================
  // RESULT STATUS INFORMATION
  // ============================================================

  const statusInfo = {
    open: {
      title: "Results Open",
      description:
        "Teachers can upload, edit and delete results.",
      badge: "OPEN",
      icon: "🟢",
      color:
        "border-green-200 bg-green-50 text-green-700",
    },

    locked: {
      title: "Results Locked",
      description:
        "Teachers cannot change results. Administrators can still make corrections.",
      badge: "LOCKED",
      icon: "🔒",
      color:
        "border-amber-200 bg-amber-50 text-amber-700",
    },

    published: {
      title: "Results Published",
      description:
        "Students and parents can view their results.",
      badge: "PUBLISHED",
      icon: "🟣",
      color:
        "border-purple-200 bg-purple-50 text-purple-700",
    },
  } as const;

  const activeStatus =
    statusInfo[selectedResultStatus];

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="max-w-6xl space-y-6 pb-10">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="rounded-2xl bg-brand p-5 text-white shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              JSA ADMINISTRATION
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              School Control Centre
            </h1>

            <p className="mt-1 text-sm text-white/75">
              Manage school identity, academic period,
              results and account security.
            </p>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/60">
              Current Period
            </p>

            <p className="mt-1 text-sm font-bold">
              {settingsLoading
                ? "Loading..."
                : `${session} • ${term}`}
            </p>
          </div>

        </div>
      </div>

      {/* ======================================================
          SCHOOL IDENTITY
      ====================================================== */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            School Identity & Contact
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Edit the official information used by the
            connected school portal.
          </p>
        </div>

        {identityError && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {identityError}
          </div>
        )}

        {identityMessage && (
          <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {identityMessage}
          </div>
        )}

        <form
          onSubmit={handleSaveIdentity}
          className="space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
        >

          {/* BASIC IDENTITY */}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Basic Information
            </p>

            <div className="grid gap-4 md:grid-cols-3">

              <TextInput
                label="School Name"
                value={identity.schoolName}
                onChange={(e) =>
                  updateIdentity(
                    "schoolName",
                    e.target.value
                  )
                }
                placeholder="Jidda Standard Academy"
                required
              />

              <TextInput
                label="Short Name"
                value={identity.shortName}
                onChange={(e) =>
                  updateIdentity(
                    "shortName",
                    e.target.value
                  )
                }
                placeholder="JSA"
                required
              />

              <TextInput
                label="School Motto"
                value={identity.motto}
                onChange={(e) =>
                  updateIdentity(
                    "motto",
                    e.target.value
                  )
                }
                placeholder="Knowledge is Light"
                required
              />

            </div>
          </div>

          {/* MAIN CAMPUS */}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Main Campus
            </p>

            <div className="grid gap-4 md:grid-cols-2">

              <TextInput
                label="Campus Name"
                value={identity.mainCampusName}
                onChange={(e) =>
                  updateIdentity(
                    "mainCampusName",
                    e.target.value
                  )
                }
                placeholder="Main Campus — Zaria"
              />

              <TextInput
                label="Full Address"
                value={identity.mainCampusAddress}
                onChange={(e) =>
                  updateIdentity(
                    "mainCampusAddress",
                    e.target.value
                  )
                }
                placeholder="Full Main Campus address"
              />

            </div>
          </div>

          {/* ANNEX */}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Annex
            </p>

            <div className="grid gap-4 md:grid-cols-2">

              <TextInput
                label="Annex Name"
                value={identity.annexName}
                onChange={(e) =>
                  updateIdentity(
                    "annexName",
                    e.target.value
                  )
                }
                placeholder="Annex — Gaskiya Road"
              />

              <TextInput
                label="Full Address"
                value={identity.annexAddress}
                onChange={(e) =>
                  updateIdentity(
                    "annexAddress",
                    e.target.value
                  )
                }
                placeholder="Full Annex address"
              />

            </div>
          </div>

          {/* CONTACT */}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Contact Information
            </p>

            <div className="grid gap-4 md:grid-cols-2">

              <TextInput
                label="Phone Number 1"
                value={identity.phone1}
                onChange={(e) =>
                  updateIdentity(
                    "phone1",
                    e.target.value
                  )
                }
                placeholder="08121414008"
                type="tel"
              />

              <TextInput
                label="Phone Number 2"
                value={identity.phone2}
                onChange={(e) =>
                  updateIdentity(
                    "phone2",
                    e.target.value
                  )
                }
                placeholder="08069121401"
                type="tel"
              />

              <TextInput
                label="School Email"
                value={identity.email}
                onChange={(e) =>
                  updateIdentity(
                    "email",
                    e.target.value
                  )
                }
                placeholder="school@example.com"
                type="email"
              />

              <TextInput
                label="Website"
                value={identity.website}
                onChange={(e) =>
                  updateIdentity(
                    "website",
                    e.target.value
                  )
                }
                placeholder="https://example.com"
                type="url"
              />

            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs leading-5 text-gray-500">
              School identity changes are saved centrally
              and recorded in the activity log.
            </p>

            <Button
              type="submit"
              disabled={savingIdentity}
              className="w-full sm:w-auto"
            >
              {savingIdentity
                ? "Saving School Information..."
                : "Save School Information"}
            </Button>

          </div>

        </form>
      </section>

      {/* ======================================================
          SCHOOL PREVIEW
      ====================================================== */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            School Information Preview
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              School
            </p>

            <h3 className="mt-2 text-lg font-bold text-gray-800">
              {identity.schoolName}
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              {identity.shortName}
            </p>

            <p className="mt-3 text-sm italic text-gray-600">
              “{identity.motto}”
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Main Campus
            </p>

            <h3 className="mt-2 text-sm font-bold text-gray-800">
              {identity.mainCampusName}
            </h3>

            <p className="mt-2 text-sm leading-5 text-gray-500">
              {identity.mainCampusAddress}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Annex
            </p>

            <h3 className="mt-2 text-sm font-bold text-gray-800">
              {identity.annexName}
            </h3>

            <p className="mt-2 text-sm leading-5 text-gray-500">
              {identity.annexAddress}
            </p>
          </div>

        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Phone
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-800">
                {identity.phone1 || "—"}
              </p>

              <p className="text-sm text-gray-500">
                {identity.phone2 || "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Email
              </p>

              <p className="mt-1 break-all text-sm font-semibold text-gray-800">
                {identity.email || "Not configured"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Website
              </p>

              <p className="mt-1 break-all text-sm font-semibold text-gray-800">
                {identity.website || "Not configured"}
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ======================================================
          ADMINISTRATOR ACCOUNT
      ====================================================== */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Administrator Account
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Your currently authenticated portal account.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Name
            </p>

            <p className="mt-2 text-sm font-semibold text-gray-800">
              {profile?.name || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Email
            </p>

            <p className="mt-2 break-all text-sm font-semibold text-gray-800">
              {profile?.email || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Role
            </p>

            <p className="mt-2 text-sm font-semibold capitalize text-gray-800">
              {profile?.role || "—"}
            </p>
          </div>

        </div>
      </section>

      {/* ======================================================
          ACADEMIC PERIOD
      ====================================================== */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Academic Period
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            This controls the active school session and term
            throughout the portal.
          </p>
        </div>

        {termMessage && (
          <div className="mb-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand-dark">
            {termMessage}
          </div>
        )}

        <form
          onSubmit={handleSaveTerm}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">

            <TextInput
              label="Current Session"
              placeholder="e.g. 2025/2026"
              value={sessionInput}
              onChange={(e) =>
                setSessionInput(
                  e.target.value
                )
              }
              required
            />

            <SelectInput
              label="Current Term"
              value={termInput}
              onChange={(e) =>
                setTermInput(
                  e.target.value
                )
              }
              options={[
                {
                  label: "First Term",
                  value: "First Term",
                },
                {
                  label: "Second Term",
                  value: "Second Term",
                },
                {
                  label: "Third Term",
                  value: "Third Term",
                },
              ]}
            />

          </div>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-gray-500">
              Changes apply across the portal immediately.
            </p>

            <Button
              type="submit"
              disabled={savingTerm}
              className="w-full sm:w-auto"
            >
              {savingTerm
                ? "Saving..."
                : "Save Session & Term"}
            </Button>

          </div>
        </form>
      </section>

      {/* ======================================================
          RESULT CONTROL
      ====================================================== */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Result Control Centre
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Control the complete result workflow from teacher
            entry to student and parent publication.
          </p>
        </div>

        {resultStatusMessage && (
          <div className="mb-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand-dark">
            {resultStatusMessage}
          </div>
        )}

        <form
          onSubmit={handleSaveResultStatus}
          className="space-y-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
        >

          <div
            className={`rounded-2xl border p-4 ${activeStatus.color}`}
          >
            <div className="flex items-start gap-3">

              <div className="text-2xl">
                {activeStatus.icon}
              </div>

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center gap-2">

                  <h3 className="font-bold">
                    {activeStatus.title}
                  </h3>

                  <span className="rounded-full border border-current/20 bg-white/60 px-2.5 py-1 text-[10px] font-bold tracking-wider">
                    {activeStatus.badge}
                  </span>

                </div>

                <p className="mt-1 text-sm opacity-80">
                  {activeStatus.description}
                </p>

              </div>

            </div>
          </div>

          <SelectInput
            label="Result Status"
            value={selectedResultStatus}
            onChange={(e) =>
              setSelectedResultStatus(
                e.target.value as ResultStatus
              )
            }
            options={[
              {
                label:
                  "🟢 Open — Teachers can edit",
                value: "open",
              },
              {
                label:
                  "🔒 Locked — Teachers cannot edit",
                value: "locked",
              },
              {
                label:
                  "🟣 Published — Students & Parents can view",
                value: "published",
              },
            ]}
          />

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
              Recommended Result Workflow
            </p>

            <div className="grid gap-3 md:grid-cols-3">

              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                    1
                  </span>

                  <p className="text-sm font-bold text-gray-800">
                    Open
                  </p>
                </div>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Teachers enter, edit and correct students&apos;
                  results.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">
                    2
                  </span>

                  <p className="text-sm font-bold text-gray-800">
                    Lock
                  </p>
                </div>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Teachers stop making changes. Administrators
                  can still correct mistakes.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                    3
                  </span>

                  <p className="text-sm font-bold text-gray-800">
                    Publish
                  </p>
                </div>

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Students and parents can view their completed
                  results.
                </p>
              </div>

            </div>
          </div>

          <Button
            type="submit"
            disabled={savingResultStatus}
            className="w-full"
          >
            {savingResultStatus
              ? "Updating Result Status..."
              : "Save Result Status"}
          </Button>

        </form>
      </section>

      {/* ======================================================
          SECURITY
      ====================================================== */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Account Security
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Change the password used to access this administrator
            account.
          </p>
        </div>

        {passwordError && (
          <div className="mb-3 rounded-xl border border-status-disabled/20 bg-status-disabled/10 px-4 py-3 text-sm text-status-disabled">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-3 rounded-xl border border-status-active/20 bg-status-active/10 px-4 py-3 text-sm text-status-active">
            {passwordSuccess}
          </div>
        )}

        <form
          onSubmit={handleChangePassword}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6"
        >

          <div className="grid gap-4 md:grid-cols-3">

            <TextInput
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) =>
                setCurrentPassword(
                  e.target.value
                )
              }
              autoComplete="current-password"
              required
            />

            <TextInput
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) =>
                setNewPassword(
                  e.target.value
                )
              }
              minLength={8}
              autoComplete="new-password"
              required
            />

            <TextInput
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value
                )
              }
              minLength={8}
              autoComplete="new-password"
              required
            />

          </div>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <p className="text-xs text-gray-500">
              Password must contain at least 8 characters.
            </p>

            <Button
              type="submit"
              disabled={savingPassword}
              className="w-full sm:w-auto"
            >
              {savingPassword
                ? "Updating..."
                : "Update Password"}
            </Button>

          </div>

        </form>
      </section>

      {/* ======================================================
          SYSTEM INFORMATION
      ====================================================== */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            System Information
          </h2>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Portal
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-800">
                JSA School Portal
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                School
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-800">
                {identity.shortName}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Settings
              </p>

              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-gray-800">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Live
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Academic Period
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-800">
                {session}
              </p>

              <p className="text-xs text-gray-500">
                {term}
              </p>
            </div>

          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs leading-5 text-gray-400">
              This control centre manages settings for{" "}
              <span className="font-semibold text-gray-500">
                {identity.schoolName}
              </span>
              . Changes to academic settings, school identity
              and result publication are reflected across the
              connected school portal.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}