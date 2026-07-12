"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { create, update, getStudents } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { Student } from "@/lib/types";

export default function NewParentPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    getStudents()
      .then((data) => setStudents(data as Student[]))
      .catch(() => setStudents([]));
  }, []);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const toggleChild = (studentId: string) => {
    setSelectedChildIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
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
      const parentId = await create("parents", {
        ...form,
        status: "active",
        createdBy: profile?.name || profile?.email || "admin",
      });

      // Link selected students to this parent record. Note: parentUid here is the
      // parent's Firestore document id, not a Firebase Auth uid — the parent won't
      // be able to log in and see this student until you also create a Firebase Auth
      // account + matching `users` profile for them (same as the admin/teacher setup),
      // using that Auth uid as parentUid instead.
      if (selectedChildIds.length > 0) {
        await Promise.all(
          selectedChildIds.map((studentId) =>
            update("students", studentId, {
              parentUid: parentId,
              parentName: `${form.firstName} ${form.lastName}`,
            })
          )
        );
      }

      router.push("/admin/parents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save parent.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Add Parent</h1>

      <p className="text-sm text-gray-500 bg-brand/5 rounded-lg px-3 py-2">
        This creates the parent&apos;s contact record and links any children you select below. To let
        them log in, you&apos;ll also need to create a Firebase Auth account for them and a matching{" "}
        <code>users</code> profile document with <code>role: &quot;parent&quot;</code> — the same
        way your own admin login was set up.
      </p>

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-4">
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
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={handleChange("phone")}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Link Children (optional)</p>
          {students.length === 0 ? (
            <p className="text-sm text-gray-400">No students exist yet — add students first, then come back to link them here.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedChildIds.includes(s.id)}
                    onChange={() => toggleChild(s.id)}
                    className="rounded border-gray-300"
                  />
                  <span>
                    {s.firstName} {s.lastName}{" "}
                    <span className="text-gray-400">({s.className || s.classId})</span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Parent"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/parents")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}