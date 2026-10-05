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

import { updateSchoolSettings } from "@/services/database";

import { updateResultStatus } from "@/services/resultSettings";

import { SCHOOL } from "@/settings/config";

type ResultStatus =
  | "open"
  | "locked"
  | "published";

export default function SettingsPage() {
  const { profile } = useAuth();

  const {
    session,
    term,
    resultStatus,
    loading: settingsLoading,
  } = useSchoolSettings();

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
    <div className="max-w-5xl space-y-6 pb-10">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="rounded-2xl bg-brand text-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
              JSA ADMINISTRATION
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              School Control Centre
            </h1>

            <p className="mt-1 text-sm text-white/75">
              Manage your school settings, academic period,
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
            School Identity
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Official information currently configured for this
            school portal.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              School
            </p>

            <p className="mt-2 text-sm font-bold text-gray-800">
              {SCHOOL.name}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              {SCHOOL.shortName}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Motto
            </p>

            <p className="mt-2 text-sm font-bold text-gray-800">
              Knowledge is Light
            </p>

            <p className="mt-1 text-xs text-gray-500">
              School motto
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Main Campus
            </p>

            <p className="mt-2 text-sm font-bold text-gray-800">
              Zaria
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Main Campus
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Annex
            </p>

            <p className="mt-2 text-sm font-bold text-gray-800">
              Gaskiya Road
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Zaria Annex
            </p>
          </div>

        </div>
      </section>

      {/* ======================================================
          ACCOUNT
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
          className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm"
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
          className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm space-y-5"
        >

          {/* CURRENT STATUS */}

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

          {/* STATUS SELECT */}

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

          {/* WORKFLOW */}

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
          className="rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm"
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
                {SCHOOL.shortName}
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
                {SCHOOL.name}
              </span>
              . Changes to academic settings and result
              publication are reflected across the connected
              school portal.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}