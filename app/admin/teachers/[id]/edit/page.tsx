"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TextInput, SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getById,
  getClasses,
  getSubjects,
  update,
  getAll,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { ClassRoom, Subject } from "@/lib/types";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;

  subjectIds?: string[];
  subjects?: string[];
  subject?: string;

  classIds?: string[];

  formClassId?: string | null;

  formMasterClassId?: string | null;
  formMasterClassName?: string;

  status?: "active" | "suspended" | "disabled";

  authUid?: string;
}

export default function EditTeacherPage() {
  const router = useRouter();
  const params = useParams();

  const { profile } = useAuth();

  const teacherId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const [teacher, setTeacher] =
    useState<Teacher | null>(null);

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [selectedSubjects, setSelectedSubjects] =
    useState<string[]>([]);

  const [formMasterClassId, setFormMasterClassId] =
    useState("");

  const [status, setStatus] =
    useState<"active" | "suspended" | "disabled">(
      "active"
    );

  /*
   * Load teacher, classes and subjects.
   */
  useEffect(() => {
    if (!teacherId) {
      setError("Teacher ID is missing.");
      setLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          teacherData,
          classData,
          subjectData,
        ] = await Promise.all([
          getById("teachers", teacherId),
          getClasses(),
          getSubjects(),
        ]);

        if (!mounted) return;

        if (!teacherData) {
          setError("Teacher record was not found.");
          return;
        }

        const teacherRecord =
          teacherData as Teacher;

        setTeacher(teacherRecord);

        setForm({
          firstName:
            teacherRecord.firstName || "",
          lastName:
            teacherRecord.lastName || "",
          email:
            teacherRecord.email || "",
        });

        /*
         * Prefer the new subjectIds field.
         *
         * Fall back to subjects[] or the old
         * comma-separated subject field.
         */
        let subjectIds =
          teacherRecord.subjectIds || [];

        const loadedSubjects =
          subjectData as Subject[];

        if (
          subjectIds.length === 0 &&
          teacherRecord.subjects &&
          teacherRecord.subjects.length > 0
        ) {
          subjectIds = loadedSubjects
            .filter((subject) =>
              teacherRecord.subjects?.includes(
                subject.name
              )
            )
            .map((subject) => subject.id);
        }

        if (
          subjectIds.length === 0 &&
          teacherRecord.subject
        ) {
          const oldSubjectNames =
            teacherRecord.subject
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);

          subjectIds = loadedSubjects
            .filter((subject) =>
              oldSubjectNames.includes(
                subject.name
              )
            )
            .map((subject) => subject.id);
        }

        setSelectedSubjects(subjectIds);

        /*
         * Prefer formClassId.
         * Fall back to formMasterClassId.
         */
        const existingFormClassId =
          teacherRecord.formClassId ||
          teacherRecord.formMasterClassId ||
          "";

        setFormMasterClassId(
          existingFormClassId
        );

        setStatus(
          teacherRecord.status || "active"
        );

        setClasses(
          classData as ClassRoom[]
        );

        setSubjects(
          loadedSubjects
        );
      } catch (err) {
        if (!mounted) return;

        console.error(
          "Could not load teacher:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Could not load teacher information."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [teacherId]);

  /*
   * Update text fields.
   */
  const handleChange =
    (field: keyof typeof form) =>
    (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      setForm((previous) => ({
        ...previous,
        [field]: e.target.value,
      }));
    };

  /*
   * Toggle subject assignment.
   */
  const toggleSubject = (
    subjectId: string
  ) => {
    setSelectedSubjects((previous) =>
      previous.includes(subjectId)
        ? previous.filter(
            (id) => id !== subjectId
          )
        : [...previous, subjectId]
    );
  };

  /*
   * Select every available subject.
   */
  const selectAllSubjects = () => {
    setSelectedSubjects(
      subjects.map(
        (subject) => subject.id
      )
    );
  };

  /*
   * Remove all subject assignments.
   */
  const clearAllSubjects = () => {
    setSelectedSubjects([]);
  };

  /*
   * Save teacher changes.
   */
  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");

    if (!teacherId) {
      setError("Teacher ID is missing.");
      return;
    }

    const firstName =
      form.firstName.trim();

    const lastName =
      form.lastName.trim();

    const email =
      form.email.trim().toLowerCase();

    if (
      !firstName ||
      !lastName ||
      !email
    ) {
      setError(
        "Please fill in the first name, last name and email."
      );
      return;
    }

    if (
      selectedSubjects.length === 0
    ) {
      setError(
        "Please assign at least one subject to this teacher."
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * Convert selected subject IDs
       * into subject names.
       */
      const selectedSubjectNames =
        subjects
          .filter((subject) =>
            selectedSubjects.includes(
              subject.id
            )
          )
          .map(
            (subject) => subject.name
          );

      /*
       * Find the selected Form Master class.
       */
      const selectedClass =
        classes.find(
          (classRoom) =>
            classRoom.id ===
            formMasterClassId
        );

      /*
       * IMPORTANT:
       *
       * Keep the existing teacher schema:
       *
       * subjectIds
       * subjects
       * subject
       * classIds
       * formClassId
       * formMasterClassId
       * formMasterClassName
       */
      await update(
        "teachers",
        teacherId,
        {
          firstName,
          lastName,
          email,

          /*
           * Multiple subjects.
           */
          subjectIds:
            selectedSubjects,

          /*
           * Subject names for display/
           * backwards compatibility.
           */
          subjects:
            selectedSubjectNames,

          /*
           * Legacy single-string field.
           */
          subject:
            selectedSubjectNames.join(
              ", "
            ),

          /*
           * The Form Master class is
           * the teacher's assigned class.
           */
          classIds:
            formMasterClassId
              ? [formMasterClassId]
              : [],

          /*
           * Main field used by the
           * teacher dashboard.
           */
          formClassId:
            formMasterClassId || null,

          /*
           * Compatibility fields.
           */
          formMasterClassId:
            formMasterClassId || "",

          formMasterClassName:
            selectedClass?.name || "",

          status,

          updatedBy:
            profile?.name ||
            profile?.email ||
            "admin",

          updatedAt:
            new Date(),
        }
      );

      router.push(
        "/admin/teachers"
      );
    } catch (err) {
      console.error(
        "Could not update teacher:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not update teacher. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Form Master options.
   */
  const formMasterOptions = [
    {
      label:
        "Not a Form Master",
      value: "",
    },

    ...classes.map(
      (classRoom) => ({
        label: classRoom.name,
        value: classRoom.id,
      })
    ),
  ];

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Edit Teacher
        </h1>

        <p className="text-sm text-gray-400">
          Loading teacher information...
        </p>
      </div>
    );
  }

  /*
   * Teacher not found.
   */
  if (!teacher) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Edit Teacher
        </h1>

        <div className="rounded-lg bg-status-disabled/10 px-4 py-3">
          <p className="text-sm text-status-disabled">
            {error ||
              "Teacher record was not found."}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            router.push(
              "/admin/teachers"
            )
          }
        >
          Back to Teachers
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Page heading */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Edit Teacher
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Update teacher information,
          subjects and Form Master
          assignment.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-status-disabled/10 px-4 py-3">
          <p className="text-sm text-status-disabled">
            {error}
          </p>
        </div>
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

            <div className="sm:col-span-2">
              <TextInput
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange(
                  "email"
                )}
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
                Select all subjects this
                teacher is allowed to
                teach.
              </p>
            </div>

            {subjects.length > 0 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={
                    selectAllSubjects
                  }
                  className="text-xs text-brand hover:underline"
                >
                  Select all
                </button>

                <button
                  type="button"
                  onClick={
                    clearAllSubjects
                  }
                  className="text-xs text-gray-500 hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {subjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm text-gray-500">
                No subjects have been
                created yet.
              </p>

              <p className="text-xs text-gray-400 mt-1">
                Go to Classes &amp;
                Subjects and add subjects
                first.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {subjects.map(
                  (subject) => {
                    const checked =
                      selectedSubjects.includes(
                        subject.id
                      );

                    return (
                      <label
                        key={
                          subject.id
                        }
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
                          checked
                            ? "border-brand bg-brand/5"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={
                            checked
                          }
                          onChange={() =>
                            toggleSubject(
                              subject.id
                            )
                          }
                          className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand"
                        />

                        <span
                          className={`text-sm ${
                            checked
                              ? "text-gray-800 font-medium"
                              : "text-gray-600"
                          }`}
                        >
                          {
                            subject.name
                          }
                        </span>
                      </label>
                    );
                  }
                )}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                {
                  selectedSubjects.length
                }{" "}
                subject
                {selectedSubjects.length ===
                1
                  ? ""
                  : "s"}{" "}
                selected.
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
            Select the class this
            teacher is responsible for
            as Form Master.
          </p>

          {classes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm text-gray-500">
                No classes have been
                created yet.
              </p>

              <p className="text-xs text-gray-400 mt-1">
                Go to Classes &amp;
                Subjects and create the
                classes first.
              </p>
            </div>
          ) : (
            <SelectInput
              label="Form Master Class"
              value={
                formMasterClassId
              }
              onChange={(e) =>
                setFormMasterClassId(
                  e.target.value
                )
              }
              options={
                formMasterOptions
              }
            />
          )}
        </section>

        {/* Status */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Account Status
          </h2>

          <p className="text-xs text-gray-400 mb-3">
            Change the current status
            of this teacher record.
          </p>

          <SelectInput
            label="Status"
            value={status}
            onChange={(e) =>
              setStatus(
                e.target.value as
                  | "active"
                  | "suspended"
                  | "disabled"
              )
            }
            options={[
              {
                label: "Active",
                value: "active",
              },
              {
                label: "Suspended",
                value: "suspended",
              },
              {
                label: "Disabled",
                value: "disabled",
              },
            ]}
          />
        </section>

        {/* Assignment Summary */}
        <section className="rounded-lg bg-gray-50 border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Assignment Summary
          </h2>

          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">
                Teacher:
              </span>{" "}
              {form.firstName}{" "}
              {form.lastName}
            </p>

            <p className="text-gray-600">
              <span className="font-medium">
                Subjects:
              </span>{" "}
              {selectedSubjects.length >
              0
                ? subjects
                    .filter(
                      (subject) =>
                        selectedSubjects.includes(
                          subject.id
                        )
                    )
                    .map(
                      (subject) =>
                        subject.name
                    )
                    .join(", ")
                : "None selected"}
            </p>

            <p className="text-gray-600">
              <span className="font-medium">
                Form Master:
              </span>{" "}
              {formMasterClassId
                ? classes.find(
                    (classRoom) =>
                      classRoom.id ===
                      formMasterClassId
                  )?.name ||
                  "Selected class"
                : "No"}
            </p>

            <p className="text-gray-600">
              <span className="font-medium">
                Status:
              </span>{" "}
              {status}
            </p>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            type="submit"
            disabled={
              saving ||
              subjects.length === 0 ||
              classes.length === 0
            }
          >
            {saving
              ? "Saving Changes..."
              : "Save Changes"}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              router.push(
                "/admin/teachers"
              )
            }
            disabled={saving}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}