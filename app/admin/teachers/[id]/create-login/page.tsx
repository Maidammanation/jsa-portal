"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { getById } from "@/services/database";
import { createLoginAccount } from "@/services/authentication";
import { generateTempPassword } from "@/lib/generatePassword";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  authUid?: string;
}

export default function CreateTeacherLoginPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generateTempPassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getById("teachers", params.id).then((data) => {
      const t = data as Teacher | null;
      setTeacher(t);
      if (t?.email) setEmail(t.email);
      setLoading(false);
    });
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!teacher) return;
    setSaving(true);
    try {
      await createLoginAccount({
        email,
        password,
        name: `${teacher.firstName} ${teacher.lastName}`,
        role: "teacher",
        linkCollection: "teachers",
        linkId: teacher.id,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create login account.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;
  if (!teacher) return <p className="text-sm text-status-disabled">Teacher not found.</p>;

  if (teacher.authUid) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">Create Login</h1>
        <p className="text-sm text-gray-600 bg-brand/5 rounded-lg px-3 py-2">
          {teacher.firstName} {teacher.lastName} already has a login account.
        </p>
        <Button variant="ghost" onClick={() => router.push("/admin/teachers")}>
          Back to Teachers
        </Button>
      </div>
    );}

  if (success) {
    return (
      <div className="max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">Create Login</h1>
        <div className="bg-status-active/10 rounded-card p-4 space-y-2">
          <p className="text-sm text-status-active font-medium">Account created successfully.</p>
          <p className="text-sm text-gray-700">Share these credentials with {teacher.firstName}:</p>
          <p className="text-sm font-mono bg-white rounded px-3 py-2 border border-gray-200">
            Email: {email}
            <br />
            Temporary password: {password}
          </p>
          <p className="text-xs text-gray-500">
            They'll be required to set their own password on first login.
          </p>
        </div>
        <Button onClick={() => router.push("/admin/teachers")}>Back to Teachers</Button>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Create Login</h1>
      <p className="text-sm text-gray-500">
        For {teacher.firstName} {teacher.lastName}
      </p>

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-2">
        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextInput
          label="Temporary Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="button"
          onClick={() => setPassword(generateTempPassword())}
          className="text-xs text-brand hover:underline"
        >
          Generate new password
        </button>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Login"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/teachers")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}