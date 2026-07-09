"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SelectInput, TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { getClasses, getSubjects, getStudentsByClass, getResultsFor, saveResult } from "@/services/database";
import { computeTotal, computeGrade, computeRemark } from "@/lib/grading";
import { useAuth } from "@/lib/useAuth";
import { SCHOOL } from "@/settings/config";
import type { ClassRoom, ResultEntry, Student, Subject } from "@/lib/types";

type ScoreRow = { ca1: string; ca2: string; exam: string };

export default function ResultsUploadPage() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreRow>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getClasses().then((d) => setClasses(d as ClassRoom[])).catch(() => setClasses([]));
    getSubjects().then((d) => setSubjects(d as Subject[])).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!classId || !subjectId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    setMessage("");

    Promise.all([
      getStudentsByClass(classId),
      getResultsFor(classId, subjectId, SCHOOL.term, SCHOOL.session),
    ])
      .then(([studentList, existingResults]) => {
        const list = studentList as Student[];
        setStudents(list);

        const initial: Record<string, ScoreRow> = {};
        const results = existingResults as ResultEntry[];
        list.forEach((s) => {
          const prior = results.find((r) => r.studentId === s.id);
          initial[s.id] = {
            ca1: prior?.ca1?.toString() || "",
            ca2: prior?.ca2?.toString() || "",
            exam: prior?.exam?.toString() || "",
          };
        });
        setScores(initial);
      })
      .finally(() => setLoading(false));
  }, [classId, subjectId]);

  const setScore = (studentId: string, field: keyof ScoreRow, value: string) => {
    setScores((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  };

  const handleSaveAll = async () => {
    if (!classId || !subjectId) return;
    setSaving(true);
    setMessage("");
    try {
      await Promise.all(
        students.map((s) => {
          const row = scores[s.id] || { ca1: "", ca2: "", exam: "" };
          const ca1 = Number(row.ca1) || 0;
          const ca2 = Number(row.ca2) || 0;
          const exam = Number(row.exam) || 0;
          const total = computeTotal(ca1, ca2, exam);
          const grade = computeGrade(total);
          return saveResult(
            {
              studentId: s.id,
              subjectId,
              classId,
              term: SCHOOL.term,
              session: SCHOOL.session,
              ca1,
              ca2,
              exam,
              total,
              grade,
              remark: computeRemark(grade),
            },
            profile?.name || profile?.email || "admin"
          );
        })
      );
      setMessage("Results saved successfully.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save results.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-800">Upload Results</h1>
        <Link href="/admin/results/report-cards" className="text-sm text-brand hover:underline">
          Generate Report Cards →
        </Link>
      </div>
      <p className="text-sm text-gray-500">
        {SCHOOL.session} &middot; {SCHOOL.term}
      </p>

      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <SelectInput
          label="Class"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          options={[{ label: "Select a class", value: "" }, ...classes.map((c) => ({ label: c.name, value: c.id }))]}
        />
        <SelectInput
          label="Subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          options={[
            { label: "Select a subject", value: "" },
            ...subjects.map((s) => ({ label: s.name, value: s.id })),
          ]}
        />
      </div>

      {message && <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">{message}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Loading students...</p>
      ) : students.length > 0 ? (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wide">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium w-24">CA1 (20)</th>
                <th className="px-4 py-3 font-medium w-24">CA2 (20)</th>
                <th className="px-4 py-3 font-medium w-24">Exam (60)</th>
                <th className="px-4 py-3 font-medium w-20">Total</th>
                <th className="px-4 py-3 font-medium w-16">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => {
                const row = scores[s.id] || { ca1: "", ca2: "", exam: "" };
                const total = computeTotal(Number(row.ca1) || 0, Number(row.ca2) || 0, Number(row.exam) || 0);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-2 text-gray-700">
                      {s.firstName} {s.lastName}
                    </td>
                    {(["ca1", "ca2", "exam"] as const).map((field) => (
                      <td key={field} className="px-4 py-2">
                        <input
                          type="number"
                          min={0}
                          max={field === "exam" ? 60 : 20}
                          value={row[field]}
                          onChange={(e) => setScore(s.id, field, e.target.value)}
                          className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 font-medium text-gray-700">{total}</td>
                    <td className="px-4 py-2 font-medium text-gray-700">{computeGrade(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100">
            <Button onClick={handleSaveAll} disabled={saving}>
              {saving ? "Saving..." : "Save Results"}
            </Button>
          </div>
        </div>
      ) : classId && subjectId ? (
        <p className="text-sm text-gray-400">No students found in this class.</p>
      ) : null}
    </div>
  );
}
