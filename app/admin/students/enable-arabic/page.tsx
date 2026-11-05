"use client";

import { useState } from "react";
import Link from "next/link";

export default function EnableArabicPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [updated, setUpdated] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  async function enableArabicForAll() {
    const confirmed = window.confirm(
      "This will enable Arabic Section for every student record in JSA. Students who do not attend Arabic can be switched off individually later. Only the attendsArabic field will change; names, classes, results, attendance and other records will be preserved. Continue?"
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");
    setUpdated(null);
    setTotal(null);

    try {
      const response = await fetch("/api/admin/students/enable-arabic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not enable Arabic for students.");
      }

      setUpdated(Number(data.updated || 0));
      setTotal(Number(data.totalStudents || 0));
      setMessage(data.message || "Arabic section has been enabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The update failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/admin/students" className="text-sm font-medium text-brand underline">
          ← Back to Students
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          Arabic Section Management
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Enable Arabic for all existing JSA students in one operation.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-amber-200 bg-white p-5 shadow-sm">
        <div className="rounded-lg bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">Enable Arabic for All Students</h2>
          <p className="mt-2 text-sm text-amber-800">
            This sets Arabic Section to Yes for every student record, including older records that were never saved with an Arabic setting.
            It changes only the Arabic attendance flag. It does not change student names, admission numbers, classes, results, attendance, parent links or login accounts.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="font-semibold text-green-800">{message}</p>
            <p className="mt-1 text-sm text-green-800">
              Updated: {updated} · Total students: {total}
            </p>
            <p className="mt-2 text-sm text-green-800">
              You can now open an individual student's Edit page and select No for anyone who does not attend Arabic.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={enableArabicForAll}
          disabled={saving}
          className="w-full rounded-lg bg-amber-600 px-5 py-3 font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Updating student records..." : "Enable Arabic for All Students"}
        </button>

        <p className="text-xs text-gray-500">
          This action is restricted by the server to active Admin and Super Admin accounts.
        </p>
      </section>
    </main>
  );
}
