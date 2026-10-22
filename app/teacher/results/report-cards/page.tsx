
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getTeacherByAuthUid,
  getClasses,
  getStudentsByClass,
  getResultsForStudent,
  getSubjects,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";
import { SCHOOL } from "@/settings/config";
import type {
  ClassRoom,
  ResultEntry,
  Student,
  Subject,
} from "@/lib/types";

type TeacherRecord = {
  formClassId?: string | null;
  formMasterClassId?: string | null;
  formMasterClassName?: string | null;
};

type Behaviour = {
  conduct: string;
  punctuality: string;
  participation: string;
  neatness: string;
  creativity: string;
  dedication: string;
  hospitality: string;
  physicalHealth: string;
};

const emptyBehaviour: Behaviour = {
  conduct: "",
  punctuality: "",
  participation: "",
  neatness: "",
  creativity: "",
  dedication: "",
  hospitality: "",
  physicalHealth: "",
};

const normalize = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const number = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

function grade(total: number) {
  if (total >= 80) return "A";
  if (total >= 70) return "B";
  if (total >= 60) return "C";
  if (total >= 50) return "D";
  if (total >= 40) return "E";
  return "F";
}

function remark(value: string) {
  return ({
    A: "Excellent",
    B: "Very Good",
    C: "Good",
    D: "Pass",
    E: "Pass",
    F: "Fail",
  } as Record<string, string>)[value] || "—";
}

