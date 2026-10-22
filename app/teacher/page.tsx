
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getTeacherByAuthUid,
  getClasses,
  getSubjects,
} from "@/services/database";

import { useAuth } from "@/lib/useAuth";

import type {
  ClassRoom,
  Subject,
} from "@/lib/types";

interface TeacherRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  classIds?: string[];
  subjectIds?: string[];
  formClassId?: string | null;
  formMasterClassId?: string | null;
  formMasterClassName?: string;
}

function normalize(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function isSecondaryClass(classroom: ClassRoom): boolean {
  const level = normalize(classroom.level);
  const name = normalize(classroom.name).replace(/-/g, " ");

  return (
    level === "jss" ||
    level === "ss" ||
    level.includes("jss") ||
    level.includes("secondary") ||
    /^(jss|ss)\s*[1-3]$/.test(name)
  );
}

export default function TeacherDashboardPage() {
  const { profile } = useAuth();

  const [teacher, setTeacher] = useState<TeacherRecord | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendanceClassIds, setAttendanceClassIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile?.uid) {
      setLoading(false);
      return;
    }

    let mounted = true;

    setLoading(true);
    setError("");

    Promise.all([
      getTeacherByAuthUid(profile.uid),
      getClasses(),
      getSubjects(),
      fetch("/api/teacher/attendance-permissions", {
        method: "GET",
        cache: "no-store",
      }),
    ])
      .then(async ([teacherRecord, classList, subjectList, attendanceResponse]) => {
        if (!mounted) return;

        if (!attendanceResponse.ok) {
          throw new Error("Could not load attendance permissions.");
        }

        const attendanceData = await attendanceResponse.json();

        if (!mounted) return;

        setTeacher(teacherRecord as TeacherRecord | null);
        setClasses(classList as ClassRoom[]);
        setSubjects(subjectList as Subject[]);
        setAttendanceClassIds(
          Array.isArray(attendanceData.attendanceClassIds)
            ? attendanceData.attendanceClassIds
            : []
        );
      })
      .catch((err) => {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load teacher dashboard."
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [profile?.uid]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Teacher Dashboard
        </h1>
        <p className="text-sm text-gray-400">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Teacher Dashboard
        </h1>
        <div className="rounded-lg bg-status-disabled/10 px-4 py-3">
          <p className="text-sm text-status-disabled">{error}</p>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-800">
          Teacher Dashboard
        </h1>
        <div className="rounded-card border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">
            Your account is not linked to a teacher record.
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Please contact the school administrator.
          </p>
        </div>
      </div>
    );
  }

  const myClasses = classes.filter((classRoom) =>
    teacher.classIds?.some(
      (id) => normalize(id) === normalize(classRoom.id)
    )
  );

  const mySubjects = subjects.filter((subject) =>
    teacher.subjectIds?.some(
      (id) => normalize(id) === normalize(subject.id)
    )
  );

  const formClassIdentifier =
    teacher.formClassId ||
    teacher.formMasterClassId ||
    teacher.formMasterClassName ||
    "";

  const formClass = classes.find(
    (classRoom) =>
      normalize(classRoom.id) === normalize(formClassIdentifier) ||
      normalize(classRoom.name) === normalize(formClassIdentifier)
  );

  const formClassId = formClass?.id || "";
  const isFormMaster = Boolean(formClass);
  const canTakeAttendance = attendanceClassIds.length > 0;

  const attendanceClasses = classes.filter((classRoom) =>
    attendanceClassIds.includes(classRoom.id)
  );

  const teacherName =
    `${teacher.firstName || ""} ${teacher.lastName || ""}`.trim() ||
    profile?.name ||
    "Teacher";

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Welcome, {teacherName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Teacher Dashboard
        </p>
      </div>

      {/* Form Master notice and actions */}
      {isFormMaster && formClass && (
        <div className="rounded-card border border-brand/10 bg-brand/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand">
                Form Master
              </p>
              <h2 className="mt-1 text-lg font-semibold text-gray-800">
                {formClass.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                You can register students, enter results, generate report cards, and manage your assigned class.
                {isSecondaryClass(formClass)
                  ? " You are also authorized to manage this class's attendance."
                  : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/teacher/students/new"
                className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Register Student
              </Link>

              <Link
                href={`/teacher/results?classId=${encodeURIComponent(formClass.id)}`}
                className="inline-flex items-center justify-center rounded-lg border border-brand px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand/5"
              >
                Enter Results
              </Link>

              {/* NEW: Generate Report Cards */}
              <Link
                href="/teacher/results/report-cards"
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Generate Report Cards
              </Link>

              {attendanceClassIds.includes(formClass.id) && (
                <Link
                  href="/teacher/attendance"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Take Attendance
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-card border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Assigned Classes</p>
            <span className="text-2xl font-semibold text-gray-800">
              {myClasses.length}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Classes you are assigned to teach
          </p>
        </div>

        <div className="rounded-card border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Assigned Subjects</p>
            <span className="text-2xl font-semibold text-gray-800">
              {mySubjects.length}
            </span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Subjects assigned to your account
          </p>
        </div>

        <div className="rounded-card border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Form Master</p>
          <p className="mt-1 text-lg font-semibold text-gray-800">
            {formClass?.name || "Not Assigned"}
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Your designated Form Master class
          </p>
        </div>
      </div>

      {/* Attendance permissions */}
      <section className="rounded-card border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-800">Attendance Access</h2>
          <p className="mt-1 text-xs text-gray-400">
            Attendance permissions depend on your class role.
          </p>
        </div>

        <div className="p-5">
          {canTakeAttendance ? (
            <>
              <p className="text-sm text-gray-600">
                You can take attendance for:
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {attendanceClasses.map((classRoom) => (
                  <span
                    key={classRoom.id}
                    className="inline-flex items-center rounded-full border border-brand/10 bg-brand/5 px-3 py-1.5 text-sm text-gray-700"
                  >
                    {classRoom.name}
                    {classRoom.id === formClassId && (
                      <span className="ml-2 text-xs font-medium text-brand">
                        Form Master
                      </span>
                    )}
                  </span>
                ))}
              </div>

              <Link
                href="/teacher/attendance"
                className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Open Attendance
              </Link>
            </>
          ) : (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-sm font-medium text-gray-700">
                You do not have attendance entry permission.
              </p>
              <p className="mt-1 text-xs text-gray-500">
                For JSS1 to SS3, only the Form Master can take attendance.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Assigned classes */}
      <section className="rounded-card border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-800">My Classes</h2>
          <p className="mt-1 text-xs text-gray-400">
            Only classes assigned to your account are shown.
          </p>
        </div>

        <div className="p-5">
          {myClasses.length === 0 ? (
            <p className="text-sm text-gray-400">
              No classes have been assigned to you yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {myClasses.map((classRoom) => {
                const isFormClass = classRoom.id === formClassId;

                return (
                  <div
                    key={classRoom.id}
                    className={`rounded-lg border p-4 ${
                      isFormClass
                        ? "border-brand/20 bg-brand/5"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-800">
                          {classRoom.name}
                        </p>
                        {isFormClass && (
                          <p className="mt-1 text-xs font-medium text-brand">
                            Form Master
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/teacher/results?classId=${encodeURIComponent(classRoom.id)}`}
                        className="text-xs text-brand hover:underline"
                      >
                        Results
                      </Link>
                    </div>

                    {isFormClass && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <Link
                          href="/teacher/students/new"
                          className="inline-flex text-xs font-medium text-brand hover:underline"
                        >
                          + Register Student
                        </Link>
                        <Link
                          href="/teacher/results/report-cards"
                          className="inline-flex text-xs font-medium text-brand hover:underline"
                        >
                          Generate Report Cards
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Assigned subjects */}
      <section className="rounded-card border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-800">My Subjects</h2>
          <p className="mt-1 text-xs text-gray-400">
            Subjects assigned to your account.
          </p>
        </div>

        <div className="p-5">
          {mySubjects.length === 0 ? (
            <p className="text-sm text-gray-400">
              No subjects have been assigned to you yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {mySubjects.map((subject) => (
                <span
                  key={subject.id}
                  className="inline-flex items-center rounded-full border border-brand/10 bg-brand/5 px-3 py-1.5 text-sm text-gray-700"
                >
                  {subject.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section>
        <h2 className="mb-3 font-semibold text-gray-800">Quick Actions</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/teacher/results"
            className="rounded-card border border-gray-100 bg-white p-5 shadow-sm transition hover:border-brand/20 hover:shadow-md"
          >
            <h3 className="font-semibold text-gray-800">Enter Results</h3>
            <p className="mt-1 text-sm text-gray-500">
              Enter results for your assigned subjects and classes.
            </p>
          </Link>

          {isFormMaster && (
            <>
              <Link
                href="/teacher/students/new"
                className="rounded-card border border-gray-100 bg-white p-5 shadow-sm transition hover:border-brand/20 hover:shadow-md"
              >
                <h3 className="font-semibold text-gray-800">Register Student</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add a new student to your Form Master class.
                </p>
              </Link>

              <Link
                href="/teacher/results/report-cards"
                className="rounded-card border border-gray-100 bg-white p-5 shadow-sm transition hover:border-brand/20 hover:shadow-md"
              >
                <h3 className="font-semibold text-gray-800">Generate Report Cards</h3>
                <p className="mt-1 text-sm text-gray-500">
                  View, print, or save report cards for students in your assigned class.
                </p>
              </Link>
            </>
          )}

          {canTakeAttendance ? (
            <Link
              href="/teacher/attendance"
              className="rounded-card border border-gray-100 bg-white p-5 shadow-sm transition hover:border-brand/20 hover:shadow-md"
            >
              <h3 className="font-semibold text-gray-800">Attendance</h3>
              <p className="mt-1 text-sm text-gray-500">
                Take and manage attendance for your authorized classes.
              </p>
            </Link>
          ) : (
            <div className="rounded-card border border-gray-100 bg-gray-50 p-5">
              <h3 className="font-semibold text-gray-700">Attendance</h3>
              <p className="mt-1 text-sm text-gray-500">
                For JSS1 to SS3, attendance can only be taken by the Form Master.
              </p>
            </div>
          )}

          <Link
            href="/teacher/students"
            className="rounded-card border border-gray-100 bg-white p-5 shadow-sm transition hover:border-brand/20 hover:shadow-md"
          >
            <h3 className="font-semibold text-gray-800">My Students</h3>
            <p className="mt-1 text-sm text-gray-500">
              View students in your assigned classes.
            </p>
          </Link>
        </div>
      </section>

      {/* Assignment summary */}
      <section className="rounded-card border border-gray-100 bg-gray-50 p-5">
        <h2 className="font-semibold text-gray-800">
          Your Teaching Assignment
        </h2>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <span className="text-gray-500 sm:w-40">Classes:</span>
            <span className="text-gray-700">
              {myClasses.length > 0
                ? myClasses.map((classRoom) => classRoom.name).join(", ")
                : "None assigned"}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <span className="text-gray-500 sm:w-40">Subjects:</span>
            <span className="text-gray-700">
              {mySubjects.length > 0
                ? mySubjects.map((subject) => subject.name).join(", ")
                : "None assigned"}
            </span>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <span className="text-gray-500 sm:w-40">Form Master:</span>
            <span className="text-gray-700">
              {formClass?.name || "Not assigned"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
