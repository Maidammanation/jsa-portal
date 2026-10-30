
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  TextInput,
  SelectInput,
} from "@/components/Forms";

import { Button } from "@/components/Buttons";

import {
  getById,
  updateStudent,
  getClasses,
} from "@/services/database";

import type {
  ClassRoom,
  Student,
} from "@/lib/types";

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
    attendsArabic: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadStudent() {
      try {
        setLoading(true);
        setError("");

        const [student, classList] = await Promise.all([
          getById("students", params.id),
          getClasses(),
        ]);

        if (!mounted) return;

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

          // Missing Arabic values default to YES.
          // Only an explicitly saved false means NO.
          attendsArabic: s.attendsArabic !== false,
        });
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load student."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadStudent();

    return () => {
      mounted = false;
    };
  }, [params.id]);

  function handleChange(
    field: string
  ) {
    return (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement
      >
    ) => {
      setForm((previous) => ({
        ...previous,
        [field]: event.target.value,
      }));
    };
  }

  function handleArabicChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    setForm((previous) => ({
      ...previous,
      attendsArabic: event.target.value === "yes",
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSaving(true);

    try {
      const selectedClass = classes.find(
        (item) => item.id === form.classId
      );

      await updateStudent(params.id, {
        ...form,
        className: selectedClass?.name || "",
      });

      router.push("/admin/students");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update student."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-8">
        <p className="text-sm text-gray-400">
          Loading student information...
        </p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-700">
          Student record not found.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Edit Student
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Update student information and academic section.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-card border border-gray-100 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            options={classes.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
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
              { label: "Active", value: "active" },
              { label: "Suspended", value: "suspended" },
              { label: "Disabled", value: "disabled" },
            ]}
          />

          <SelectInput
            label="Arabic Section"
            value={form.attendsArabic ? "yes" : "no"}
            onChange={handleArabicChange}
            options={[
              {
                label: "Yes — Attends Arabic",
                value: "yes",
              },
              {
                label: "No — Does not attend Arabic",
                value: "no",
              },
            ]}
          />
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Arabic Section Status
          </p>

          <p className="mt-1 text-sm text-amber-800">
            {form.attendsArabic
              ? "This student is included in the Arabic section and can receive Arabic subjects and Arabic results."
              : "This student is excluded from Arabic subjects and Arabic results."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving Changes..." : "Save Changes"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/students")}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}