"use client";

import { useEffect, useState } from "react";
import { getStudentByAuthUid, getResultsForStudent, getSubjects } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";
import type { ResultEntry, Subject } from "@/lib/types";

interface StudentRecord {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
  className?: string;
  classId: string;
}

export default function StudentResultsPage() {
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    getStudentByAuthUid(profile.uid).then(async (data) => {
      const s = data as StudentRecord | null;
      setStudent(s);
      if (!s) {
        setLoading(false);
        return;
      }
      const [resultList, subjectList] = await Promise.all([
        getResultsForStudent(s.id, term, session),
        getSubjects(),
      ]);
      setResults(resultList as ResultEntry[]);
      setSubjects(subjectList as Subject[]);
      setLoading(false);
    });
  }, [profile?.uid, term, session]);

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name || id;
  const totalScore = results.reduce((sum, r) => sum + (r.total || 0), 0);
  const average = results.length ? Math.round((totalScore / results.length) * 10) / 10 : 0;

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;
  if (!student) return <p className="text-sm text-status-disabled">No student record linked to your account.</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">My Results</h1>
        <p className="text-sm text-gray-500">
          {student.className || student.classId} &middot; {session} &middot; {term}
        </p>
      </div>

      <div className="bg-white rounded-card border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wide">
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">CA1</th>
              <th className="px-4 py-3 font-medium">CA2</th>
              <th className="px-4 py-3 font-medium">Exam</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Grade</th>
              <th className="px-4 py-3 font-medium">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No results recorded yet for this term.
                </td>
              </tr>
            ) : (
              results.map((r) => (
                <tr key={r.subjectId}>
                  <td className="px-4 py-2 text-gray-700">{subjectName(r.subjectId)}</td>
                  <td className="px-4 py-2">{r.ca1 ?? "—"}</td>
                  <td className="px-4 py-2">{r.ca2 ?? "—"}</td>
                  <td className="px-4 py-2">{r.exam ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">{r.total ?? "—"}</td>
                  <td className="px-4 py-2 font-medium">{r.grade ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-500">{r.remark ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {results.length > 0 && (
        <div className="flex gap-8 text-sm bg-white rounded-card border border-gray-100 shadow-sm p-4">
          <p><span className="text-gray-500">Total Score:</span> {totalScore}</p>
          <p><span className="text-gray-500">Average:</span> {average}</p>
        </div>
      )}
    </div>
  );
}