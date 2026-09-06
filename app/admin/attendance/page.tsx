"use client";

import { useEffect, useState } from "react";
import { SelectInput, TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getClasses,
  getStudentsByClass,
  getAttendanceSession,
} from "@/services/database";
import type { AttendanceStatus, ClassRoom, Student } from "@/lib/types";

const STATUS_OPTIONS: { label: string; value: AttendanceStatus }[] = [
  { label: "Present", value: "present" },
  { label: "Absent", value: "absent" },
  { label: "Late", value: "late" },
];

const statusStyle: Record<AttendanceStatus, string> = {
  present: "bg-status-active/10 text-status-active border-status-active/30",
  absent: "bg-status-disabled/10 text-status-disabled border-status-disabled/30",
  late: "bg-status-suspended/10 text-status-suspended border-status-suspended/30",
};

export default function AttendancePage() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getClasses()
      .then((data) => setClasses(data as ClassRoom[]))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setMarks({});
      return;
    }

    setLoadingStudents(true);
    setMessage("");

    Promise.all([
      getStudentsByClass(classId),
      getAttendanceSession(classId, date),
    ])
      .then(([studentList, existingSession]) => {
        const list = studentList as Student[];
        setStudents(list);

        const initialMarks: Record<string, AttendanceStatus> = {};

        const existing = existingSession as {
          records?: {
            studentId: string;
            status: AttendanceStatus;
          }[];
        } | null;

        list.forEach((student) => {
          const prior = existing?.records?.find(
            (record) => record.studentId === student.id
          );

          initialMarks[student.id] =
            prior?.status || "present";
        });

        setMarks(initialMarks);

        if (existing) {
          setMessage(
            "Attendance already recorded for this date — editing will overwrite it."
          );
        }
      })
      .catch(() => {
        setStudents([]);
        setMarks({});
        setMessage("Could not load attendance data.");
      })
      .finally(() => setLoadingStudents(false));
  }, [classId, date]);

  const setMark = (
    studentId: string,
    status: AttendanceStatus
  ) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};

    students.forEach((student) => {
      next[student.id] = status;
    });

    setMarks(next);
  };

  const handleSubmit = async () => {
    if (!classId || students.length === 0) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const records = students.map((student) => ({
        studentId: student.id,
        status: marks[student.id] || "present",
      }));

      const response = await fetch(
        "/api/admin/submit-attendance",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            date,
            records,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not submit attendance."
        );
      }

      setMessage(
        data.message ||
          "Attendance submitted successfully."
      );
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Could not submit attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">
        Take Attendance
      </h1>

      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <SelectInput
          label="Class"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          options={[
            {
              label: "Select a class",
              value: "",
            },
            ...classes.map((c) => ({
              label: c.name,
              value: c.id,
            })),
          ]}
        />

        <TextInput
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {message && (
        <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">
          {message}
        </p>
      )}

      {loadingStudents ? (
        <p className="text-sm text-gray-400">
          Loading students...
        </p>
      ) : students.length > 0 ? (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-600">
              {students.length} student(s)
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => markAll("present")}
                className="text-xs text-status-active hover:underline"
              >
                Mark all present
              </button>

              <button
                onClick={() => markAll("absent")}
                className="text-xs text-status-disabled hover:underline"
              >
                Mark all absent
              </button>
            </div>
          </div>

          <ul className="divide-y divide-gray-100">
            {students.map((student) => (
              <li
                key={student.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-sm text-gray-700">
                  {student.firstName} {student.lastName}{" "}
                  <span className="text-gray-400">
                    ({student.admissionNo})
                  </span>
                </span>

                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setMark(
                          student.id,
                          option.value
                        )
                      }
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        marks[student.id] === option.value
                          ? statusStyle[option.value]
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          <div className="px-4 py-3 border-t border-gray-100">
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
      ) : classId ? (
        <p className="text-sm text-gray-400">
          No students found in this class.
        </p>
      ) : null}
    </div>
  );
}