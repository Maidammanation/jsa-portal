"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { getClasses, getStudentsByClass, getResultsForStudent, getSubjects } from "@/services/database";
import { SCHOOL } from "@/settings/config";
import { useSchoolSettings } from "@/lib/useSchoolSettings";
import type { ClassRoom, ResultEntry, Student, Subject } from "@/lib/types";

export default function ReportCardsPage() {
  const { session, term } = useSchoolSettings();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getClasses().then((d) => setClasses(d as ClassRoom[])).catch(() => setClasses([]));
    getSubjects().then((d) => setSubjects(d as Subject[])).catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    getStudentsByClass(classId).then((d) => setStudents(d as Student[]));
  }, [classId]);

  useEffect(() => {
    if (!studentId) {
      setResults([]);
      return;
    }
    setLoading(true);
    getResultsForStudent(studentId, term, session)
      .then((d) => setResults(d as ResultEntry[]))
      .finally(() => setLoading(false));
  }, [studentId, term, session]);

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name || id;
  const student = students.find((s) => s.id === studentId);

  const totalScore = results.reduce((sum, r) => sum + (r.total || 0), 0);
  const average = results.length ? Math.round((totalScore / results.length) * 10) / 10 : 0;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800 print:hidden">Generate Report Card</h1>

      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-4 print:hidden">
        <SelectInput
          label="Class"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setStudentId("");
          }}
          options={[{ label: "Select a class", value: "" }, ...classes.map((c) => ({ label: c.name, value: c.id }))]}
        />
        <SelectInput
          label="Student"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          options={[
            { label: "Select a student", value: "" },
            ...students.map((s) => ({ label: `${s.firstName} ${s.lastName}`, value: s.id })),
          ]}
        />
      </div>

      {loading && <p className="text-sm text-gray-400 print:hidden">Loading results...</p>}

      {student && !loading && (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8 print:shadow-none print:border-none"><div className="flex items-center gap-4 border-b border-gray-100 pb-4 mb-4">
            <div className="w-14 h-14 relative shrink-0">
              <Image src={SCHOOL.logoPath} alt="School logo" fill className="object-contain" />
            </div>
            <div>
              <p className="font-bold text-brand-dark text-lg">{SCHOOL.name}</p>
              <p className="text-sm text-gray-500">
                Report Card — {session} &middot; {term}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-6">
            <p><span className="text-gray-500">Name:</span> {student.firstName} {student.lastName}</p>
            <p><span className="text-gray-500">Admission No:</span> {student.admissionNo}</p>
            <p><span className="text-gray-500">Class:</span> {student.className || student.classId}</p>
            <p><span className="text-gray-500">Gender:</span> {student.gender}</p>
          </div>

          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 uppercase text-xs tracking-wide">
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">CA1</th>
                <th className="px-3 py-2 font-medium">CA2</th>
                <th className="px-3 py-2 font-medium">Exam</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Grade</th>
                <th className="px-3 py-2 font-medium">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                    No results recorded yet for this term.
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.subjectId}>
                    <td className="px-3 py-2">{subjectName(r.subjectId)}</td>
                    <td className="px-3 py-2">{r.ca1 ?? "—"}</td>
                    <td className="px-3 py-2">{r.ca2 ?? "—"}</td>
                    <td className="px-3 py-2">{r.exam ?? "—"}</td>
                    <td className="px-3 py-2 font-medium">{r.total ?? "—"}</td>
                    <td className="px-3 py-2 font-medium">{r.grade ?? "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{r.remark ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {results.length > 0 && (
            <div className="flex gap-8 text-sm mb-6">
              <p><span className="text-gray-500">Total Score:</span> {totalScore}</p>
              <p><span className="text-gray-500">Average:</span> {average}</p>
            </div>
          )}

          <div className="flex justify-between text-xs text-gray-400 pt-8 mt-8 border-t border-gray-100">
            <span>Class Teacher's Signature: ______________________</span>
            <span>Principal's Signature: ______________________</span>
          </div>

          <div className="print:hidden mt-6">
            <Button onClick={() => window.print()}>Print / Save as PDF</Button>
          </div>
        </div>
      )}
    </div>
  );
}