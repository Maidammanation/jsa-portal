"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TextInput, SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getAll,
  getById,
  getClasses,
  getSubjects,
  update,
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

  canUploadAllResults?: boolean;

  status?: "active" | "suspended" | "disabled";
  authUid?: string;
}

function getClassLevel(level?: string, name?: string) {
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

/*
 * Subjects allowed for each school level.
 *
 * The existing global subjects collection remains unchanged.
 * This mapping only controls which subjects can be assigned
 * to a teacher based on their teaching classes.
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

export default function EditTeacherPage() {
  const router = useRouter();
  const params = useParams();
  const { profile } = useAuth();

  const teacherId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

  const [teacher, setTeacher] = useState<Teacher | null>(null);

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  /*
   * Classes the teacher is actually assigned to teach.
   */
  const [selectedClasses, setSelectedClasses] = useState<string[]>(
    []
  );

  /*
   * Subjects the teacher is assigned to teach.
   */
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    []
  );

  /*
   * Separate Form Master responsibility.
   */
  const [formMasterClassId, setFormMasterClassId] = useState("");

  const [status, setStatus] = useState<
    "active" | "suspended" | "disabled"
  >("active");

  /*
   * Load teacher, classes, subjects and all teachers.
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
          teacherList,
        ] = await Promise.all([
          getById("teachers", teacherId),
          getClasses(),
          getSubjects(),
          getAll("teachers"),
        ]);

        if (!mounted) return;

        if (!teacherData) {
          setError("Teacher record was not found.");
          return;
        }

        const teacherRecord = teacherData as Teacher;
        const loadedClasses = classData as ClassRoom[];
        const loadedSubjects = subjectData as Subject[];
        const loadedTeachers = teacherList as Teacher[];

        setTeacher(teacherRecord);
        setClasses(loadedClasses);
        setSubjects(loadedSubjects);
        setTeachers(loadedTeachers);

        setForm({
          firstName: teacherRecord.firstName || "",
          lastName: teacherRecord.lastName || "",
          email: teacherRecord.email || "",
        });

        /*
         * Load teaching classes.
         *
         * New records already use classIds.
         *
         * For older records, if classIds does not exist,
         * preserve the old Form Master class as a teaching
         * class where possible.
         */
        let classIds = teacherRecord.classIds || [];

        const existingFormClassId =
          teacherRecord.formClassId ||
          teacherRecord.formMasterClassId ||
          "";

        if (
          classIds.length === 0 &&
          existingFormClassId
        ) {
          classIds = [existingFormClassId];
        }

        setSelectedClasses(classIds);

        /*
         * Load subject assignments.
         *
         * New format: subjectIds
         * Legacy format: subjects[]
         * Older format: subject string
         */
        let subjectIds = teacherRecord.subjectIds || [];

        if (
          subjectIds.length === 0 &&
          teacherRecord.subjects &&
          teacherRecord.subjects.length > 0
        ) {
          subjectIds = loadedSubjects
            .filter((subject) =>
              teacherRecord.subjects?.some(
                (name) =>
                  name.trim().toLowerCase() ===
                  subject.name.trim().toLowerCase()
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
              .map((item) => item.trim().toLowerCase())
              .filter(Boolean);

          subjectIds = loadedSubjects
            .filter((subject) =>
              oldSubjectNames.includes(
                subject.name.trim().toLowerCase()
              )
            )
            .map((subject) => subject.id);
        }

        setSelectedSubjects(subjectIds);

        /*
         * Existing Form Master assignment.
         */
        setFormMasterClassId(existingFormClassId);

        setStatus(teacherRecord.status || "active");
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
   * Determine the school levels represented by the
   * teacher's selected teaching classes.
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
   * Subjects allowed for the selected teaching classes.
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
   * Remove subjects that are no longer valid when
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
   * Find classes already assigned to another teacher
   * as Form Master.
   *
   * The current teacher is excluded so they can keep
   * their existing Form Master class.
   */
  const assignedByOtherTeachers = useMemo(() => {
    return new Set(
      teachers
        .filter((item) => item.id !== teacherId)
        .flatMap((item) => [
          item.formClassId || "",
          item.formMasterClassId || "",
        ])
        .filter(Boolean)
    );
  }, [teachers, teacherId]);

  /*
   * Classes available for Form Master assignment.
   */
  const availableFormMasterClasses = useMemo(() => {
    return classes.filter(
      (classRoom) =>
        !assignedByOtherTeachers.has(classRoom.id)
    );
  }, [classes, assignedByOtherTeachers]);

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
   * Handle teacher information changes.
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

      setError("");
    };

  /*
   * Toggle teaching class.
   */
  const toggleClass = (classId: string) => {
    setSelectedClasses((previous) =>
      previous.includes(classId)
        ? previous.filter((id) => id !== classId)
        : [...previous, classId]
    );

    setError("");
  };

  /*
   * Toggle teaching subject.
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
   * Select all subjects applicable to the teacher's
   * selected teaching classes.
   */
  const selectAllSubjects = () => {
    setSelectedSubjects(
      availableSubjects.map((subject) => subject.id)
    );

    setError("");
  };

  /*
   * Clear subjects.
   */
  const clearAllSubjects = () => {
    setSelectedSubjects([]);
    setError("");
  };

  /*
   * Save changes.
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

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim().toLowerCase();

    if (!firstName || !lastName || !email) {
      setError(
        "Please fill in the first name, last name and email."
      );
      return;
    }

    if (selectedClasses.length === 0) {
      setError(
        "Please assign at least one teaching class to this teacher."
      );
      return;
    }

    if (selectedSubjects.length === 0) {
      setError(
        "Please assign at least one teaching subject to this teacher."
      );
      return;
    }

    /*
     * Form Master class must also be one of the
     * teacher's assigned teaching classes.
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
     * Final protection against assigning a class
     * that belongs to another Form Master.
     */
    if (
      formMasterClassId &&
      assignedByOtherTeachers.has(formMasterClassId)
    ) {
      setError(
        "This class already has another Form Master. Please select another class."
      );
      return;
    }

    setSaving(true);

    try {
      const selectedSubjectNames =
        subjects
          .filter((subject) =>
            selectedSubjects.includes(subject.id)
          )
          .map((subject) => subject.name);

      const selectedClass =
        classes.find(
          (classRoom) =>
            classRoom.id === formMasterClassId
        );

      /*
       * Form Master automatically receives full result
       * upload permission.
       *
       * Ordinary teachers remain restricted to their
       * assigned classes and subjects.
       */
      const canUploadAllResults =
        Boolean(formMasterClassId);

      await update(
        "teachers",
        teacherId,
        {
          firstName,
          lastName,
          email,

          /*
           * Actual teaching classes.
           */
          classIds: selectedClasses,

          /*
           * Actual teaching subjects.
           */
          subjectIds: selectedSubjects,

          /*
           * Subject names.
           */
          subjects: selectedSubjectNames,

          /*
           * Legacy subject field.
           */
          subject: selectedSubjectNames.join(", "),

          /*
           * Form Master responsibility.
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

          /*
           * Form Master gets full result upload access.
           */
          canUploadAllResults,

          status,

          updatedBy:
            profile?.name ||
            profile?.email ||
            "admin",

          updatedAt: new Date(),
        }
      );

      router.push("/admin/teachers");
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
   * Form Master dropdown options.
   */
  const formMasterOptions = [
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
  ];

  /*
   * Loading screen.
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
            router.push("/admin/teachers")
          }
        >
          Back to Teachers
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Edit Teacher
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Update teacher information, teaching
          classes, subjects and Form Master
          responsibility.
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

        {/* Teaching Classes */}
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Teaching Classes
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Select the classes this teacher is
              assigned to teach.
            </p>
          </div>

          {classes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm text-gray-500">
                No classes have been created yet.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {classes.map((classRoom) => {
                  const checked =
                    selectedClasses.includes(
                      classRoom.id
                    );

                  return (
                    <label
                      key={classRoom.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
                        checked
                          ? "border-brand bg-brand/5"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleClass(classRoom.id)
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
                        {classRoom.name}
                      </span>
                    </label>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                {selectedClasses.length}{" "}
                class
                {selectedClasses.length === 1
                  ? ""
                  : "es"}{" "}
                selected.
              </p>
            </>
          )}
        </section>

        {/* Subjects */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">
                Subject Assignment
              </h2>

              <p className="text-xs text-gray-400 mt-1">
                Only subjects applicable to the
                selected teaching classes are shown.
              </p>
            </div>

            {availableSubjects.length > 0 && (
              <div className="flex gap-3">
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

          {selectedClasses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm text-gray-500">
                Select teaching classes first.
              </p>
            </div>
          ) : availableSubjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm text-status-disabled">
                No matching subjects were found for
                the selected class level.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {availableSubjects.map((subject) => {
                  const checked =
                    selectedSubjects.includes(
                      subject.id
                    );

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
                        onChange={() =>
                          toggleSubject(subject.id)
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
                        {subject.name}
                      </span>
                    </label>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 mt-2">
                {selectedSubjects.length}{" "}
                subject
                {selectedSubjects.length === 1
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
            Form Master is a separate responsibility.
            A Form Master can also upload results for
            all subjects in their class when another
            subject teacher is unavailable.
          </p>

          {classes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-4">
              <p className="text-sm text-gray-500">
                No classes have been created yet.
              </p>
            </div>
          ) : (
            <SelectInput
              label="Form Master Class"
              value={formMasterClassId}
              onChange={(e) => {
                setFormMasterClassId(e.target.value);
                setError("");
              }}
              options={formMasterOptions}
            />
          )}

          {formMasterClassId && (
            <div className="mt-3 rounded-lg bg-brand/5 border border-brand/10 px-4 py-3">
              <p className="text-xs text-brand font-medium">
                Result Upload Access
              </p>

              <p className="text-sm text-gray-700 mt-1">
                Full result upload access for all
                subjects in the Form Master&apos;s
                assigned class.
              </p>
            </div>
          )}
        </section>

        {/* Status */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Account Status
          </h2>

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

        {/* Summary */}
        <section className="rounded-lg bg-gray-50 border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Assignment Summary
          </h2>

          <div className="space-y-2 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">
                Teacher:
              </span>{" "}
              {form.firstName} {form.lastName}
            </p>

            <p className="text-gray-600">
              <span className="font-medium">
                Teaching Classes:
              </span>{" "}
              {selectedClassNames.length > 0
                ? selectedClassNames.join(", ")
                : "None selected"}
            </p>

            <p className="text-gray-600">
              <span className="font-medium">
                Teaching Subjects:
              </span>{" "}
              {selectedSubjectNames.length > 0
                ? selectedSubjectNames.join(", ")
                : "None selected"}
            </p>

            <p className="text-gray-600">
              <span className="font-medium">
                Form Master:
              </span>{" "}
              {selectedFormMasterClass?.name ||
                "No"}
            </p>

            <p className="text-gray-600">
              <span className="font-medium">
                Result Upload Access:
              </span>{" "}
              {formMasterClassId
                ? "All subjects in Form Master class"
                : "Assigned classes & subjects only"}
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
              router.push("/admin/teachers")
            }
            disabled={saving}
          >
            Cancel
          </Button>
        </div>

        {/* Developer Credit */}
        <div className="pt-2 text-center">
          <p className="text-xs text-gray-400">
            Designed &amp; Developed by Maidammanation
            Tech Company
          </p>

          <p className="text-xs text-gray-400 mt-1">
            08032191668 / 08117106867
          </p>
        </div>
      </form>
    </div>
  );
}

Replace the entire "app/admin/teachers/[id]/edit/page.tsx" with that code.

Important: after this deploys successfully, the next file we should change is "app/teacher/results/page.tsx". That is what will actually enforce the new rule that Form Masters can upload all results, while normal teachers can select only their assigned classes and subjects.