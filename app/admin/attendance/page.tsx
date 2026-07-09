"use client";

import { useEffect, useState } from "react";
import { SelectInput, TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getClasses,
  getStudentsByClass,
  getAttendanceSession,
  submitAttendance,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
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
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
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
      return;
    }
    setLoadingStudents(true);
    setMessage("");

    Promise.all([getStudentsByClass(classId), getAttendanceSession(classId, date)])
      .then(([studentList, existingSession]) => {
        const list = studentList as Student[];
        setStudents(list);

        const initialMarks: Record<string, AttendanceStatus> = {};
        const existing = existingSession as { records?: { studentId: string; status: AttendanceStatus }[] } | null;
        list.forEach((s) => {
          const prior = existing?.records?.find((r) => r.studentId === s.id);
          initialMarks[s.id] = prior?.status || "present";
        });
        setMarks(initialMarks);
        if (existing) setMessage("Attendance already recorded for this date — editing will overwrite it.");
      })
      .finally(() => setLoadingStudents(false));
  }, [classId, date]);

  const setMark = (studentId: string, status: AttendanceStatus) => {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s) => (next[s.id] = status));
    setMarks(next);
  };

  const handleSubmit = async () => {
    if (!classId || students.length === 0) return;
    setSaving(true);
    setMessage("");
    try {
      const records = students.map((s) => ({ studentId: s.id, status: marks[s.id] || "present" }));
      await submitAttendance(classId, date, records, profile?.name || profile?.email || "admin");
      setMessage("Attendance submitted successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not submit attendance.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Take Attendance</h1>

      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <SelectInput
          label="Class"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          options={[
            { label: "Select a class", value: "" },
            ...classes.map((c) => ({ label: c.name, value: c.id })),
          ]}
        />
        <TextInput label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {message && (
        <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">{message}</p>
      )}

      {loadingStudents ? (
        <p className="text-sm text-gray-400">Loading students...</p>
      ) : students.length > 0 ? (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-600">{students.length} student(s)</p>
            <div className="flex gap-2">
              <button onClick={() => markAll("present")} className="text-xs text-status-active hover:underline">
                Mark all present
              </button>
              <button onClick={() => markAll("absent")} className="text-xs text-status-disabled hover:underline">
                Mark all absent
              </button>
            </div>
          </div>
          <ul className="divide-y divide-gray-100">
            {students.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-gray-700">
                  {s.firstName} {s.lastName}{" "}
                  <span className="text-gray-400">({s.admissionNo})</span>
                </span>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMark(s.id, opt.value)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        marks[s.id] === opt.value
                          ? statusStyle[opt.value]
                          : "border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-gray-100">
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Submitting..." : "Submit Attendance"}
            </Button>
          </div>
        </div>
      ) : classId ? (
        <p className="text-sm text-gray-400">No students found in this class.</p>
      ) : null}
    </div>
  );
}