export default function FormMasterReportCardsPage() {
  const { profile, loading: authLoading } = useAuth();
  const { session, term } = useSchoolSettings();

  const [teacher, setTeacher] = useState<TeacherRecord | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [behaviour, setBehaviour] =
    useState<Behaviour>(emptyBehaviour);
  const [nextTermDate, setNextTermDate] =
    useState("To be announced");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!profile?.uid || profile.role !== "teacher") {
      setError("Please sign in with an authorised teacher account.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    Promise.all([
      getTeacherByAuthUid(profile.uid),
      getClasses(),
      getSubjects(),
    ])
      .then(([teacherData, classData, subjectData]) => {
        if (!active) return;

        if (!teacherData) {
          setError("Your teacher record was not found.");
          return;
        }

        const record = teacherData as TeacherRecord;
        const classList = (classData || []) as ClassRoom[];

        const identifier =
          record.formClassId ||
          record.formMasterClassId ||
          record.formMasterClassName ||
          "";

        const assignedClass = classList.find(
          (item) =>
            normalize(item.id) === normalize(identifier) ||
            normalize(item.name) === normalize(identifier)
        );

        if (!assignedClass) {
          setError(
            "You do not have a valid Form Master class assigned. Contact the school administrator."
          );
          return;
        }

        setTeacher(record);
        setClasses(classList);
        setSubjects((subjectData || []) as Subject[]);
        setClassId(assignedClass.id);
        setError("");
      })
      .catch(() => {
        if (active) setError("Could not load your report-card data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profile?.uid, profile?.role, authLoading]);

  useEffect(() => {
    if (!classId) return;

    let active = true;
    setStudents([]);
    setStudentId("");
    setResults([]);

    getStudentsByClass(classId)
      .then((data) => {
        if (active) setStudents((data || []) as Student[]);
      })
      .catch(() => {
        if (active) setError("Could not load students for your class.");
      });

    return () => {
      active = false;
    };
  }, [classId]);

  useEffect(() => {
    if (!studentId) {
      setResults([]);
      return;
    }

    let active = true;
    setResults([]);

    getResultsForStudent(studentId, term, session)
      .then((data) => {
        if (active) setResults((data || []) as ResultEntry[]);
      })
      .catch(() => {
        if (active) setError("Could not load this student's results.");
      });

    return () => {
      active = false;
    };
  }, [studentId, term, session]);

  const student = students.find((item) => item.id === studentId);
  const classroom = classes.find((item) => item.id === classId);

  const subjectResults = useMemo(() => {
    return results.map((result) => ({
      result,
      subject: subjects.find(
        (item) => item.id === result.subjectId
      ),
    })).filter((item) => Boolean(item.subject));
  }, [results, subjects]);

  const mainResults = subjectResults.filter(
    ({ subject }) =>
      subject?.section !== "arabic" &&
      subject?.scoringType !== "arabic-40-60"
  );

  const arabicResults = subjectResults.filter(
    ({ subject }) =>
      subject?.section === "arabic" ||
      subject?.scoringType === "arabic-40-60"
  );

  const mainTotal = mainResults.reduce(
    (sum, item) => sum + number(item.result.total), 0
  );

  const arabicTotal = arabicResults.reduce(
    (sum, item) => sum + number(item.result.total), 0
  );

  const overallCount = mainResults.length + arabicResults.length;
  const overallTotal = mainTotal + arabicTotal;
  const average = overallCount ? overallTotal / overallCount : 0;

  function updateBehaviour(field: keyof Behaviour, value: string) {
    if (value !== "" && !/^[1-5]$/.test(value)) return;
    setBehaviour((previous) => ({ ...previous, [field]: value }));
  }

  if (loading) {
    return <div className="p-6">Loading your assigned class...</div>;
  }

  if (error) {
    return (
      <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <p>{error}</p>
        <Link className="mt-3 inline-block underline" href="/teacher">
          Return to teacher dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-3 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold">Generate Report Cards</h1>
          <p className="text-sm text-gray-500">
            Assigned class: {classroom?.name}
          </p>
          <p className="text-sm text-gray-500">
            {term} · {session}
          </p>
        </div>
        <Link href="/teacher" className="underline">
          Teacher dashboard
        </Link>
      </div>

      <section className="rounded-xl border bg-white p-4 print:hidden">
        <label htmlFor="student" className="mb-2 block font-medium">
          Select student
        </label>
        <select
          id="student"
          className="w-full rounded-lg border p-3"
          value={studentId}
          onChange={(event) => {
            setStudentId(event.target.value);
            setBehaviour(emptyBehaviour);
          }}
        >
          <option value="">Choose a student</option>
          {students.map((item) => (
            <option key={item.id} value={item.id}>
              {item.firstName} {item.lastName}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-gray-500">
          Only students loaded from your assigned class are listed.
        </p>
      </section>

      {student && (
        <section className="report-sheet border-2 border-gray-800 bg-white p-4 text-black sm:p-6">
          <style jsx global>{`
            @page { size: A4 portrait; margin: 10mm; }
            @media print {
              body * { visibility: hidden; }
              .report-sheet, .report-sheet * { visibility: visible; }
              .report-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                border: 2px solid #222;
                box-sizing: border-box;
              }
              .print-hidden { display: none !important; }
            }
          `}</style>

          <header className="mb-4 border-b-2 border-gray-800 pb-3 text-center">
            <h2 className="text-xl font-extrabold uppercase">
              JIDDA STANDARD ACADEMY
            </h2>
            <p className="text-sm">Knowledge is Light</p>
            <p className="mt-2 text-sm font-bold">
              END OF TERM EXAMINATION REPORT
            </p>
          </header>

          <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
            <p><b>Student:</b> {student.firstName} {student.lastName}</p>
            <p><b>Class:</b> {classroom?.name}</p>
            <p><b>Session:</b> {session}</p>
            <p><b>Term:</b> {term}</p>
            <p><b>Students in class:</b> {students.length}</p>
          </div>

          <h3 className="mb-2 border-y bg-gray-100 p-2 text-center font-bold">
            ACADEMIC PERFORMANCE
          </h3>

          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr>
                {["Subject", "CA 1", "CA 2", "Exam", "Total", "Grade", "Remark"].map((label) => (
                  <th key={label} className="border border-gray-700 p-1">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mainResults.map(({ result, subject }) => (
                <tr key={result.subjectId}>
                  <td className="border border-gray-700 p-1">{subject?.name}</td>
                  <td className="border border-gray-700 p-1 text-center">{result.ca1 ?? "—"}</td>
                  <td className="border border-gray-700 p-1 text-center">{result.ca2 ?? "—"}</td>
                  <td className="border border-gray-700 p-1 text-center">{result.exam ?? "—"}</td>
                  <td className="border border-gray-700 p-1 text-center">{result.total ?? "—"}</td>
                  <td className="border border-gray-700 p-1 text-center">{result.grade || grade(number(result.total))}</td>
                  <td className="border border-gray-700 p-1 text-center">{result.remark || remark(result.grade || grade(number(result.total)))}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={4} className="border border-gray-700 p-1 text-right">Main subjects total</td>
                <td className="border border-gray-700 p-1 text-center">{mainTotal}</td>
                <td colSpan={2} className="border border-gray-700 p-1" />
              </tr>
            </tbody>
          </table>

          {Boolean(student.attendsArabic) && (
            <>
              <h3 className="mb-2 mt-4 border-y bg-gray-100 p-2 text-center font-bold">
                ARABIC SECTION — CA (40) + EXAM (60)
              </h3>
              <table className="w-full border-collapse text-xs sm:text-sm">
                <thead>
                  <tr>
                    {["Subject", "CA (40)", "Exam (60)", "Total", "Grade", "Remark"].map((label) => (
                      <th key={label} className="border border-gray-700 p-1">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {arabicResults.map(({ result, subject }) => (
                    <tr key={result.subjectId}>
                      <td className="border border-gray-700 p-1">{subject?.name}</td>
                      <td className="border border-gray-700 p-1 text-center">{result.ca1 ?? "—"}</td>
                      <td className="border border-gray-700 p-1 text-center">{result.exam ?? "—"}</td>
                      <td className="border border-gray-700 p-1 text-center">{result.total ?? "—"}</td>
                      <td className="border border-gray-700 p-1 text-center">{result.grade || grade(number(result.total))}</td>
                      <td className="border border-gray-700 p-1 text-center">{result.remark || remark(result.grade || grade(number(result.total)))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 border-y py-3 text-sm font-bold">
            <p>Overall total: {overallTotal}</p>
            <p>Overall average: {average.toFixed(2)}%</p>
          </div>

          <h3 className="mt-4 border-y bg-gray-100 p-2 text-center font-bold">
            BEHAVIOURAL ASSESSMENT (1–5)
          </h3>
          <div className="grid grid-cols-2 gap-3 py-3 text-sm sm:grid-cols-4">
            {(Object.keys(emptyBehaviour) as (keyof Behaviour)[]).map((field) => (
              <label key={field} className="flex flex-col gap-1 capitalize">
                {field === "physicalHealth" ? "Physical Health" : field}
                <input
                  aria-label={field}
                  className="w-full border p-1 print-hidden"
                  inputMode="numeric"
                  maxLength={1}
                  value={behaviour[field]}
                  onChange={(event) => updateBehaviour(field, event.target.value)}
                />
                <span className="hidden print:block">{behaviour[field] || "—"}</span>
              </label>
            ))}
          </div>

          <div className="mt-3 border-y py-3 text-sm">
            <p>
              <b>General comment:</b>{" "}
              {overallCount === 0
                ? "No academic results have been recorded."
                : average >= 80
                  ? "Excellent performance. Keep striving for excellence."
                  : average >= 70
                    ? "Very good performance. Keep working hard."
                    : average >= 60
                      ? "Good performance. Keep improving."
                      : average >= 50
                        ? "Fair performance. Continue to work hard."
                        : "More consistent study and support are required."}
            </p>
            <label className="mt-3 flex flex-wrap items-center gap-2">
              <b>Next term begins:</b>
              <input
                className="border p-1 print-hidden"
                value={nextTermDate}
                onChange={(event) => setNextTermDate(event.target.value)}
              />
              <span className="hidden print:block">{nextTermDate}</span>
            </label>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
            <p className="border-t border-gray-700 pt-2">Form Master&apos;s signature</p>
            <p className="border-t border-gray-700 pt-2">Director / Head Teacher&apos;s signature</p>
          </div>
          <p className="mt-5 text-center text-xs italic">
            {SCHOOL.name || "Jidda Standard Academy"}
          </p>
        </section>
      )}

      <div className="flex justify-end print:hidden">
        <button
          type="button"
          disabled={!student}
          onClick={() => window.print()}
          className="rounded-lg bg-black px-5 py-3 font-semibold text-white disabled:opacity-40"
        >
          Print / Save as PDF
        </button>
      </div>
    </main>
  );
}
