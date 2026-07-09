"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TextInput, SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { getById, updateStudent, getClasses } from "@/services/database";
import type { ClassRoom, Student } from "@/lib/types";
import type { AccountStatus } from "@/settings/config";

export default function EditStudentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState({
    admissionNo: "",
    firstName: "",
    lastName: "",
    gender: "male",
    classId: "",
    dateOfBirth: "",
    status: "active" as AccountStatus,
  });

  useEffect(() => {
    Promise.all([getById("students", params.id), getClasses()])
      .then(([student, classList]) => {
        setClasses(classList as ClassRoom[]);
        if (!student) {
          setNotFound(true);
          return;
        }
        const s = student as Student;
        setForm({
          admissionNo: s.admissionNo || "",
          firstName: s.firstName || "",
          lastName: s.lastName || "",
          gender: s.gender || "male",
          classId: s.classId || "",
          dateOfBirth: s.dateOfBirth || "",
          status: s.status || "active",
        });
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await updateStudent(params.id, form);
      router.push("/admin/students");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update student.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;
  if (notFound) return <p className="text-sm text-status-disabled">Student not found.</p>;

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Edit Student</h1>

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <TextInput
            label="Admission Number"
            value={form.admissionNo}
            onChange={handleChange("admissionNo")}
            required
          />
          <SelectInput
            label="Class"
            value={form.classId}
            onChange={handleChange("classId")}
            options={classes.map((c) => ({ label: c.name, value: c.id }))}
            required
          />
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
          <SelectInput
            label="Gender"
            value={form.gender}
            onChange={handleChange("gender")}
            options={[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
            ]}
          />
          <TextInput
            label="Date of Birth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange("dateOfBirth")}
          />
          <SelectInput
            label="Account Status"
            value={form.status}
            onChange={handleChange("status")}
            options={[
              { label: "🟢 Active", value: "active" },
              { label: "🟡 Suspended", value: "suspended" },
              { label: "🔴 Disabled", value: "disabled" },
            ]}
          />
        </div>

        <div className="flex gap-3 mt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/students")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
