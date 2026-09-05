"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getTeacherByAuthUid,
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

  classIds?: string[];
  subjectIds?: string[];

  formClassId?: string | null;

  // Supported for compatibility with the admin teacher form.
  formMasterClassId?: string | null;
  formMasterClassName?: string;
}

export default function TeacherDashboardPage() {
  const { profile } = useAuth();

  const [teacher, setTeacher] =
    useState<TeacherRecord | null>(null);

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile?.uid) return;

    let mounted = true;

    setLoading(true);
    setError("");

    Promise.all([
      getTeacherByAuthUid(profile.uid),
      getClasses(),
      getSubjects(),
    ])
      .then(([teacherRecord, classList, subjectList]) => {
        if (!mounted) return;

        setTeacher(
          teacherRecord as TeacherRecord | null
        );

        setClasses(classList as ClassRoom[]);
        setSubjects(subjectList as Subject[]);
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
        if (mounted) {
          setLoading(false);
        }
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
          <p className="text-sm text-status-disabled">
            {error}
          </p>
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

        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-600">
            Your account is not linked to a teacher record.
          </p>

          <p className="text-sm text-gray-400 mt-1">
            Please contact the school administrator.
          </p>
        </div>
      </div>
    );
  }

  /*
   * Only show classes assigned to this teacher.
   */
  const myClasses = classes.filter((classRoom) =>
    teacher.classIds?.includes(classRoom.id)
  );

  /*
   * Only show subjects assigned to this teacher.
   */
  const mySubjects = subjects.filter((subject) =>
    teacher.subjectIds?.includes(subject.id)
  );

  /*
   * Resolve Form Master class.
   *
   * formClassId is the primary field.
   * formMasterClassId is supported as a fallback.
   */
  const formClassId =
    teacher.formClassId ||
    teacher.formMasterClassId ||
    "";

  const formClass = classes.find(
    (classRoom) => classRoom.id === formClassId
  );

  const teacherName =
    `${teacher.firstName || ""} ${
      teacher.lastName || ""
    }`.trim() ||
    profile?.name ||
    "Teacher";

  const isFormMaster = Boolean(formClass);

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Welcome, {teacherName}
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Teacher Dashboard
        </p>
      </div>

      {/* Form Master notice */}
      {isFormMaster && formClass && (
        <div className="bg-brand/5 border border-brand/10 rounded-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide font-medium text-brand">
                Form Master
              </p>

              <h2 className="text-lg font-semibold text-gray-800 mt-1">
                {formClass.name}
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                You are the Form Master of this class and can
                manage its attendance.
              </p>
            </div>

            <Link
              href="/teacher/attendance"
              className="inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
            >
              Take Attendance
            </Link>
          </div>
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Classes */}
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Assigned Classes
            </p>

            <span className="text-2xl font-semibold text-gray-800">
              {myClasses.length}
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Classes you are assigned to teach
          </p>
        </div>

        {/* Subjects */}
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Assigned Subjects
            </p>

            <span className="text-2xl font-semibold text-gray-800">
              {mySubjects.length}
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Subjects you can enter results for
          </p>
        </div>

        {/* Form Master */}
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">
            Form Master
          </p>

          <p className="text-lg font-semibold text-gray-800 mt-1">
            {formClass?.name || "Not Assigned"}
          </p>

          <p className="text-xs text-gray-400 mt-2">
            Your designated Form Master class
          </p>
        </div>
      </div>

      {/* Assigned classes */}
      <section className="bg-white rounded-card border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            My Classes
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            Only classes assigned to your account are shown.
          </p>
        </div>

        <div className="p-5">
          {myClasses.length === 0 ? (
            <p className="text-sm text-gray-400">
              No classes have been assigned to you yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myClasses.map((classRoom) => {
                const isFormClass =
                  classRoom.id === formClassId;

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
                          <p className="text-xs text-brand mt-1 font-medium">
                            Form Master
                          </p>
                        )}
                      </div>

                      <Link
                        href={`/teacher/results?classId=${classRoom.id}`}
                        className="text-xs text-brand hover:underline"
                      >
                        Results
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Assigned subjects */}
      <section className="bg-white rounded-card border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            My Subjects
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            Only subjects assigned to your account are shown.
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
                  className="inline-flex items-center rounded-full bg-brand/5 border border-brand/10 px-3 py-1.5 text-sm text-gray-700"
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
        <h2 className="font-semibold text-gray-800 mb-3">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Results */}
          <Link
            href="/teacher/results"
            className="bg-white rounded-card border border-gray-100 shadow-sm p-5 hover:border-brand/20 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-gray-800">
              Enter Results
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Enter results for your assigned subjects and
              classes.
            </p>
          </Link>

          {/* Attendance */}
          <Link
            href="/teacher/attendance"
            className="bg-white rounded-card border border-gray-100 shadow-sm p-5 hover:border-brand/20 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-gray-800">
              Attendance
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              Take and manage attendance for your assigned
              classes.
            </p>
          </Link>

          {/* Students */}
          <Link
            href="/teacher/students"
            className="bg-white rounded-card border border-gray-100 shadow-sm p-5 hover:border-brand/20 hover:shadow-md transition"
          >
            <h3 className="font-semibold text-gray-800">
              My Students
            </h3>

            <p className="text-sm text-gray-500 mt-1">
              View students in your assigned classes.
            </p>
          </Link>
        </div>
      </section>

      {/* Assignment summary */}
      <section className="bg-gray-50 rounded-card border border-gray-100 p-5">
        <h2 className="font-semibold text-gray-800">
          Your Teaching Assignment
        </h2>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-gray-500 sm:w-40">
              Classes:
            </span>

            <span className="text-gray-700">
              {myClasses.length > 0
                ? myClasses
                    .map((classRoom) => classRoom.name)
                    .join(", ")
                : "None assigned"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-gray-500 sm:w-40">
              Subjects:
            </span>

            <span className="text-gray-700">
              {mySubjects.length > 0
                ? mySubjects
                    .map((subject) => subject.name)
                    .join(", ")
                : "None assigned"}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
            <span className="text-gray-500 sm:w-40">
              Form Master:
            </span>

            <span className="text-gray-700">
              {formClass?.name || "Not assigned"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}