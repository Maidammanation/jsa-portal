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

import {
  updateResultStatus,
} from "@/services/resultSettings";

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
  } = useSchoolSettings();

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [sessionInput, setSessionInput] =
    useState(session);

  const [termInput, setTermInput] =
    useState(term);

  const [savingTerm, setSavingTerm] =
    useState(false);

  const [termMessage, setTermMessage] =
    useState("");

  const [selectedResultStatus, setSelectedResultStatus] =
    useState<ResultStatus>(resultStatus);

  const [savingResultStatus, setSavingResultStatus] =
    useState(false);

  const [resultStatusMessage, setResultStatusMessage] =
    useState("");

  useEffect(() => {
    setSessionInput(session);
    setTermInput(term);
  }, [session, term]);

  useEffect(() => {
    setSelectedResultStatus(resultStatus);
  }, [resultStatus]);

  // ============================================================
  // CHANGE PASSWORD
  // ============================================================

  const handleChangePassword = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError(
        "New password must be at least 8 characters."
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setError(
        "New passwords do not match."
      );
      return;
    }

    const user =
      auth.currentUser;

    if (!user || !user.email) {
      setError(
        "Session expired. Please log out and back in."
      );
      return;
    }

    setSaving(true);

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

      setSuccess(
        "Password updated successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update password."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // SESSION & TERM
  // ============================================================

  const handleSaveTerm = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setTermMessage("");
    setSavingTerm(true);

    try {
      await updateSchoolSettings(
        sessionInput.trim(),
        termInput,
        profile?.name ||
          profile?.email ||
          "admin"
      );

      setTermMessage(
        "Session/term updated. This applies across the whole portal immediately."
      );
    } catch (err) {
      setTermMessage(
        err instanceof Error
          ? err.message
          : "Could not update session/term."
      );
    } finally {
      setSavingTerm(false);
    }
  };

  // ============================================================
  // RESULT CONTROL
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
          profile?.name ||
            profile?.email ||
            "admin"
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
            "Results are now LOCKED. Teachers can no longer change results. Administrators can still make corrections."
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

  const statusInfo = {
    open: {
      title: "Results Open",
      description:
        "Teachers can upload, edit and delete results.",
      badge:
        "OPEN",
      icon: "🟢",
    },

    locked: {
      title: "Results Locked",
      description:
        "Teachers cannot change results. Administrators can still correct them.",
      badge:
        "LOCKED",
      icon: "🔒",
    },

    published: {
      title: "Results Published",
      description:
        "Students and parents can view their results.",
      badge:
        "PUBLISHED",
      icon: "🟣",
    },
  } as const;

  const activeStatus =
    statusInfo[
      selectedResultStatus
    ];

  return (
    <div className="max-w-2xl space-y-6">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          School Settings
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage your account, academic period and result control.
        </p>
      </div>

      {/* ======================================================
          ACCOUNT
      ====================================================== */}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Account
        </h2>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4 text-sm space-y-1">
          <p>
            <span className="text-gray-500">
              Name:
            </span>{" "}
            {profile?.name || "—"}
          </p>

          <p>
            <span className="text-gray-500">
              Email:
            </span>{" "}
            {profile?.email || "—"}
          </p>

          <p>
            <span className="text-gray-500">
              Role:
            </span>{" "}
            {profile?.role || "—"}
          </p>
        </div>
      </section>

      {/* ======================================================
          PASSWORD
      ====================================================== */}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Change Password
        </h2>

        {error && (
          <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-status-active bg-status-active/10 rounded-lg px-3 py-2">
            {success}
          </p>
        )}

        <form
          onSubmit={handleChangePassword}
          className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-2"
        >
          <TextInput
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) =>
              setCurrentPassword(
                e.target.value
              )
            }
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
            required
          />

          <Button
            type="submit"
            disabled={saving}
            className="mt-2"
          >
            {saving
              ? "Updating..."
              : "Update Password"}
          </Button>
        </form>
      </section>

      {/* ======================================================
          SCHOOL SESSION & TERM
      ====================================================== */}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          School Session &amp; Term
        </h2>

        <p className="text-sm text-gray-500">
          {SCHOOL.name}. Changing this here updates
          the academic period live across the portal.
        </p>

        {termMessage && (
          <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">
            {termMessage}
          </p>
        )}

        <form
          onSubmit={handleSaveTerm}
          className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-2"
        >
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

          <Button
            type="submit"
            disabled={savingTerm}
            className="mt-2"
          >
            {savingTerm
              ? "Saving..."
              : "Save Session & Term"}
          </Button>
        </form>
      </section>

      {/* ======================================================
          RESULT CONTROL CENTRE
      ====================================================== */}

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Result Control Centre
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Control when teachers can edit results and when
            students and parents can see them.
          </p>
        </div>

        {resultStatusMessage && (
          <div className="rounded-lg border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand-dark">
            {resultStatusMessage}
          </div>
        )}

        <form
          onSubmit={handleSaveResultStatus}
          className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-5"
        >
          {/* CURRENT STATUS */}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">
                {activeStatus.icon}
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-gray-800">
                    {activeStatus.title}
                  </h3>

                  <span className="rounded-full bg-white border border-gray-200 px-2.5 py-1 text-[10px] font-bold tracking-wider text-gray-600">
                    {activeStatus.badge}
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-500">
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

          {/* WORKFLOW GUIDE */}

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Recommended workflow
            </p>

            <div className="grid gap-2">
              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-sm font-bold text-gray-700">
                  1. Open
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Teachers enter and correct their students&apos;
                  results.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-sm font-bold text-gray-700">
                  2. Lock
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Teachers are stopped from making further
                  changes. Admin can still correct mistakes.
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 p-3">
                <p className="text-sm font-bold text-gray-700">
                  3. Publish
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Students and parents can now view their
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
    </div>
  );
}