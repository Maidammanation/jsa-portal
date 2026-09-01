"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TextInput, SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { createStudent, getClasses, generateAdmissionNumber } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { ClassRoom } from "@/lib/types";

export default function NewStudentPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [saving, setSaving] = useState(false);
  const [generatingAdmissionNo, setGeneratingAdmissionNo] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    admissionNo: "",
    firstName: "",
    lastName: "",
    gender: "male",
    classId: "",
    dateOfBirth: "",
  });

  useEffect(() => {
    getClasses()
      .then((data) => setClasses(data as ClassRoom[]))
      .catch(() => setClasses([]));
  }, []);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleClassChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const classId = e.target.value;
    setForm((prev) => ({ ...prev, classId }));
    if (!classId) return;

    const selectedClass = classes.find((c) => c.id === classId);
    if (!selectedClass) return;

    setGeneratingAdmissionNo(true);
    try {
      const admissionNo = await generateAdmissionNumber(classId, selectedClass.name);
      setForm((prev) => ({ ...prev, admissionNo }));
    } finally {
      setGeneratingAdmissionNo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.admissionNo || !form.firstName || !form.lastName || !form.classId) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const selectedClass = classes.find((c) => c.id === form.classId);
      await createStudent({
        ...form,
        className: selectedClass?.name || "",
        status: "active",
        createdBy: profile?.name || profile?.email || "admin",
      });
      router.push("/admin/students");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save student.");
    } finally {setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Add Student</h1>

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <SelectInput
            label="Class"
            value={form.classId}
            onChange={handleClassChange}
            options={[
              { label: "Select a class", value: "" },
              ...classes.map((c) => ({ label: c.name, value: c.id })),
            ]}
            required
          />
          <TextInput
            label="Admission Number"
            value={generatingAdmissionNo ? "Generating..." : form.admissionNo}
            onChange={handleChange("admissionNo")}
            placeholder="Auto-fills when you pick a class"
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
        </div>

        <div className="flex gap-3 mt-2">
          <Button type="submit" disabled={saving || generatingAdmissionNo}>
            {saving ? "Saving..." : "Save Student"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/students")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}