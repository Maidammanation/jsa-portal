"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getAll,
  getById,
  getClasses,
  getSubjects,
  update,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { ClassRoom, SchoolLevel, Subject } from "@/lib/types";

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

function getClassLevel(
  level?: string,
  name?: string
): SchoolLevel | "" {
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
    value.startsWith("ss") ||
    value.includes("senior")
  ) {
    return "ss";
  }

  return "";
}

function getLevelLabel(level: SchoolLevel | "") {
  switch (level) {
    case "nursery":
      return "Nursery";
    case "primary":
      return "Primary";
    case "jss":
      return "JSS";
    case "ss":
      return "SS";
    default:
      return "";
  }
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

  const [classes, setClasses] = useState<ClassRoom[]>(
    []
  );

  const [subjects, setSubjects] = useState<Subject[]>(
    []
  );

  const [teachers, setTeachers] = useState<Teacher[]>(
    []
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [selectedClasses, setSelectedClasses] =
    useState<string[]>([]);

  const [selectedSubjects, setSelectedSubjects] =
    useState<string[]>([]);

  const [formMasterClassId, setFormMasterClassId] =
    useState("");

  const [status, setStatus] = useState<
    "active" | "suspended" | "disabled"
  >("active");

  /*
   * LOAD TEACHER DATA
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

        const teacherRecord =
          teacherData as Teacher;

        const loadedClasses =
          (classData || []) as ClassRoom[];

        const loadedSubjects =
          (subjectData || []) as Subject[];

        const loadedTeachers =
          (teacherList || []) as Teacher[];

        setTeacher(teacherRecord);
        setClasses(loadedClasses);
        setSubjects(loadedSubjects);
        setTeachers(loadedTeachers);

        setForm({
          firstName:
            teacherRecord.firstName || "",
          lastName:
            teacherRecord.lastName || "",
          email:
            teacherRecord.email || "",
        });

        /*
         * LOAD TEACHING CLASSES
         */
        let classIds =
          teacherRecord.classIds || [];

        const existingFormClassId =
          teacherRecord.formClassId ||
          teacherRecord.formMasterClassId ||
          "";

        /*
         * Legacy compatibility:
         * if an old teacher has no classIds but has
         * a Form Master class, preserve it.
         */
        if (
          classIds.length === 0 &&
          existingFormClassId
        ) {
          classIds = [existingFormClassId];
        }

        setSelectedClasses(classIds);

        /*
         * LOAD SUBJECT ASSIGNMENTS
         *
         * New format:
         * subjectIds
         *
         * Legacy:
         * subjects[]
         *
         * Older:
         * subject = "English, Mathematics"
         */
        let subjectIds =
          teacherRecord.subjectIds || [];

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
                  subject.name
                    .trim()
                    .toLowerCase()
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
              .map((item) =>
                item.trim().toLowerCase()
              )
              .filter(Boolean);

          subjectIds = loadedSubjects
            .filter((subject) =>
              oldSubjectNames.includes(
                subject.name
                  .trim()
                  .toLowerCase()
              )
            )
            .map((subject) => subject.id);
        }

        setSelectedSubjects(subjectIds);

        setFormMasterClassId(
          existingFormClassId
        );

        setStatus(
          teacherRecord.status || "active"
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
   * SELECTED SCHOOL LEVELS
   */
  const selectedLevels = useMemo(() => {
    const levels = new Set<SchoolLevel>();

    selectedClasses.forEach((classId) => {
      const classroom = classes.find(
        (item) => item.id === classId
      );

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
  }, [selectedClasses, classes]);

  /*
   * WHETHER SUBJECT RECORDS USE THE NEW LEVEL SYSTEM
   */
  const hasLevelAwareSubjects = useMemo(() => {
    return subjects.some(
      (subject) =>
        Array.isArray(subject.levels) &&
        subject.levels.length > 0
    );
  }, [subjects]);

  /*
   * SUBJECTS AVAILABLE FOR THE SELECTED CLASSES
   *
   * IMPORTANT:
   * We now use Subject.levels from the
   * Classes & Subjects page.
   *
   * Music is always excluded.
   */
  const availableSubjects = useMemo(() => {
    if (selectedLevels.length === 0) {
      return [];
    }

    return subjects.filter((subject) => {
      const subjectName =
        subject.name.trim().toLowerCase();

      /*
       * Music is intentionally not part of JSA.
       */
      if (subjectName === "music") {
        return false;
      }

      /*
       * New level-aware curriculum.
       */
      if (
        Array.isArray(subject.levels) &&
        subject.levels.length > 0
      ) {
        return selectedLevels.some((level) =>
          subject.levels?.includes(level)
        );
      }

      /*
       * Legacy compatibility.
       *
       * If the database has not yet been migrated
       * to level-aware subjects, allow old subjects
       * except Music.
       */
      if (!hasLevelAwareSubjects) {
        return true;
      }

      return false;
    });
  }, [
    subjects,
    selectedLevels,
    hasLevelAwareSubjects,
  ]);

  /*
   * KEEP ONLY VALID SUBJECT ASSIGNMENTS
   *
   * We intentionally do NOT clear existing subjects
   * when the teacher is a Form Master with no subjects.
   */
  useEffect(() => {
    if (selectedLevels.length === 0) {
      return;
    }

    const availableIds = new Set(
      availableSubjects.map(
        (subject) => subject.id
      )
    );

    setSelectedSubjects((previous) =>
      previous.filter((id) =>
        availableIds.has(id)
      )
    );
  }, [
    availableSubjects,
    selectedLevels.length,
  ]);

  /*
   * FORM MASTER CLASSES ALREADY ASSIGNED
   *
   * Exclude the current teacher so they can keep
   * their existing Form Master class.
   */
  const assignedByOtherTeachers = useMemo(() => {
    return new Set(
      teachers
        .filter(
          (item) => item.id !== teacherId
        )
        .flatMap((item) => [
          item.formClassId || "",
          item.formMasterClassId || "",
        ])
        .filter(Boolean)
    );
  }, [teachers, teacherId]);

  /*
   * FORM MASTER CLASS OPTIONS
   */
  const availableFormMasterClasses =
    useMemo(() => {
      return classes.filter(
        (classroom) =>
          !assignedByOtherTeachers.has(
            classroom.id
          )
      );
    }, [
      classes,
      assignedByOtherTeachers,
    ]);

  /*
   * SELECTED CLASS NAMES
   */
  const selectedClassNames = useMemo(() => {
    return classes
      .filter((classroom) =>
        selectedClasses.includes(
          classroom.id
        )
      )
      .map((classroom) => classroom.name);
  }, [classes, selectedClasses]);

  /*
   * SELECTED SUBJECT NAMES
   */
  const selectedSubjectNames = useMemo(() => {
    return subjects
      .filter((subject) =>
        selectedSubjects.includes(
          subject.id
        )
      )
      .map((subject) => subject.name);
  }, [subjects, selectedSubjects]);

  /*
   * SELECTED FORM MASTER CLASS
   */
  const selectedFormMasterClass =
    classes.find(
      (classroom) =>
        classroom.id === formMasterClassId
    );

  /*
   * HANDLE BASIC FORM CHANGES
   */
  const handleChange =
    (field: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setForm((previous) => ({
        ...previous,
        [field]: e.target.value,
      }));

      setError("");
      setSuccess("");
    };

  /*
   * TOGGLE CLASS
   */
  const toggleClass = (
    classId: string
  ) => {
    setSelectedClasses((previous) =>
      previous.includes(classId)
        ? previous.filter(
            (id) => id !== classId
          )
        : [...previous, classId]
    );

    setError("");
    setSuccess("");
  };

  /*
   * TOGGLE SUBJECT
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

    setError("");
    setSuccess("");
  };

  /*
   * SELECT ALL AVAILABLE SUBJECTS
   */
  const selectAllSubjects = () => {
    setSelectedSubjects(
      availableSubjects.map(
        (subject) => subject.id
      )
    );

    setError("");
    setSuccess("");
  };

  /*
   * CLEAR SUBJECTS
   */
  const clearAllSubjects = () => {
    setSelectedSubjects([]);
    setError("");
    setSuccess("");
  };

  /*
   * SAVE TEACHER
   */
  const handleSubmit = async (
    e: FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setSuccess("");

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

    /*
     * A teacher must have at least one teaching
     * class.
     */
    if (
      selectedClasses.length === 0
    ) {
      setError(
        "Please assign at least one teaching class to this teacher."
      );
      return;
    }

    /*
     * IMPORTANT:
     *
     * A normal teacher needs at least one subject.
     *
     * A Form Master does NOT need a subject because
     * Form Masters have full result-upload permission
     * for their Form Master class.
     */
    if (
      selectedSubjects.length === 0 &&
      !formMasterClassId
    ) {
      setError(
        "Please assign at least one teaching subject to this teacher, or assign a Form Master class."
      );
      return;
    }

    /*
     * Form Master class must also be one of the
     * teacher's assigned classes.
     */
    if (
      formMasterClassId &&
      !selectedClasses.includes(
        formMasterClassId
      )
    ) {
      setError(
        "The Form Master class must also be one of the teacher's assigned teaching classes."
      );
      return;
    }

    /*
     * Prevent duplicate Form Masters.
     */
    if (
      formMasterClassId &&
      assignedByOtherTeachers.has(
        formMasterClassId
      )
    ) {
      setError(
        "This class already has another Form Master. Please select another class."
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * Get the final subject names.
       */
      const finalSubjectNames =
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
       * Get Form Master class name.
       */
      const formMasterClass =
        classes.find(
          (classroom) =>
            classroom.id ===
            formMasterClassId
        );

      /*
       * Form Master automatically receives
       * full result-upload permission.
       */
      const canUploadAllResults =
        Boolean(formMasterClassId);

      /*
       * UPDATE TEACHER RECORD
       */
      await update(
        "teachers",
        teacherId,
        {
          firstName,
          lastName,
          email,

          /*
           * Teaching classes.
           */
          classIds: selectedClasses,

          /*
           * Teaching subjects.
           *
           * Form Master does NOT need every subject
           * here. Full result access is controlled by
           * canUploadAllResults.
           */
          subjectIds: selectedSubjects,

          /*
           * Legacy-compatible subject fields.
           */
          subjects: finalSubjectNames,

          subject:
            finalSubjectNames.join(", "),

          /*
           * Form Master assignment.
           */
          formClassId:
            formMasterClassId || null,

          formMasterClassId:
            formMasterClassId || "",

          formMasterClassName:
            formMasterClass?.name || "",

          /*
           * Full result permission for Form Masters.
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

      /*
       * SYNCHRONIZE TEACHER SECURITY PERMISSIONS
       *
       * The teacher's classes, subjects and Form Master
       * assignment are mirrored into users/{authUid}.
       *
       * This allows Firestore Security Rules to enforce
       * teacher permissions using the authenticated UID.
       */
      if (teacher.authUid) {
        const syncResponse = await fetch(
          "/api/admin/sync-teacher-account",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              teacherId,
              authUid: teacher.authUid,

              firstName,
              lastName,
              email,

              classIds: selectedClasses,
              subjectIds: selectedSubjects,

              formClassId:
                formMasterClassId || "",

              formMasterClassId:
                formMasterClassId || "",

              formMasterClassName:
                formMasterClass?.name || "",

              canUploadAllResults,

              status,
            }),
          }
        );

        const syncData =
          await syncResponse.json();

        if (!syncResponse.ok) {
          throw new Error(
            syncData.error ||
              "Teacher account permissions could not be synchronized."
          );
        }
      }

      setSuccess(
        "Teacher information updated successfully."
      );

      /*
       * Update local teacher state.
       */
      setTeacher((previous) =>
        previous
          ? {
              ...previous,
              firstName,
              lastName,
              email,
              classIds:
                selectedClasses,
              subjectIds:
                selectedSubjects,
              subjects:
                finalSubjectNames,
              subject:
                finalSubjectNames.join(
                  ", "
                ),
              formClassId:
                formMasterClassId ||
                null,
              formMasterClassId:
                formMasterClassId || "",
              formMasterClassName:
                formMasterClass?.name ||
                "",
              canUploadAllResults,
              status,
            }
          : previous
      );

      /*
       * Give the user a moment to see the success
       * message before returning.
       */
      setTimeout(() => {
        router.push("/admin/teachers");
      }, 900);
    } catch (err) {
      console.error(
        "Could not update teacher:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not update teacher information."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * LOADING STATE
   */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
              <p className="text-sm text-slate-600">
                Loading teacher information...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /*
   * ERROR WHEN TEACHER WAS NOT FOUND
   */
  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-bold text-red-800">
              Teacher Not Found
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error ||
                "The teacher record could not be found."}
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/admin/teachers"
                )
              }
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Back to Teachers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Jidda Standard Academy
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Edit Teacher
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Update teaching classes, subjects and
              Form Master responsibilities.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/teachers"
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to Teachers
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-700">
              {error}
            </p>
          </div>
        )}

        {/* SUCCESS */}
        {success && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-700">
              {success}
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* TEACHER INFORMATION */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Teacher Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update the teacher's basic account
                information.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  First Name
                </label>

                <input
                  type="text"
                  value={form.firstName}
                  onChange={handleChange(
                    "firstName"
                  )}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  placeholder="First name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Last Name
                </label>

                <input
                  type="text"
                  value={form.lastName}
                  onChange={handleChange(
                    "lastName"
                  )}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  placeholder="Last name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange(
                    "email"
                  )}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  placeholder="teacher@example.com"
                />
              </div>
            </div>

            <div className="mt-5 max-w-xs">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Account Status
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as
                      | "active"
                      | "suspended"
                      | "disabled"
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              >
                <option value="active">
                  Active
                </option>
                <option value="suspended">
                  Suspended
                </option>
                <option value="disabled">
                  Disabled
                </option>
              </select>
            </div>
          </section>

          {/* TEACHING CLASSES */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Teaching Classes
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select the classes this teacher is
                assigned to teach.
              </p>
            </div>

            {classes.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  No classes have been created yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {classes.map((classroom) => {
                  const checked =
                    selectedClasses.includes(
                      classroom.id
                    );

                  const level =
                    getClassLevel(
                      classroom.level,
                      classroom.name
                    );

                  return (
                    <label
                      key={classroom.id}
                      className={`cursor-pointer rounded-xl border p-4 transition ${
                        checked
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white hover:border-slate-400"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleClass(
                              classroom.id
                            )
                          }
                          className="mt-1 h-4 w-4"
                        />

                        <div>
                          <p className="font-semibold">
                            {classroom.name}
                          </p>

                          {level && (
                            <p
                              className={`mt-1 text-xs ${
                                checked
                                  ? "text-slate-300"
                                  : "text-slate-500"
                              }`}
                            >
                              {getLevelLabel(
                                level
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {selectedClasses.length > 0 && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Selected Classes
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800">
                  {selectedClassNames.join(
                    ", "
                  )}
                </p>
              </div>
            )}
          </section>

          {/* SUBJECT ASSIGNMENT */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Subject Assignment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Only subjects configured for the
                  selected school levels are shown.
                </p>

                {selectedLevels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedLevels.map(
                      (level) => (
                        <span
                          key={level}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {getLevelLabel(
                            level
                          )}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>

              {availableSubjects.length >
                0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={
                      selectAllSubjects
                    }
                    className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Select All
                  </button>

                  <button
                    type="button"
                    onClick={
                      clearAllSubjects
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {selectedLevels.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  Select at least one teaching class
                  first. The available subjects will
                  then be based on the class level.
                </p>
              </div>
            ) : availableSubjects.length ===
              0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  No subjects are currently
                  configured for the selected school
                  level.
                </p>

                <p className="mt-1 text-xs text-amber-700">
                  Go to Classes & Subjects and assign
                  levels to your subjects.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableSubjects.map(
                  (subject) => {
                    const checked =
                      selectedSubjects.includes(
                        subject.id
                      );

                    return (
                      <label
                        key={subject.id}
                        className={`cursor-pointer rounded-xl border p-4 transition ${
                          checked
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-200 bg-white hover:border-slate-400"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleSubject(
                                subject.id
                              )
                            }
                            className="mt-1 h-4 w-4"
                          />

                          <div className="min-w-0">
                            <p className="font-semibold">
                              {subject.name}
                            </p>

                            {subject.code && (
                              <p
                                className={`mt-1 text-xs ${
                                  checked
                                    ? "text-slate-300"
                                    : "text-slate-500"
                                }`}
                              >
                                {subject.code}
                              </p>
                            )}

                            {Array.isArray(
                              subject.levels
                            ) &&
                              subject.levels
                                .length >
                                0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {subject.levels.map(
                                    (
                                      level
                                    ) => (
                                      <span
                                        key={
                                          level
                                        }
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                          checked
                                            ? "bg-white/15 text-white"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {getLevelLabel(
                                          level
                                        )}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
                        </div>
                      </label>
                    );
                  }
                )}
              </div>
            )}

            {selectedSubjects.length >
              0 && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assigned Subjects
                </p>

                <p className="mt-1 text-sm font-medium text-slate-800">
                  {selectedSubjectNames.join(
                    ", "
                  )}
                </p>
              </div>
            )}

            {formMasterClassId &&
              selectedSubjects.length ===
                0 && (
                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-800">
                    Form Master mode
                  </p>

                  <p className="mt-1 text-xs text-blue-700">
                    This teacher can be saved without
                    individual subject assignments because
                    Form Masters receive full result-upload
                    access for their Form Master class.
                  </p>
                </div>
              )}
          </section>

          {/* FORM MASTER */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Form Master Assignment
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                A Form Master can upload results for all
                subjects belonging to their assigned class,
                including results from subject teachers who
                are unavailable.
              </p>
            </div>

            <div className="max-w-xl">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Form Master Class
              </label>

              <select
                value={formMasterClassId}
                onChange={(e) => {
                  setFormMasterClassId(
                    e.target.value
                  );
                  setError("");
                  setSuccess("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
              >
                <option value="">
                  No Form Master assignment
                </option>

                {availableFormMasterClasses.map(
                  (classroom) => (
                    <option
                      key={classroom.id}
                      value={classroom.id}
                    >
                      {classroom.name}
                    </option>
                  )
                )}
              </select>
            </div>

            {selectedFormMasterClass && (
              <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-700">
                    ✓
                  </div>

                  <div>
                    <p className="font-semibold text-green-800">
                      Form Master Assigned
                    </p>

                    <p className="mt-1 text-sm text-green-700">
                      {selectedFormMasterClass.name}
                    </p>

                    <p className="mt-2 text-xs text-green-700">
                      Full result-upload permission will
                      automatically be enabled for this
                      Form Master.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ASSIGNMENT SUMMARY */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-slate-900">
                Assignment Summary
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review the teacher's responsibilities
                before saving.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Teaching Classes
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {selectedClasses.length}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assigned Subjects
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {selectedSubjects.length}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Form Master
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {selectedFormMasterClass
                    ? selectedFormMasterClass.name
                    : "No"}
                </p>
              </div>
            </div>

            {formMasterClassId && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-800">
                  Full Result Upload Permission: Enabled
                </p>

                <p className="mt-1 text-xs text-blue-700">
                  Because this teacher is a Form Master,
                  they will be allowed to upload results
                  for all subjects in the Form Master class.
                </p>
              </div>
            )}
          </section>

          {/* ACTIONS */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                router.push(
                  "/admin/teachers"
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving Changes..."
                : "Save Changes"}
            </button>
          </div>
        </form>

        {/* FOOTER */}
        <div className="mt-8 pb-6 text-center">
          <p className="text-xs text-slate-400">
            Jidda Standard Academy • Maidammanation
            Tech Company
          </p>
        </div>
      </div>
    </div>
  );
}