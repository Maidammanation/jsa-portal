"use client";

import { useEffect, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { TextInput, SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { auth } from "@/services/firebase";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";
import { updateSchoolSettings } from "@/services/database";
import { SCHOOL } from "@/settings/config";

export default function SettingsPage() {
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sessionInput, setSessionInput] = useState(session);
  const [termInput, setTermInput] = useState(term);
  const [savingTerm, setSavingTerm] = useState(false);
  const [termMessage, setTermMessage] = useState("");

  useEffect(() => {
    setSessionInput(session);
    setTermInput(term);
  }, [session, term]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      setError("Session expired. Please log out and back in.");
      return;
    }

    setSaving(true);
    try {
      // Firebase requires a recent login before allowing a password change,
      // so we re-verify the current password first.
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    setTermMessage("");
    setSavingTerm(true);
    try {
      await updateSchoolSettings(sessionInput, termInput, profile?.name || profile?.email || "admin");
      setTermMessage("Session/term updated. This applies across the whole portal immediately.");
    } catch (err) {
      setTermMessage(err instanceof Error ? err.message : "Could not update session/term.");
    } finally {
      setSavingTerm(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Settings</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Account</h2>
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-4 text-sm space-y-1">
          <p><span className="text-gray-500">Name:</span> {profile?.name || "—"}</p>
          <p><span className="text-gray-500">Email:</span> {profile?.email || "—"}</p>
          <p><span className="text-gray-500">Role:</span> {profile?.role || "—"}</p>
        </div></section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Change Password</h2>

        {error && (
          <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-sm text-status-active bg-status-active/10 rounded-lg px-3 py-2">{success}</p>
        )}

        <form onSubmit={handleChangePassword} className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-2">
          <TextInput
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <TextInput
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
          <TextInput
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
          <Button type="submit" disabled={saving} className="mt-2">
            {saving ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">School Session &amp; Term</h2>
        <p className="text-sm text-gray-500">
          {SCHOOL.name}. Changing this here updates it live across the whole portal — no
          redeploy needed. Do this at the start of each new term.
        </p>

        {termMessage && (
          <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">{termMessage}</p>
        )}

        <form onSubmit={handleSaveTerm} className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-2">
          <TextInput
            label="Current Session"
            placeholder="e.g. 2025/2026"
            value={sessionInput}
            onChange={(e) => setSessionInput(e.target.value)}
            required
          />
          <SelectInput
            label="Current Term"
            value={termInput}
            onChange={(e) => setTermInput(e.target.value)}
            options={[
              { label: "First Term", value: "First Term" },
              { label: "Second Term", value: "Second Term" },
              { label: "Third Term", value: "Third Term" },
            ]}
          />
          <Button type="submit" disabled={savingTerm} className="mt-2">
            {savingTerm ? "Saving..." : "Save Session & Term"}
          </Button>
        </form>
      </section>
    </div>
  );
}