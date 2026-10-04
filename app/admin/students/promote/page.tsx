"use client";

import { useEffect, useMemo, useState } from "react";

import { SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";

import {
  create,
  getClasses,
  getStudentsByClass,
  update,
} from "@/services/database";

import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";

import type { ClassRoom, Student } from "@/lib/types";

type PromotionMode = "selected" | "all";

interface StudentWithSelection extends Student {
  selected?: boolean;
}

interface PromotionHistoryEntry {
  studentId: string;
  studentName: string;
  admissionNo: string;
  fromClassId: string;
  fromClassName: string;
  toClassId: string;
  toClassName: string;
  fromSession: string;
  toSession: string;
  promotedBy: string;
  action: string;
  createdAt: string;
}

export default function PromoteStudentsPage() {
  const { profile } = useAuth();
  const { session } = useSchoolSettings();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<StudentWithSelection[]>([]);

  const [fromClassId, setFromClassId] = useState("");
  const [toClassId, setToClassId] = useState("");

  const [newSession, setNewSession] = useState("");

  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [promotionMode, setPromotionMode] =
    useState<PromotionMode>("selected");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD CLASSES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setLoadingClasses(true);

    getClasses()
      .then((data) => {
        setClasses(data as ClassRoom[]);
      })
      .catch(() => {
        setClasses([]);
        setError("Unable to load classes.");
      })
      .finally(() => {
        setLoadingClasses(false);
      });
  }, []);

  /*
  |--------------------------------------------------------------------------
  | DEFAULT NEXT SESSION
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!session) return;

    const match = session.match(
      /^(\d{4})\/(\d{4})$/
    );

    if (match) {
      const firstYear = Number(match[1]) + 1;
      const secondYear = Number(match[2]) + 1;

      setNewSession(
        `${firstYear}/${secondYear}`
      );
    }
  }, [session]);

  /*
  |--------------------------------------------------------------------------
  | LOAD STUDENTS WHEN SOURCE CLASS CHANGES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!fromClassId) {
      setStudents([]);
      setMessage("");
      setError("");
      return;
    }

    setLoadingStudents(true);
    setMessage("");
    setError("");

    getStudentsByClass(fromClassId)
      .then((data) => {
        setStudents(
          (data as Student[]).map((student) => ({
            ...student,
            selected: true,
          }))
        );
      })
      .catch(() => {
        setStudents([]);
        setError("Unable to load students.");
      })
      .finally(() => {
        setLoadingStudents(false);
      });
  }, [fromClassId]);

  /*
  |--------------------------------------------------------------------------
  | CLASS INFORMATION
  |--------------------------------------------------------------------------
  */

  const fromClass = useMemo(
    () =>
      classes.find(
        (item) => item.id === fromClassId
      ),
    [classes, fromClassId]
  );

  const toClass = useMemo(
    () =>
      classes.find(
        (item) => item.id === toClassId
      ),
    [classes, toClassId]
  );

  /*
  |--------------------------------------------------------------------------
  | CLASS RANKING
  |--------------------------------------------------------------------------
  */

  const getClassRank = (name: string) => {
    const value = name
      .trim()
      .toLowerCase()
      .replace(/-/g, " ")
      .replace(/\s+/g, " ");

    if (
      value === "pre nursery" ||
      value === "prenursery"
    ) {
      return 0;
    }

    const match = value.match(
      /^(nursery|primary|jss|ss)\s*(\d+)?/
    );

    if (!match) return 999;

    const level = match[1];
    const number = Number(match[2] || 0);

    const levelRank: Record<string, number> = {
      nursery: 10,
      primary: 20,
      jss: 30,
      ss: 40,
    };

    return (
      (levelRank[level] || 900) +
      number
    );
  };

  /*
  |--------------------------------------------------------------------------
  | VALIDATE PROMOTION
  |--------------------------------------------------------------------------
  */

  const promotionValidation = useMemo(() => {
    if (!fromClass || !toClass) {
      return {
        valid: false,
        message: "",
      };
    }

    if (fromClassId === toClassId) {
      return {
        valid: false,
        message:
          "The source and destination classes cannot be the same.",
      };
    }

    const fromName = fromClass.name
      .trim()
      .toLowerCase();

    const toName = toClass.name
      .trim()
      .toLowerCase();

    /*
     * SS3 has no automatic next class.
     */
    if (
      fromName === "ss 3" ||
      fromName === "ss3"
    ) {
      return {
        valid: false,
        message:
          "SS 3 is the graduating class and cannot be promoted to another class.",
      };
    }

    const fromRank = getClassRank(
      fromClass.name
    );

    const toRank = getClassRank(
      toClass.name
    );

    /*
     * Promotion must be exactly one level forward.
     */
    if (toRank !== fromRank + 1) {
      return {
        valid: false,
        message:
          "Students can only be promoted to the immediate next class.",
      };
    }

    return {
      valid: true,
      message: "",
    };
  }, [
    fromClass,
    toClass,
    fromClassId,
    toClassId,
  ]);

  /*
  |--------------------------------------------------------------------------
  | SELECTED STUDENTS
  |--------------------------------------------------------------------------
  */

  const selectedStudents = useMemo(
    () =>
      students.filter(
        (student) => student.selected
      ),
    [students]
  );

  /*
  |--------------------------------------------------------------------------
  | TOGGLE ONE STUDENT
  |--------------------------------------------------------------------------
  */

  const toggleStudent = (
    studentId: string
  ) => {
    setStudents((current) =>
      current.map((student) =>
        student.id === studentId
          ? {
              ...student,
              selected: !student.selected,
            }
          : student
      )
    );
  };

  /*
  |--------------------------------------------------------------------------
  | SELECT / DESELECT ALL
  |--------------------------------------------------------------------------
  */

  const selectAll = () => {
    setStudents((current) =>
      current.map((student) => ({
        ...student,
        selected: true,
      }))
    );
  };

  const deselectAll = () => {
    setStudents((current) =>
      current.map((student) => ({
        ...student,
        selected: false,
      }))
    );
  };

  /*
  |--------------------------------------------------------------------------
  | PROMOTE STUDENTS
  |--------------------------------------------------------------------------
  */

  const handlePromote = async () => {
    setMessage("");
    setError("");

    if (!fromClassId || !toClassId) {
      setError(
        "Please select both the source and destination classes."
      );
      return;
    }

    if (!newSession.trim()) {
      setError(
        "Please enter the new academic session."
      );
      return;
    }

    if (!promotionValidation.valid) {
      setError(
        promotionValidation.message
      );
      return;
    }

    const studentsToPromote =
      promotionMode === "all"
        ? students
        : selectedStudents;

    if (studentsToPromote.length === 0) {
      setError(
        "Please select at least one student to promote."
      );
      return;
    }

    const fromName =
      fromClass?.name || fromClassId;

    const toName =
      toClass?.name || toClassId;

    const actor =
      profile?.name ||
      profile?.email ||
      "Admin";

    const confirmed = window.confirm(
      `PROMOTE STUDENTS?\n\n` +
        `${studentsToPromote.length} student(s)\n\n` +
        `From: ${fromName}\n` +
        `To: ${toName}\n\n` +
        `Session: ${session} → ${newSession}\n\n` +
        `This action will change the class of the selected students.`
    );

    if (!confirmed) return;

    setSaving(true);

    try {
      /*
       * Update students one by one.
       */
      await Promise.all(
        studentsToPromote.map(
          async (student) => {
            await update(
              "students",
              student.id,
              {
                classId: toClassId,
              }
            );

            /*
             * Save promotion history.
             */
            const historyEntry: PromotionHistoryEntry =
              {
                studentId: student.id,
                studentName:
                  `${student.firstName} ${student.lastName}`.trim(),
                admissionNo:
                  student.admissionNo || "",
                fromClassId,
                fromClassName: fromName,
                toClassId,
                toClassName: toName,
                fromSession: session,
                toSession: newSession.trim(),
                promotedBy: actor,
                action: "promoted",
                createdAt:
                  new Date().toISOString(),
              };

            await create(
              "promotionHistory",
              historyEntry as unknown as Record<
                string,
                unknown
              >
            );
          }
        )
      );

      setMessage(
        `${studentsToPromote.length} student(s) successfully promoted from ${fromName} to ${toName}.`
      );

      /*
       * Refresh the source-class list.
       */
      const refreshed =
        await getStudentsByClass(
          fromClassId
        );

      setStudents(
        (refreshed as Student[]).map(
          (student) => ({
            ...student,
            selected: true,
          })
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Promotion failed. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CLASS OPTIONS
  |--------------------------------------------------------------------------
  */

  const classOptions = [
    {
      label: "Select a class",
      value: "",
    },
    ...classes.map((item) => ({
      label: item.name,
      value: item.id,
    })),
  ];

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          🎓 Student Promotion Centre
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Promote students to the next academic class
          while keeping a promotion history.
        </p>
      </div>

      {/* SESSION CARD */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Current Session
            </p>

            <p className="text-lg font-semibold text-gray-800 mt-1">
              {session || "—"}
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Promotion Session
            </label>

            <input
              type="text"
              value={newSession}
              onChange={(e) =>
                setNewSession(e.target.value)
              }
              placeholder="2026/2027"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </div>
      </div>

      {/* CLASS SELECTION */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">
          1. Select Classes
        </h2>

        {loadingClasses ? (
          <p className="text-sm text-gray-400">
            Loading classes...
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectInput
              label="From Class"
              value={fromClassId}
              onChange={(e) => {
                setFromClassId(
                  e.target.value
                );
                setToClassId("");
              }}
              options={classOptions}
            />

            <SelectInput
              label="To Class"
              value={toClassId}
              onChange={(e) =>
                setToClassId(
                  e.target.value
                )
              }
              options={classOptions}
            />
          </div>
        )}

        {fromClass && toClass && (
          <div
            className={`rounded-lg px-4 py-3 text-sm ${
              promotionValidation.valid
                ? "bg-green-50 text-green-700 border border-green-100"
                : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            {promotionValidation.valid
              ? `✓ Valid promotion: ${fromClass.name} → ${toClass.name}`
              : `⚠️ ${promotionValidation.message}`}
          </div>
        )}
      </div>

      {/* STUDENTS */}
      {fromClassId && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-gray-800">
                2. Select Students
              </h2>

              <p className="text-xs text-gray-500 mt-1">
                {loadingStudents
                  ? "Loading students..."
                  : `${students.length} student(s) in ${fromClass?.name || "this class"}`}
              </p>
            </div>

            {!loadingStudents &&
              students.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    Select All
                  </button>

                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-xs px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    Deselect All
                  </button>
                </div>
              )}
          </div>

          {loadingStudents ? (
            <p className="text-sm text-gray-400">
              Loading students...
            </p>
          ) : students.length === 0 ? (
            <div className="rounded-lg bg-gray-50 px-4 py-6 text-center">
              <p className="text-sm text-gray-500">
                No students found in this class.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={
                      student.selected === true
                    }
                    onChange={() =>
                      toggleStudent(
                        student.id
                      )
                    }
                    className="h-4 w-4"
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      {student.firstName}{" "}
                      {student.lastName}
                    </p>

                    <p className="text-xs text-gray-400">
                      {student.admissionNo ||
                        "No admission number"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {students.length > 0 && (
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-600">
                <strong>
                  {selectedStudents.length}
                </strong>{" "}
                of{" "}
                <strong>
                  {students.length}
                </strong>{" "}
                student(s) selected.
              </p>
            </div>
          )}
        </div>
      )}

      {/* PROMOTION MODE */}
      {students.length > 0 && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-3">
            3. Promotion Mode
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setPromotionMode(
                  "selected"
                )
              }
              className={`text-left rounded-lg border p-4 ${
                promotionMode ===
                "selected"
                  ? "border-brand bg-brand/5"
                  : "border-gray-200"
              }`}
            >
              <p className="font-semibold text-gray-800">
                👤 Promote Selected
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Only the students you selected will
                be promoted.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setPromotionMode("all")
              }
              className={`text-left rounded-lg border p-4 ${
                promotionMode === "all"
                  ? "border-brand bg-brand/5"
                  : "border-gray-200"
              }`}
            >
              <p className="font-semibold text-gray-800">
                👥 Promote Entire Class
              </p>

              <p className="text-xs text-gray-500 mt-1">
                Promote every student currently in
                the selected class.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* RESULT / ERROR */}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          ✅ {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ⚠️ {error}
        </div>
      )}

      {/* ACTION */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800">
          4. Confirm Promotion
        </h2>

        <p className="text-sm text-gray-500 mt-1 mb-4">
          Review the class, session and students before
          making the change.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400">
              From
            </p>

            <p className="font-semibold text-gray-800">
              {fromClass?.name || "—"}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400">
              To
            </p>

            <p className="font-semibold text-gray-800">
              {toClass?.name || "—"}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-400">
              Students
            </p>

            <p className="font-semibold text-gray-800">
              {promotionMode === "all"
                ? students.length
                : selectedStudents.length}
            </p>
          </div>
        </div>

        <Button
          onClick={handlePromote}
          disabled={
            saving ||
            loadingStudents ||
            !fromClassId ||
            !toClassId ||
            students.length === 0 ||
            selectedStudents.length === 0 ||
            !promotionValidation.valid
          }
          className="w-full sm:w-auto"
        >
          {saving
            ? "Promoting Students..."
            : "🎓 Promote Students"}
        </Button>
      </div>

      {/* IMPORTANT NOTE */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-4">
        <p className="text-sm font-semibold text-yellow-800">
          ⚠️ Important
        </p>

        <p className="text-xs text-yellow-700 mt-1">
          Promotion changes the student's current class
          and records the promotion in the promotion
          history. Results, attendance and other historical
          records are not deleted.
        </p>
      </div>
    </div>
  );
}