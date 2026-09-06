"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getTeacherByAuthUid,
  getClasses,
  getStudentsByClass,
  getAttendanceSession,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type {
  AttendanceStatus,
  ClassRoom,
  Student,
} from "@/lib/types";

interface TeacherRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;

  formClassId?: string | null;
  formMasterClassId?: string | null;
}

interface AttendancePermissions {
  canMarkAttendance: boolean;
  attendanceClassIds: string[];
  formMasterClassId: string;
  isFormMaster: boolean;
  singleTeacherClassIds: string[];
}

interface ExistingAttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
}

interface ExistingAttendanceSession {
  records?: ExistingAttendanceRecord[];
}

const STATUS_OPTIONS: {
  label: string;
  value: AttendanceStatus;
}[] = [
  {
    label: "Present",
    value: "present",
  },
  {
    label: "Absent",
    value: "absent",
  },
  {
    label: "Late",
    value: "late",
  },
];

const statusStyle: Record<
  AttendanceStatus,
  string
> = {
  present:
    "bg-status-active/10 text-status-active border-status-active/30",
  absent:
    "bg-status-disabled/10 text-status-disabled border-status-disabled/30",
  late:
    "bg-status-suspended/10 text-status-suspended border-status-suspended/30",
};

function getTodayLocalDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function TeacherAttendancePage() {
  const { profile } = useAuth();

  const [teacher, setTeacher] =
    useState<TeacherRecord | null>(null);

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [permissions, setPermissions] =
    useState<AttendancePermissions | null>(null);

  const [selectedClassId, setSelectedClassId] =
    useState("");

  const [date, setDate] = useState(
    getTodayLocalDate()
  );

  const [students, setStudents] = useState<
    Student[]
  >([]);

  const [marks, setMarks] = useState<
    Record<string, AttendanceStatus>
  >({});

  const [loading, setLoading] =
    useState(true);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  /*
   * Load teacher information, classes and
   * server-side attendance permissions.
   */
  useEffect(() => {
    if (!profile?.uid) return;

    let mounted = true;

    setLoading(true);
    setError("");

    Promise.all([
      getTeacherByAuthUid(profile.uid),
      getClasses(),
      fetch(
        "/api/teacher/attendance-permissions",
        {
          method: "GET",
          cache: "no-store",
        }
      ),
    ])
      .then(
        async ([
          teacherRecord,
          classList,
          permissionResponse,
        ]) => {
          if (!mounted) return;

          const t =
            teacherRecord as TeacherRecord | null;

          const allClasses =
            classList as ClassRoom[];

          if (!permissionResponse.ok) {
            const data =
              await permissionResponse.json().catch(
                () => ({})
              );

            throw new Error(
              data.error ||
                "Could not determine attendance permissions."
            );
          }

          const permissionData =
            (await permissionResponse.json()) as AttendancePermissions;

          if (!mounted) return;

          setTeacher(t);
          setClasses(allClasses);
          setPermissions(permissionData);

          /*
           * Prefer the Form Master class.
           * Otherwise use the first permitted class.
           */
          const preferredClassId =
            permissionData.formMasterClassId &&
            permissionData.attendanceClassIds.includes(
              permissionData.formMasterClassId
            )
              ? permissionData.formMasterClassId
              : permissionData.attendanceClassIds[0] ||
                "";

          setSelectedClassId(
            preferredClassId
          );
        }
      )
      .catch((err) => {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load attendance permissions."
        );
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [profile?.uid]);

  /*
   * Resolve the currently selected class.
   */
  const selectedClass =
    classes.find(
      (cls) => cls.id === selectedClassId
    ) || null;

  /*
   * Determine whether the selected class is
   * the teacher's Form Master class.
   */
  const isSelectedFormMaster =
    Boolean(
      permissions?.formMasterClassId &&
        selectedClassId ===
          permissions.formMasterClassId
    );

  /*
   * Determine whether the selected class is
   * a single-teacher class.
   */
  const isSelectedSingleTeacherClass =
    Boolean(
      permissions?.singleTeacherClassIds.includes(
        selectedClassId
      )
    );

  /*
   * Load students and existing attendance
   * whenever the selected class or date changes.
   */
  useEffect(() => {
    if (!selectedClassId || !date) {
      setStudents([]);
      setMarks({});
      return;
    }

    if (
      !permissions?.attendanceClassIds.includes(
        selectedClassId
      )
    ) {
      setStudents([]);
      setMarks({});
      return;
    }

    let cancelled = false;

    setLoadingStudents(true);
    setMessage("");
    setError("");

    Promise.all([
      getStudentsByClass(selectedClassId),
      getAttendanceSession(
        selectedClassId,
        date
      ),
    ])
      .then(
        ([
          studentList,
          existingSession,
        ]) => {
          if (cancelled) return;

          const list =
            studentList as Student[];

          const existing =
            existingSession as ExistingAttendanceSession | null;

          setStudents(list);

          const initialMarks: Record<
            string,
            AttendanceStatus
          > = {};

          list.forEach((student) => {
            const prior =
              existing?.records?.find(
                (record) =>
                  record.studentId ===
                  student.id
              );

            /*
             * Default new attendance to Present.
             */
            initialMarks[student.id] =
              prior?.status || "present";
          });

          setMarks(initialMarks);

          if (existing) {
            setMessage(
              "Attendance has already been recorded for this date. Saving again will update it."
            );
          }
        }
      )
      .catch((err) => {
        if (cancelled) return;

        setStudents([]);
        setMarks({});

        setError(
          err instanceof Error
            ? err.message
            : "Could not load attendance."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingStudents(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedClassId,
    date,
    permissions,
  ]);

  /*
   * Change the selected class.
   */
  const handleClassChange = (
    classId: string
  ) => {
    setSelectedClassId(classId);
    setMessage("");
    setError("");
    setStudents([]);
    setMarks({});
  };

  /*
   * Change one student's attendance status.
   */
  const setMark = (
    studentId: string,
    status: AttendanceStatus
  ) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: status,
    }));

    setMessage("");
    setError("");
  };

  /*
   * Mark every student with the same status.
   */
  const markAll = (
    status: AttendanceStatus
  ) => {
    const next: Record<
      string,
      AttendanceStatus
    > = {};

    students.forEach((student) => {
      next[student.id] = status;
    });

    setMarks(next);
    setMessage("");
    setError("");
  };

  /*
   * Submit attendance securely through the
   * server-side attendance endpoint.
   */
  const handleSubmit = async () => {
    if (!selectedClassId) {
      setError(
        "Please select a class."
      );
      return;
    }

    if (
      !permissions?.attendanceClassIds.includes(
        selectedClassId
      )
    ) {
      setError(
        "You are not authorized to take attendance for this class."
      );
      return;
    }

    if (!date) {
      setError("Please select a date.");
      return;
    }

    if (students.length === 0) {
      setError(
        "There are no students in this class."
      );
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const records = students.map(
        (student) => ({
          studentId: student.id,
          status:
            marks[student.id] || "present",
        })
      );

      const response = await fetch(
        "/api/teacher/submit-attendance",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            classId: selectedClassId,
            date,
            records,
          }),
        }
      );

      const data =
        await response.json().catch(
          () => ({})
        );

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not submit attendance."
        );
      }

      setMessage(
        data.message ||
          "Attendance submitted successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * Loading teacher information.
   */
  if (loading) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-gray-800">
          Take Attendance
        </h1>

        <p className="text-sm text-gray-400">
          Loading teacher information...
        </p>
      </div>
    );
  }

  /*
   * No teacher record or no attendance permission.
   */
  if (
    !teacher ||
    !permissions?.canMarkAttendance ||
    permissions.attendanceClassIds.length === 0
  ) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Take Attendance
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Attendance
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-status-disabled">
            You are not authorized to take attendance
            for any assigned class.
          </p>

          <p className="text-sm text-gray-400 mt-1">
            Contact your administrator if you believe
            this is incorrect.
          </p>
        </div>
      </div>
    );
  }

  /*
   * If the selected class has somehow become
   * unavailable, stop before displaying attendance.
   */
  if (
    !selectedClassId ||
    !permissions.attendanceClassIds.includes(
      selectedClassId
    )
  ) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Take Attendance
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Attendance
          </p>
        </div>

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-status-disabled">
            No authorized attendance class is
            currently selected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Take Attendance
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          {isSelectedFormMaster
            ? "Form Master"
            : "Class Teacher"}
          :{" "}
          <span className="font-medium text-gray-700">
            {selectedClass?.name ||
              "Assigned Class"}
          </span>
        </p>
      </div>

      {/* Class selector */}
      {permissions.attendanceClassIds.length >
        1 && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6 max-w-sm">
          <label
            htmlFor="attendance-class"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Attendance Class
          </label>

          <select
            id="attendance-class"
            value={selectedClassId}
            onChange={(e) =>
              handleClassChange(
                e.target.value
              )
            }
            disabled={saving}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50"
          >
            {permissions.attendanceClassIds.map(
              (classId) => {
                const cls =
                  classes.find(
                    (item) =>
                      item.id === classId
                  );

                const isFormMaster =
                  classId ===
                  permissions.formMasterClassId;

                return (
                  <option
                    key={classId}
                    value={classId}
                  >
                    {cls?.name ||
                      "Assigned Class"}
                    {isFormMaster
                      ? " — Form Master"
                      : ""}
                  </option>
                );
              }
            )}
          </select>
        </div>
      )}

      {/* Attendance notice */}
      <div className="bg-brand/5 border border-brand/10 rounded-card px-4 py-3">
        <p className="text-sm text-brand-dark">
          You are taking attendance as{" "}
          <span className="font-semibold">
            {isSelectedFormMaster
              ? "the Form Master"
              : "the Class Teacher"}
          </span>{" "}
          of{" "}
          <span className="font-semibold">
            {selectedClass?.name ||
              "this class"}
          </span>
          .
        </p>
      </div>

      {/* Date */}
      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6 max-w-sm">
        <TextInput
          label="Attendance Date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setMessage("");
            setError("");
          }}
        />
      </div>

      {/* Messages */}
      {message && (
        <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Loading students */}
      {loadingStudents && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-400">
            Loading students and attendance...
          </p>
        </div>
      )}

      {/* Student attendance */}
      {!loadingStudents &&
        students.length > 0 && (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {students.length} student
                  {students.length === 1
                    ? ""
                    : "s"}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {date}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    markAll("present")
                  }
                  disabled={saving}
                  className="text-xs text-status-active hover:underline disabled:opacity-50"
                >
                  Mark all present
                </button>

                <button
                  type="button"
                  onClick={() =>
                    markAll("absent")
                  }
                  disabled={saving}
                  className="text-xs text-status-disabled hover:underline disabled:opacity-50"
                >
                  Mark all absent
                </button>

                <button
                  type="button"
                  onClick={() =>
                    markAll("late")
                  }
                  disabled={saving}
                  className="text-xs text-status-suspended hover:underline disabled:opacity-50"
                >
                  Mark all late
                </button>
              </div>
            </div>

            {/* Students */}
            <ul className="divide-y divide-gray-100">
              {students.map(
                (student, index) => (
                  <li
                    key={student.id}
                    className="px-4 py-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {/* Student */}
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-gray-400 w-5 pt-1">
                          {index + 1}.
                        </span>

                        <div>
                          <p className="text-sm text-gray-700 font-medium">
                            {student.firstName}{" "}
                            {student.lastName}
                          </p>

                          {student.admissionNo && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Admission No:{" "}
                              {
                                student.admissionNo
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status buttons */}
                      <div className="flex gap-2 sm:justify-end">
                        {STATUS_OPTIONS.map(
                          (option) => {
                            const selected =
                              marks[
                                student.id
                              ] ===
                              option.value;

                            return (
                              <button
                                key={
                                  option.value
                                }
                                type="button"
                                onClick={() =>
                                  setMark(
                                    student.id,
                                    option.value
                                  )
                                }
                                disabled={saving}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                  selected
                                    ? statusStyle[
                                        option
                                          .value
                                      ]
                                    : "border-gray-200 text-gray-400 hover:border-gray-300"
                                } disabled:opacity-50`}
                              >
                                {
                                  option.label
                                }
                              </button>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </li>
                )
              )}
            </ul>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400">
                  Check each student's status before
                  submitting.
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Existing attendance for this date
                  will be updated.
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving
                  ? "Submitting..."
                  : "Submit Attendance"}
              </Button>
            </div>
          </div>
        )}

      {/* No students */}
      {!loadingStudents &&
        students.length === 0 && (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
            <p className="text-sm text-gray-400">
              No students found in{" "}
              <span className="font-medium text-gray-600">
                {selectedClass?.name ||
                  "this class"}
              </span>
              .
            </p>
          </div>
        )}
    </div>
  );
}