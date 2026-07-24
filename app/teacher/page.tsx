"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { create, getClasses, getSubjects } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { ClassRoom, Subject } from "@/lib/types";

export default function NewTeacherPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [formClassId, setFormClassId] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  useEffect(() => {
    getClasses().then((d) => setClasses(d as ClassRoom[])).catch(() => setClasses([]));
    getSubjects().then((d) => setSubjects(d as Subject[])).catch(() => setSubjects([]));
  }, []);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const toggleClass = (id: string) => {
    setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
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
        classIds: selectedClassIds,
        subjectIds: selectedSubjectIds,
        formClassId: formClassId || null,
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
        This creates the teacher's staff record. Use "Create Login" from the Teachers list
        afterward to give them portal access.
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
            onChange={handleChange("firstName")}required
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
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Subjects Taught</p>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {subjects.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No subjects yet — add them under Classes & Subjects.</p>
            ) : (
              subjects.map((s) => (
                <label key={s.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedSubjectIds.includes(s.id)}
                    onChange={() => toggleSubject(s.id)}
                    className="rounded border-gray-300"
                  />
                  <span>{s.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Classes Assigned</p>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {classes.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No classes yet — add them under Classes & Subjects.</p>
            ) : (
              classes.map((c) => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedClassIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                    className="rounded border-gray-300"
                  />
                  <span>{c.name}</span>
                </label>
              ))
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Form Master Of (optional)
          </label>
          <select
            value={formClassId}
            onChange={(e) => setFormClassId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          >
            <option value="">Not a form master</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Only the form master of a class can take that class's attendance.
          </p>
        </div>

        <div className="flex gap-3">
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