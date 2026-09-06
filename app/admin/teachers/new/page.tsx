"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TextInput, SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  create,
  getAll,
  getClasses,
  getSubjects,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { ClassRoom, SchoolLevel, Subject } from "@/lib/types";

interface TeacherRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  formClassId?: string | null;
  formMasterClassId?: string | null;
}

function getClassLevel(level?: string, name?: string): SchoolLevel | "" {
  const value = `${level || ""} ${name || ""}`.toLowerCase();

  if (value.includes("nursery")) return "nursery";
  if (value.includes("primary")) return "primary";

  if (value.includes("jss") || value.includes("junior")) {
    return "jss";
  }

  if (value.includes("ss ") || value.startsWith("ss")) {
    return "ss";
  }

  if (value.includes("senior")) return "ss";

  return "";
}

export default function NewTeacherPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);

  const [saving, setSaving] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [formMasterClassId, setFormMasterClassId] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setError("");

        const [classList, subjectList, teacherList] = await Promise.all([
          getClasses(),
          getSubjects(),
          getAll("teachers"),
        ]);

        if (!mounted) return;

        setClasses(classList || []);
        setSubjects(subjectList || []);
        setTeachers((teacherList || []) as TeacherRecord[]);
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError("Unable to load classes and subjects.");
        }
      } finally {
        if (mounted) {
          setLoadingOptions(false);
        }
      }
    }

    loadOptions();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedLevels = useMemo(() => {
    const levels = new Set<SchoolLevel>();

    selectedClasses.forEach((classId) => {
      const classroom = classes.find((item) => item.id === classId);

      if (!classroom) return;

      const level = getClassLevel(
        classroom.level,
        classroom.name
      );

      if (level) {
        levels.add(level);
      }
    });

    return Array.from(levels);
  }, [classes, selectedClasses]);

  /**
   * Subjects now come directly from the curriculum configured
   * in Admin > Classes & Subjects.
   *
   * If level-aware subjects exist, only subjects assigned to the
   * selected class levels are shown.
   *
   * The legacy fallback is only used when the entire subject
   * collection predates the `levels` field.
   */
  const availableSubjects = useMemo(() => {
    if (selectedLevels.length === 0) {
      return [];
    }

    const selectedLevelSet = new Set(selectedLevels);

    const hasLevelAwareSubjects = subjects.some((subject) =>
      Array.isArray(subject.levels)
    );

    if (hasLevelAwareSubjects) {
      return subjects
        .filter(
          (subject) =>
            Array.isArray(subject.levels) &&
            subject.levels.some((level) =>
              selectedLevelSet.has(level)
            )
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Legacy fallback for older Firestore subject records.
     * Music is intentionally excluded.
     */
    const legacyByLevel: Record<SchoolLevel, string[]> = {
      nursery: [
        "English Language",
        "Mathematics",
        "Basic Science",
        "Social Studies",
        "Civic Education",
        "Physical and Health Education",
        "Computer Studies / ICT",
        "Islamic Religious Studies",
        "Christian Religious Studies",
        "Cultural and Creative Arts (CCA)",
        "Hausa Language",
      ],

      primary: [
        "English Language",
        "Mathematics",
        "Basic Science",
        "Basic Science and Technology",
        "Basic Technology",
        "Agricultural Science",
        "Nigerian History",
        "Social and Citizenship Studies",
        "Home Economics",
        "French",
        "Arabic Language",
        "Islamic Religious Studies",
        "Christian Religious Studies",
        "Physical and Health Education",
        "Computer Studies / ICT",
        "Cultural and Creative Arts (CCA)",
        "Hausa Language",
      ],

      jss: [
        "English Language",
        "Mathematics",
        "Basic Science",
        "Basic Technology",
        "Agricultural Science",
        "Social Studies",
        "Civic Education",
        "Christian Religious Studies",
        "Islamic Religious Studies",
        "Physical and Health Education",
        "Computer Studies / ICT",
        "French",
        "Home Economics",
        "Business Studies",
        "Security Education",
        "Literature in English",
        "Geography",
        "Cultural and Creative Arts (CCA)",
        "Hausa Language",
        "Arabic Language",
      ],

      ss: [
        "English Language",
        "Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "Further Mathematics",
        "Economics",
        "Government",
        "Literature in English",
        "Geography",
        "Financial Accounting",
        "Commerce",
        "Agricultural Science",
        "Christian Religious Studies",
        "Islamic Religious Studies",
        "Computer Studies / ICT",
        "French",
        "Physical and Health Education",
        "Visual Arts",
        "Technical Drawing",
        "Foods and Nutrition",
        "Citizenship and Heritage Studies",
        "Digital Technologies",
        "Cultural and Creative Arts (CCA)",
        "Hausa Language",
        "Arabic Language",
      ],
    };

    const allowed = new Set(
      selectedLevels
        .flatMap((level) => legacyByLevel[level])
        .map((name) => name.trim().toLowerCase())
    );

    return subjects
      .filter((subject) =>
        allowed.has(subject.name.trim().toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [subjects, selectedLevels]);

  useEffect(() => {
    const availableIds = new Set(
      availableSubjects.map((subject) => subject.id)
    );

    setSelectedSubjects((current) =>
      current.filter((id) => availableIds.has(id))
    );
  }, [availableSubjects]);

  const unavailableFormMasterClassIds = useMemo(() => {
    const ids = new Set<string>();

    teachers.forEach((teacher) => {
      const assignedId =
        teacher.formMasterClassId ||
        teacher.formClassId ||
        "";

      if (assignedId) {
        ids.add(assignedId);
      }
    });

    return ids;
  }, [teachers]);

  const availableFormMasterClasses = useMemo(() => {
    return classes.filter((classroom) => {
      if (selectedClasses.includes(classroom.id)) {
        return true;
      }

      return !unavailableFormMasterClassIds.has(classroom.id);
    });
  }, [
    classes,
    selectedClasses,
    unavailableFormMasterClassIds,
  ]);

  const selectedClassNames = useMemo(() => {
    return selectedClasses
      .map(
        (id) => classes.find((classroom) => classroom.id === id)?.name
      )
      .filter(Boolean) as string[];
  }, [classes, selectedClasses]);

  const selectedSubjectNames = useMemo(() => {
    return selectedSubjects
      .map(
        (id) => subjects.find((subject) => subject.id === id)?.name
      )
      .filter(Boolean) as string[];
  }, [subjects, selectedSubjects]);

  const selectedFormMasterClass = useMemo(() => {
    return classes.find(
      (classroom) => classroom.id === formMasterClassId
    );
  }, [classes, formMasterClassId]);

  function toggleClass(classId: string) {
    setSelectedClasses((current) => {
      const exists = current.includes(classId);

      if (exists) {
        if (formMasterClassId === classId) {
          setFormMasterClassId("");
        }

        return current.filter((id) => id !== classId);
      }

      return [...current, classId];
    });
  }

  function toggleSubject(subjectId: string) {
    setSelectedSubjects((current) => {
      if (current.includes(subjectId)) {
        return current.filter((id) => id !== subjectId);
      }

      return [...current, subjectId];
    });
  }

  function selectAllSubjects() {
    setSelectedSubjects(
      availableSubjects.map((subject) => subject.id)
    );
  }

  function clearSubjects() {
    setSelectedSubjects([]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim().toLowerCase();

    if (!firstName) {
      setError("Please enter the teacher's first name.");
      return;
    }

    if (!lastName) {
      setError("Please enter the teacher's last name.");
      return;
    }

    if (!email) {
      setError("Please enter the teacher's email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (selectedClasses.length === 0) {
      setError("Please assign at least one teaching class.");
      return;
    }

    if (selectedSubjects.length === 0) {
      setError("Please assign at least one subject.");
      return;
    }

    if (
      formMasterClassId &&
      !selectedClasses.includes(formMasterClassId)
    ) {
      setError(
        "The Form Master class must also be included in Teaching Classes."
      );
      return;
    }

    const duplicateEmail = teachers.some(
      (teacher) =>
        teacher.email?.trim().toLowerCase() === email
    );

    if (duplicateEmail) {
      setError(
        "A teacher with this email address already exists."
      );
      return;
    }

    if (
      formMasterClassId &&
      unavailableFormMasterClassIds.has(formMasterClassId)
    ) {
      setError(
        "This class already has a Form Master. Please choose another class."
      );
      return;
    }

    try {
      setSaving(true);

      const canUploadAllResults =
        Boolean(formMasterClassId);

      await create("teachers", {
        firstName,
        lastName,
        email,

        classIds: selectedClasses,

        subjectIds: selectedSubjects,
        subjects: selectedSubjectNames,
        subject: selectedSubjectNames.join(", "),

        formClassId: formMasterClassId || null,
        formMasterClassId: formMasterClassId || "",
        formMasterClassName:
          selectedFormMasterClass?.name || "",

        canUploadAllResults,

        status: "active",

        createdBy:
          profile?.name ||
          profile?.email ||
          "admin",

        createdAt: new Date(),
      });

      router.push("/admin/teachers");
    } catch (err) {
      console.error(err);

      setError(
        "Unable to create teacher. Please check your connection and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingOptions) {
    return (
      <div className="p-6">
        <div className="rounded-xl border bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            Loading classes and subjects...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Add Teacher
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Create a teacher account and assign teaching classes,
          subjects, and Form Master responsibilities.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Teacher Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Enter the teacher's basic information.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <TextInput
              label="First Name"
              value={form.firstName}
              onChange={(event) =>
                setForm({
                  ...form,
                  firstName: event.target.value,
                })
              }
              placeholder="Enter first name"
              required
            />

            <TextInput
              label="Last Name"
              value={form.lastName}
              onChange={(event) =>
                setForm({
                  ...form,
                  lastName: event.target.value,
                })
              }
              placeholder="Enter last name"
              required
            />

            <TextInput
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({
                  ...form,
                  email: event.target.value,
                })
              }
              placeholder="teacher@example.com"
              required
            />
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Teaching Classes
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select every class this teacher is assigned to teach.
            </p>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
              No classes have been created yet.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {classes.map((classroom) => {
                const selected = selectedClasses.includes(
                  classroom.id
                );

                return (
                  <button
                    key={classroom.id}
                    type="button"
                    onClick={() =>
                      toggleClass(classroom.id)
                    }
                    className={`rounded-lg border p-4 text-left transition ${
                      selected
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-gray-900">
                        {classroom.name}
                      </span>

                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${
                          selected
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {selected ? "✓" : ""}
                      </span>
                    </div>

                    {classroom.level && (
                      <p className="mt-1 text-xs capitalize text-gray-500">
                        {classroom.level}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedClassNames.length > 0 && (
            <div className="mt-5 rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900">
                Selected Classes
              </p>

              <p className="mt-1 text-sm text-blue-700">
                {selectedClassNames.join(", ")}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Subject Assignment
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Subjects are automatically filtered according to
                the curriculum levels of the selected classes.
              </p>
            </div>

            {availableSubjects.length > 0 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllSubjects}
                  className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={clearSubjects}
                  className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {selectedLevels.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
              Select at least one teaching class to see the
              appropriate subjects.
            </div>
          ) : availableSubjects.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
              No subjects are configured for the selected class
              level. Go to Classes &amp; Subjects to add subjects
              to the curriculum.
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedLevels.map((level) => (
                  <span
                    key={level}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700"
                  >
                    {level}
                  </span>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableSubjects.map((subject) => {
                  const selected = selectedSubjects.includes(
                    subject.id
                  );

                  return (
                    <button
                      key={subject.id}
                      type="button"
                      onClick={() =>
                        toggleSubject(subject.id)
                      }
                      className={`rounded-lg border p-4 text-left transition ${
                        selected
                          ? "border-green-600 bg-green-50"
                          : "border-gray-200 bg-white hover:border-gray-400"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-gray-900">
                          {subject.name}
                        </span>

                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                            selected
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-gray-300"
                          }`}
                        >
                          {selected ? "✓" : ""}
                        </span>
                      </div>

                      {subject.code && (
                        <p className="mt-1 text-xs text-gray-500">
                          {subject.code}
                        </p>
                      )}

                      {Array.isArray(subject.levels) &&
                        subject.levels.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {subject.levels.map((level) => (
                              <span
                                key={level}
                                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] capitalize text-gray-600"
                              >
                                {level}
                              </span>
                            ))}
                          </div>
                        )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {selectedSubjectNames.length > 0 && (
            <div className="mt-5 rounded-lg bg-green-50 p-4">
              <p className="text-sm font-medium text-green-900">
                Selected Subjects
              </p>

              <p className="mt-1 text-sm text-green-700">
                {selectedSubjectNames.join(", ")}
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">
              Form Master Assignment
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              A Form Master can upload results for all subjects in
              their assigned Form Master class when a subject teacher
              is unavailable.
            </p>
          </div>

          <div className="max-w-xl">
            <SelectInput
              label="Form Master Class"
              value={formMasterClassId}
              onChange={(event) =>
                setFormMasterClassId(event.target.value)
              }
              options={[
                {
                  label: "Not a Form Master",
                  value: "",
                },
                ...availableFormMasterClasses.map(
                  (classroom) => ({
                    label: classroom.name,
                    value: classroom.id,
                  })
                ),
              ]}
            />
          </div>

          {formMasterClassId && (
            <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
              <p className="text-sm font-semibold text-purple-900">
                Form Master Access Enabled
              </p>

              <p className="mt-1 text-sm text-purple-700">
                This teacher will be able to upload results for all
                subjects in{" "}
                <strong>
                  {selectedFormMasterClass?.name}
                </strong>
                .
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Assignment Summary
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Classes
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {selectedClasses.length}
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Subjects
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {selectedSubjects.length}
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Form Master
              </p>

              <p className="mt-1 text-2xl font-bold text-gray-900">
                {formMasterClassId ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              router.push("/admin/teachers")
            }
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={saving}
          >
            {saving ? "Creating Teacher..." : "Create Teacher"}
          </Button>
        </div>
      </form>

      <div className="border-t pt-5 text-center text-xs text-gray-400">
        JSA Portal • Maidammanation Tech Company
      </div>
    </div>
  );
}