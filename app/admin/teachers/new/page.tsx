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
import type { ClassRoom, Subject } from "@/lib/types";

interface TeacherRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  formClassId?: string | null;
  formMasterClassId?: string | null;
}

function getClassLevel(level?: string, name?: string) {
  const value = `${level || ""} ${name || ""}`.toLowerCase();

  if (value.includes("nursery")) return "nursery";
  if (value.includes("primary")) return "primary";

  if (
    value.includes("jss") ||
    value.includes("junior")
  ) {
    return "jss";
  }

  if (
    value.includes("ss ") ||
    value.startsWith("ss")
  ) {
    return "ss";
  }

  if (value.includes("senior")) return "ss";

  return "";
}

/*
 * Subjects allowed for each school level.
 *
 * The existing global subjects collection is not changed.
 * This only controls which subjects are available when
 * assigning a teacher to selected teaching classes.
 */
const LEVEL_SUBJECTS: Record<string, string[]> = {
  nursery: [
    "English Language",
    "Mathematics",
    "Basic Science",
    "Social Studies",
    "Civic Education",
    "Physical and Health Education",
    "Computer Studies / ICT",
    "French",
    "Fine Arts",
    "Music",
    "Islamic Religious Studies",
    "Christian Religious Studies",
  ],

  primary: [
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
    "Fine Arts",
    "Music",
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
    "Fine Arts",
    "Music",
    "Economics",
    "Geography",
    "Literature in English",
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
    "Civic Education",
    "Computer Studies / ICT",
    "French",
    "Physical and Health Education",
    "Fine Arts",
    "Music",
  ],
};

