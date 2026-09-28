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
  const params =
    useParams<{ id: string }>();

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notFound, setNotFound] =
    useState(false);

  const [form, setForm] =
    useState({
      admissionNo: "",
      firstName: "",
      lastName: "",
      gender: "male",
      classId: "",
      dateOfBirth: "",
      status:
        "active" as AccountStatus,
      attendsArabic: false,
    });

  useEffect(() => {
    Promise.all([
      getById(
        "students",
        params.id
      ),
      getClasses(),
    ])
      .then(
        ([
          student,
          classList,
        ]) => {
          setClasses(
            classList as ClassRoom[]
          );

          if (!student) {
            setNotFound(true);
            return;
          }

          const s =
            student as Student;

          setForm({
            admissionNo:
              s.admissionNo || "",
            firstName:
              s.firstName || "",
            lastName:
              s.lastName || "",
            gender:
              s.gender || "male",
            classId:
              s.classId || "",
            dateOfBirth:
              s.dateOfBirth || "",
            status:
              s.status || "active",
            attendsArabic:
              s.attendsArabic === true,
          });
        }
      )
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load student."
        );
      })
      .finally(() =>
        setLoading(false)
      );
  }, [params.id]);

  const handleChange =
    (field: string) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement |
          HTMLSelectElement
      >
    ) => {
      setForm((previous) => ({
        ...previous,
        [field]:
          event.target.value,
      }));
    };

  const handleArabicChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setForm((previous) => ({
      ...previous,
      attendsArabic:
        event.target.value ===
        "yes",
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError("");
    setSaving(true);

    try {
      const selectedClass =
        classes.find(
          (item) =>
            item.id ===
            form.classId
        );

      await updateStudent(
        params.id,
        {
          ...form,
          className:
            selectedClass?.name ||
            "",
        }
      );

      router.push(
        "/admin/students"
      );
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
  };

  if (loading) {
    return (
      <p className="text-sm text-gray-400">
        Loading...
      </p>
    );
  }

  if (notFound) {
    return (
      <p className="text-sm text-status-disabled">
        Student not found.
      </p>
    );
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">
        Edit Student
      </h1>

      {error && (
        <p className="rounded-lg bg-status-disabled/10 px-3 py-2 text-sm text-status-disabled">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-card border border-gray-100 bg-white p-6 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <TextInput
            label="Admission Number"
            value={form.admissionNo}
            onChange={handleChange(
              "admissionNo"
            )}
            required
          />

          <SelectInput
            label="Class"
            value={form.classId}
            onChange={handleChange(
              "classId"
            )}
            options={classes.map(
              (item) => ({
                label:
                  item.name,
                value:
                  item.id,
              })
            )}
            required
          />

          <TextInput
            label="First Name"
            value={form.firstName}
            onChange={handleChange(
              "firstName"
            )}
            required
          />

          <TextInput
            label="Last Name"
            value={form.lastName}
            onChange={handleChange(
              "lastName"
            )}
            required
          />

          <SelectInput
            label="Gender"
            value={form.gender}
            onChange={handleChange(
              "gender"
            )}
            options={[
              {
                label: "Male",
                value: "male",
              },
              {
                label: "Female",
                value: "female",
              },
            ]}
          />

          <TextInput
            label="Date of Birth"
            type="date"
            value={
              form.dateOfBirth
            }
            onChange={handleChange(
              "dateOfBirth"
            )}
          />

          <SelectInput
            label="Account Status"
            value={form.status}
            onChange={handleChange(
              "status"
            )}
            options={[
              {
                label:
                  "🟢 Active",
                value: "active",
              },
              {
                label:
                  "🟡 Suspended",
                value:
                  "suspended",
              },
              {
                label:
                  "🔴 Disabled",
                value:
                  "disabled",
              },
            ]}
          />

          <SelectInput
            label="Arabic Section"
            value={
              form.attendsArabic
                ? "yes"
                : "no"
            }
            onChange={
              handleArabicChange
            }
            options={[
              {
                label:
                  "No — Does not attend Arabic",
                value: "no",
              },
              {
                label:
                  "Yes — Attends Arabic",
                value: "yes",
              },
            ]}
          />
        </div>

        <div className="mt-3 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            Arabic Section
          </p>

          <p className="mt-1 text-sm text-gray-700">
            {form.attendsArabic
              ? "This student will receive Arabic subjects and an Arabic section on the report card."
              : "This student will not receive Arabic subjects or the Arabic section on the report card."}
          </p>
        </div>

        <div className="mt-4 flex gap-3">
          <Button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Save Changes"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              router.push(
                "/admin/students"
              )
            }
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}