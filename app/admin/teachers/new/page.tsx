"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { create } from "@/services/database";
import { useAuth } from "@/lib/useAuth";

export default function NewTeacherPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.firstName || !form.lastName || !form.email) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await create("teachers", {
        ...form,
        status: "active",
        createdBy: profile?.name || profile?.email || "admin",
      });
      router.push("/admin/teachers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save teacher.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Add Teacher</h1>

      <p className="text-sm text-gray-500 bg-brand/5 rounded-lg px-3 py-2">
        This creates the teacher's staff record. To let them log in, you'll also need to create a
        Firebase Auth account for them and a matching <code>users</code> profile document with{" "}
        <code>role: &quot;teacher&quot;</code> — the same way your own admin login was set up.
      </p>

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <TextInput
            label="First Name"
            value={form.firstName}
            onChange={handleChange("firstName")}
            required
          />
          <TextInput
            label="Last Name"
            value={form.lastName}
            onChange={handleChange("lastName")}
            required
          />
          <TextInput
            label="Email"
            type="email"
            value={form.email}
            onChange={handleChange("email")}
            required
          />
          <TextInput
            label="Subject Specialty"
            placeholder="e.g. Mathematics"
            value={form.subject}
            onChange={handleChange("subject")}
          />
        </div>

        <div className="flex gap-3 mt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Teacher"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/teachers")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
                                           }
