"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { sendPasswordReset } from "@/services/authentication";
import { SCHOOL } from "@/settings/config";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      await sendPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not send password reset email. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-card shadow-sm border border-gray-100 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 relative mb-3">
            <Image
              src={SCHOOL.logoPath}
              alt={`${SCHOOL.name} logo`}
              fill
              className="object-contain"
            />
          </div>

          <h1 className="font-semibold text-lg text-brand-dark">
            {SCHOOL.name}
          </h1>

          <p className="text-xs text-gray-500">
            Reset Your Password
          </p>
        </div>

        {success ? (
          <div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-5">
              <p className="text-sm text-green-700">
                If an account exists for this email address, a
                password reset link has been sent.
              </p>

              <p className="text-xs text-green-600 mt-2">
                Please check your inbox and spam/junk folder.
              </p>
            </div>

            <Link
              href="/login"
              className="block text-center w-full rounded-lg bg-brand-dark text-white py-2.5 text-sm font-medium hover:opacity-90 transition"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2 mb-4">
                {error}
              </p>
            )}

            <p className="text-sm text-gray-600 mb-5">
              Enter the email address connected to your JSA Portal
              account and we will send you a password reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <TextInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2"
              >
                {loading
                  ? "Sending..."
                  : "Send Reset Link"}
              </Button>
            </form>

            <div className="text-center mt-5">
              <Link
                href="/login"
                className="text-sm text-brand-dark hover:underline"
              >
                ← Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}