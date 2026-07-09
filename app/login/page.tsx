"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { login, changePassword } from "@/services/authentication";
import { auth } from "@/services/firebase";
import { ROLE_HOME, SCHOOL } from "@/settings/config";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const profile = await login(email, password);

      if (profile.mustChangePassword) {
        // Block dashboard access until the temporary password is changed.
        setMustChangePassword(true);
        setLoading(false);
        return;
      }

      router.push(ROLE_HOME[profile.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!auth.currentUser) throw new Error("Session expired. Please log in again.");
      await changePassword(auth.currentUser, newPassword);
      // Re-fetch profile to know where to route the user now that they're unblocked.
      const profile = await login(email, newPassword);
      router.push(ROLE_HOME[profile.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-card shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 relative mb-3">
            <Image src={SCHOOL.logoPath} alt={`${SCHOOL.name} logo`} fill className="object-contain" />
          </div>
          <h1 className="font-semibold text-lg text-brand-dark">{SCHOOL.name}</h1>
          <p className="text-xs text-gray-500">Portal Login</p>
        </div>

        {error && (
          <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {!mustChangePassword ? (
          <form onSubmit={handleLogin}>
            <TextInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextInput
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePasswordChange}>
            <p className="text-sm text-gray-600 mb-4">
              This is your first login. Please set a new password to continue.
            </p>
            <TextInput
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? "Updating..." : "Set New Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
