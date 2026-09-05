"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TextInput, SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { create, getClasses, getSubjects } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { ClassRoom, Subject } from "@/lib/types";

export default function NewTeacherPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [formMasterClassId, setFormMasterClassId] = useState("");

  useEffect(() => {
    let mounted = true;

    Promise.all([getClasses(), getSubjects()])
      .then(([classList, subjectList]) => {
        if (!mounted) return;

        setClasses(classList as ClassRoom[]);
        setSubjects(subjectList as Subject[]);
      })
      .catch((err) => {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load classes and subjects."
        );
      })
      .finally(() => {
        if (mounted) {
          setLoadingOptions(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleChange =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const selectAllSubjects = () => {
    setSelectedSubjects(subjects.map((subject) => subject.id));
  };

  const clearAllSubjects = () => {
    setSelectedSubjects([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim().toLowerCase();

    if (!firstName || !lastName || !email) {
      setError("Please fill in the first name, last name and email.");
      return;
    }

    if (selectedSubjects.length === 0) {
      setError("Please assign at least one subject to this teacher.");
      return;
    }

    setSaving(true);

    try {
      const selectedSubjectNames = subjects
        .filter((subject) => selectedSubjects.includes(subject.id))
        .map((subject) => subject.name);

      const selectedClass = classes.find(
        (classRoom) => classRoom.id === formMasterClassId
      );

      /*
       * IMPORTANT:
       *
       * The existing teacher dashboard/results pages already use:
       *
       *   subjectIds
       *   classIds
       *   formClassId
       *
       * Therefore we save those exact fields here.
       */

      await create("teachers", {
        firstName,
        lastName,
        email,

        // Subjects this teacher is allowed to teach.
        subjectIds: selectedSubjects,

        // Subject names retained for convenient display/backwards compatibility.
        subjects: selectedSubjectNames,

        // Old single subject field retained for compatibility.
        subject: selectedSubjectNames.join(", "),

        /*
         * The Form Master class is also the teacher's assigned class.
         * Existing teacher pages read classIds.
         */
        classIds: formMasterClassId
          ? [formMasterClassId]
          : [],

        /*
         * Existing teacher dashboard reads formClassId.
         */
        formClassId: formMasterClassId || null,

        /*
         * Keep these fields too for easy administration/display.
         */
        formMasterClassId: formMasterClassId || "",
        formMasterClassName: selectedClass?.name || "",

        status: "active",

        createdBy:
          profile?.name ||
          profile?.email ||
          "admin",
      });

      router.push("/admin/teachers");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save teacher."
      );
    } finally {
      setSaving(false);
    }
  };

  const formMasterOptions = [
    {
      label: "Not a Form Master",
      value: "",
    },
    ...classes.map((classRoom) => ({
      label: classRoom.name,
      value: classRoom.id,
    })),
  ];

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Add Teacher
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Create a teacher, assign one or more subjects, and optionally assign
          the teacher as Form Master of a class.
        </p>
      </div>

      <div className="text-sm text-gray-500 bg-brand/5 rounded-lg px-3 py-3">
        This creates the teacher&apos;s staff record. To allow the teacher to
        log in, you will also need to create their Firebase Auth account and
        matching <code>users</code> profile with{" "}
        <code>role: &quot;teacher&quot;</code>.
      </div>

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-6"
      >
        {/* Teacher Information */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Teacher Information
          </h2>

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

            <div className="sm:col-span-2">
              <TextInput
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                required
              />
            </div>
          </div>
        </section>

        {/* Subject Assignment */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Subject Assignment
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Select all subjects this teacher is allowed to teach.
              </p>
            </div>

            {!loadingOptions && subjects.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllSubjects}
                  className="text-xs text-brand hover:underline"
                >
                  Select all
                </button>

                <button
                  type="button"
                  onClick={clearAllSubjects}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {loadingOptions ? (
            <p className="text-sm text-gray-400">
              Loading subjects...
            </p>
          ) : subjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm text-gray-500">
                No subjects have been created yet.
              </p>

              <p className="text-xs text-gray-400 mt-1">
                Go to Classes &amp; Subjects and add subjects first.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subjects.map((subject) => {
                  const checked = selectedSubjects.includes(subject.id);

                  return (
                    <label
                      key={subject.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
                        checked
                          ? "border-brand bg-brand/5"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSubject(subject.id)}
                        className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                      />

                      <span
                        className={`text-sm ${
                          checked
                            ? "text-gray-800 font-medium"
                            : "text-gray-600"
                        }`}
                      >
                        {subject.name}
                      </span>
                    </label>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                {selectedSubjects.length} subject
                {selectedSubjects.length === 1 ? "" : "s"} selected.
              </p>
            </>
          )}
        </section>

        {/* Form Master */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Form Master Assignment
          </h2>

          <p className="text-xs text-gray-400 mb-3">
            Select the class this teacher is responsible for as Form Master.
          </p>

          {loadingOptions ? (
            <p className="text-sm text-gray-400">
              Loading classes...
            </p>
          ) : classes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm text-gray-500">
                No classes have been created yet.
              </p>

              <p className="text-xs text-gray-400 mt-1">
                Go to Classes &amp; Subjects and create the classes first.
              </p>
            </div>
          ) : (
            <SelectInput
              label="Form Master Class"
              value={formMasterClassId}
              onChange={(e) => setFormMasterClassId(e.target.value)}
              options={formMasterOptions}
            />
          )}
        </section>

        {/* Summary */}
        <section className="rounded-lg bg-gray-50 border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Assignment Summary
          </h2>

          <div className="space-y-1 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">Subjects:</span>{" "}
              {selectedSubjects.length > 0
                ? subjects
                    .filter((subject) =>
                      selectedSubjects.includes(subject.id)
                    )
                    .map((subject) => subject.name)
                    .join(", ")
                : "None selected"}
            </p>

            <p className="text-gray-600">
              <span className="font-medium">Form Master:</span>{" "}
              {formMasterClassId
                ? classes.find(
                    (classRoom) =>
                      classRoom.id === formMasterClassId
                  )?.name || "Selected class"
                : "No"}
            </p>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            disabled={
              saving ||
              loadingOptions ||
              subjects.length === 0 ||
              classes.length === 0
            }
          >
            {saving ? "Saving..." : "Save Teacher"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/admin/teachers")}
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}