export default function AddTeacherPage() {
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

  /*
   * Classes the teacher is actually assigned to teach.
   */
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  /*
   * Subjects the teacher normally teaches / enters results for.
   */
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  /*
   * Separate Form Master responsibility.
   */
  const [formMasterClassId, setFormMasterClassId] = useState("");

  useEffect(() => {
    let mounted = true;

    setLoadingOptions(true);
    setError("");

    Promise.all([
      getClasses(),
      getSubjects(),
      getAll("teachers"),
    ])
      .then(([classList, subjectList, teacherList]) => {
        if (!mounted) return;

        setClasses(classList as ClassRoom[]);
        setSubjects(subjectList as Subject[]);
        setTeachers(teacherList as TeacherRecord[]);
      })
      .catch((err) => {
        if (!mounted) return;

        console.error(
          "Could not load teacher options:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Could not load teacher assignment options."
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

  /*
   * Determine the school levels represented by
   * the teacher's selected teaching classes.
   */
  const selectedLevels = useMemo(() => {
    const levels = new Set<string>();

    selectedClasses.forEach((classId) => {
      const selectedClass = classes.find(
        (classRoom) => classRoom.id === classId
      );

      const level = getClassLevel(
        selectedClass?.level,
        selectedClass?.name
      );

      if (level) {
        levels.add(level);
      }
    });

    return Array.from(levels);
  }, [selectedClasses, classes]);

  /*
   * Subjects available for the selected classes.
   *
   * If multiple school levels are selected,
   * the subjects are combined without duplicates.
   */
  const availableSubjects = useMemo(() => {
    if (selectedLevels.length === 0) {
      return [];
    }

    const allowedNames = new Set<string>();

    selectedLevels.forEach((level) => {
      (LEVEL_SUBJECTS[level] || []).forEach((name) => {
        allowedNames.add(name.trim().toLowerCase());
      });
    });

    return subjects.filter((subject) =>
      allowedNames.has(
        subject.name.trim().toLowerCase()
      )
    );
  }, [subjects, selectedLevels]);

  /*
   * Remove subjects that become invalid when
   * teaching classes are changed.
   */
  useEffect(() => {
    if (selectedLevels.length === 0) {
      setSelectedSubjects([]);
      return;
    }

    const availableIds = new Set(
      availableSubjects.map((subject) => subject.id)
    );

    setSelectedSubjects((previous) =>
      previous.filter((id) => availableIds.has(id))
    );
  }, [availableSubjects, selectedLevels.length]);

  /*
   * Find classes already assigned to another
   * teacher as Form Master.
   */
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

  /*
   * Only classes without another Form Master
   * can be selected.
   */
  const availableFormMasterClasses = useMemo(() => {
    return classes.filter(
      (classRoom) =>
        !unavailableFormMasterClassIds.has(classRoom.id)
    );
  }, [classes, unavailableFormMasterClassIds]);

  const selectedClassNames = useMemo(() => {
    return classes
      .filter((classRoom) =>
        selectedClasses.includes(classRoom.id)
      )
      .map((classRoom) => classRoom.name);
  }, [classes, selectedClasses]);

  const selectedSubjectNames = useMemo(() => {
    return subjects
      .filter((subject) =>
        selectedSubjects.includes(subject.id)
      )
      .map((subject) => subject.name);
  }, [subjects, selectedSubjects]);

  const selectedFormMasterClass = classes.find(
    (classRoom) => classRoom.id === formMasterClassId
  );

  /*
   * Select / remove a teaching class.
   */
  const toggleClass = (classId: string) => {
    setSelectedClasses((previous) => {
      const isSelected = previous.includes(classId);

      const next = isSelected
        ? previous.filter((id) => id !== classId)
        : [...previous, classId];

      /*
       * If the Form Master class is removed from
       * teaching classes, remove the Form Master
       * assignment too.
       */
      if (
        isSelected &&
        formMasterClassId === classId
      ) {
        setFormMasterClassId("");
      }

      return next;
    });

    setError("");
  };

  /*
   * Select / remove a subject.
   */
  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((previous) =>
      previous.includes(subjectId)
        ? previous.filter((id) => id !== subjectId)
        : [...previous, subjectId]
    );

    setError("");
  };

  /*
   * Select all available subjects.
   */
  const selectAllSubjects = () => {
    setSelectedSubjects(
      availableSubjects.map((subject) => subject.id)
    );

    setError("");
  };

  /*
   * Clear all subjects.
   */
  const clearSubjects = () => {
    setSelectedSubjects([]);
    setError("");
  };

  /*
   * Create the teacher.
   */
  const handleSubmit = async () => {
    setError("");

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim().toLowerCase();

    if (!firstName) {
      setError(
        "Please enter the teacher's first name."
      );
      return;
    }

    if (!lastName) {
      setError(
        "Please enter the teacher's last name."
      );
      return;
    }

    if (!email) {
      setError(
        "Please enter the teacher's email address."
      );
      return;
    }

    if (!email.includes("@")) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    /*
     * Teacher must have at least one
     * teaching class.
     */
    if (selectedClasses.length === 0) {
      setError(
        "Please assign at least one teaching class."
      );
      return;
    }

    /*
     * Teacher must have at least one
     * normal subject assignment.
     *
     * Form Master permission is additional;
     * it does not replace subject assignment.
     */
    if (selectedSubjects.length === 0) {
      setError(
        "Please assign at least one teaching subject."
      );
      return;
    }

    /*
     * A Form Master class must also be one
     * of the teacher's assigned teaching classes.
     */
    if (
      formMasterClassId &&
      !selectedClasses.includes(formMasterClassId)
    ) {
      setError(
        "The Form Master class must also be one of the teacher's assigned teaching classes."
      );
      return;
    }

    /*
     * Prevent duplicate email records.
     *
     * TeacherRecord now correctly includes
     * email?: string.
     */
    const emailExists = teachers.some(
      (teacher) =>
        teacher.email?.trim().toLowerCase() === email
    );

    if (emailExists) {
      setError(
        "A teacher with this email address already exists."
      );
      return;
    }

    /*
     * Final duplicate Form Master protection.
     */
    if (
      formMasterClassId &&
      unavailableFormMasterClassIds.has(
        formMasterClassId
      )
    ) {
      setError(
        "This class already has a Form Master. Please select another class."
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * A Form Master is allowed to upload
       * results for ALL subjects in their
       * Form Master class.
       *
       * Normal teachers remain restricted
       * to their subjectIds.
       */
      const canUploadAllResults =
        Boolean(formMasterClassId);

      await create("teachers", {
        firstName,
        lastName,
        email,

        /*
         * Teaching class assignments.
         */
        classIds: selectedClasses,

        /*
         * Normal subject assignments.
         */
        subjectIds: selectedSubjects,

        /*
         * Legacy compatibility fields.
         */
        subjects: selectedSubjectNames,
        subject: selectedSubjectNames.join(", "),

        /*
         * Form Master assignment.
         */
        formClassId: formMasterClassId || null,

        formMasterClassId:
          formMasterClassId || "",

        formMasterClassName:
          selectedFormMasterClass?.name || "",

        /*
         * Form Master result permission.
         *
         * TRUE:
         * Can upload all subjects for the
         * Form Master class.
         *
         * FALSE:
         * Can upload only assigned subjects.
         */
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
      console.error(
        "Could not create teacher:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not create teacher."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Loading screen.
   */
  if (loadingOptions) {
    return (
      <div className="max-w-4xl space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Add Teacher
        </h1>

        <p className="text-sm text-gray-400">
          Loading teacher assignment options...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Add Teacher
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Create a teacher record and assign classes,
          subjects and Form Master responsibility.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-status-disabled/10 border border-status-disabled/20 px-4 py-3">
          <p className="text-sm text-status-disabled">
            {error}
          </p>
        </div>
      )}

      {/* Teacher Information */}
      <section className="bg-white rounded-card border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            Teacher Information
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            Enter the teacher's basic information.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput
            label="First Name"
            value={form.firstName}
            onChange={(e) =>
              setForm((previous) => ({
                ...previous,
                firstName: e.target.value,
              }))
            }
            placeholder="First name"
          />

          <TextInput
            label="Last Name"
            value={form.lastName}
            onChange={(e) =>
              setForm((previous) => ({
                ...previous,
                lastName: e.target.value,
              }))
            }
            placeholder="Last name"
          />

          <div className="sm:col-span-2">
            <TextInput
              label="Email Address"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((previous) => ({
                  ...previous,
                  email: e.target.value,
                }))
              }
              placeholder="teacher@example.com"
            />
          </div>
        </div>
      </section>

      {/* Teaching Classes */}
      <section className="bg-white rounded-card border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            Teaching Classes
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            Select the classes this teacher is assigned
            to teach. Form Master responsibility is
            stored separately.
          </p>
        </div>

        <div className="p-5">
          {classes.length === 0 ? (
            <p className="text-sm text-gray-400">
              No classes are available.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {classes.map((classRoom) => {
                const checked =
                  selectedClasses.includes(classRoom.id);

                return (
                  <label
                    key={classRoom.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                      checked
                        ? "border-brand/30 bg-brand/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleClass(classRoom.id)
                      }
                      className="h-4 w-4"
                    />

                    <div>
                      <span className="text-sm text-gray-700">
                        {classRoom.name}
                      </span>

                      {classRoom.level && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {classRoom.level}
                        </p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {selectedClassNames.length > 0 && (
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-400">
                Selected Classes
              </p>

              <p className="text-sm text-gray-700 mt-1">
                {selectedClassNames.join(", ")}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Teaching Subjects */}
      <section className="bg-white rounded-card border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            Subject Assignment
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            Only subjects applicable to the selected
            teaching classes are shown.
          </p>
        </div>

        <div className="p-5">
          {selectedClasses.length === 0 ? (
            <p className="text-sm text-gray-400">
              Select at least one teaching class first.
            </p>
          ) : availableSubjects.length === 0 ? (
            <p className="text-sm text-status-disabled">
              No matching subjects were found for the
              selected class level.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 mb-4">
                <button
                  type="button"
                  onClick={selectAllSubjects}
                  className="text-xs text-brand hover:underline"
                >
                  Select all
                </button>

                <button
                  type="button"
                  onClick={clearSubjects}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableSubjects.map((subject) => {
                  const checked =
                    selectedSubjects.includes(subject.id);

                  return (
                    <label
                      key={subject.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                        checked
                          ? "border-brand/30 bg-brand/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleSubject(subject.id)
                        }
                        className="h-4 w-4"
                      />

                      <span className="text-sm text-gray-700">
                        {subject.name}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
                <p className="text-xs text-gray-400">
                  Selected Subjects
                </p>

                <p className="text-sm text-gray-700 mt-1">
                  {selectedSubjectNames.length > 0
                    ? selectedSubjectNames.join(", ")
                    : "None selected"}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Form Master */}
      <section className="bg-white rounded-card border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            Form Master Assignment
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            A Form Master can manage the assigned class
            and upload results for all subjects in that
            class when a subject teacher is unavailable.
          </p>
        </div>

        <div className="p-5">
          <div className="max-w-md">
            <SelectInput
              label="Form Master Class"
              value={formMasterClassId}
              onChange={(e) => {
                setFormMasterClassId(e.target.value);
                setError("");
              }}
              options={[
                {
                  label: "Not a Form Master",
                  value: "",
                },
                ...availableFormMasterClasses.map(
                  (classRoom) => ({
                    label: classRoom.name,
                    value: classRoom.id,
                  })
                ),
              ]}
            />
          </div>

          {formMasterClassId &&
            !selectedClasses.includes(
              formMasterClassId
            ) && (
              <div className="mt-3 rounded-lg bg-status-disabled/10 px-4 py-3">
                <p className="text-xs text-status-disabled">
                  The selected Form Master class must
                  also be included in Teaching Classes.
                </p>
              </div>
            )}

          {selectedFormMasterClass && (
            <div className="mt-4 rounded-lg bg-brand/5 border border-brand/10 px-4 py-3">
              <p className="text-xs text-brand">
                Form Master Result Permission
              </p>

              <p className="text-sm font-medium text-gray-700 mt-1">
                All subjects in{" "}
                {selectedFormMasterClass.name}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                This teacher will be able to upload
                results for any subject in this Form
                Master class when the subject teacher
                is unavailable.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Assignment Summary */}
      <section className="bg-gray-50 rounded-card border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800">
          Assignment Summary
        </h2>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-col sm:flex-row gap-1">
            <span className="text-gray-500 sm:w-40">
              Teaching Classes:
            </span>

            <span className="text-gray-700">
              {selectedClassNames.length > 0
                ? selectedClassNames.join(", ")
                : "None"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-1">
            <span className="text-gray-500 sm:w-40">
              Teaching Subjects:
            </span>

            <span className="text-gray-700">
              {selectedSubjectNames.length > 0
                ? selectedSubjectNames.join(", ")
                : "None"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-1">
            <span className="text-gray-500 sm:w-40">
              Form Master:
            </span>

            <span className="text-gray-700">
              {selectedFormMasterClass?.name ||
                "Not assigned"}
            </span>
          </div>

          {formMasterClassId && (
            <div className="flex flex-col sm:flex-row gap-1">
              <span className="text-gray-500 sm:w-40">
                Result Upload:
              </span>

              <span className="text-gray-700">
                All subjects in Form Master class
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            router.push("/admin/teachers")
          }
          disabled={saving}
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={
            saving ||
            classes.length === 0 ||
            subjects.length === 0
          }
        >
          {saving
            ? "Creating Teacher..."
            : "Create Teacher"}
        </Button>
      </div>

      {/* Developer Credit */}
      <div className="pt-4 pb-2 text-center">
        <p className="text-xs text-gray-400">
          Designed &amp; Developed by Maidammanation Tech
          Company
        </p>

        <p className="text-xs text-gray-400 mt-1">
          08032191668 / 08117106867
        </p>
      </div>
    </div>
  );
}