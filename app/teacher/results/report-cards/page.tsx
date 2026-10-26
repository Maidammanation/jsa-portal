
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
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
  hospitality: string;
  punctuality: string;
  participation: string;
  creativity: string;
  neatness: string;
  dedication: string;
  physicalHealth: string;
};

const emptyBehaviour: Behaviour = {
  conduct: "",
  hospitality: "",
  punctuality: "",
  participation: "",
  creativity: "",
  neatness: "",
  dedication: "",
  physicalHealth: "",
};

const normalize = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function gradeRemark(grade?: string): string {
  switch (grade) {
    case "A": return "Excellent";
    case "B": return "Very Good";
    case "C": return "Good";
    case "D": return "Pass";
    case "E": return "Pass";
    case "F": return "Fail";
    default: return "—";
  }
}

function generateGeneralComment(average: number, count: number): string {
  if (!count) return "No academic results have been recorded for this student.";
  if (average >= 80) return "Excellent performance! Continue striving for excellence.";
  if (average >= 70) return "Very good overall performance. Keep working hard.";
  if (average >= 60) return "Very good result, keep pushing and all the hard work will pay up!";
  if (average >= 50) return "Good performance. Encouraging progress.";
  if (average >= 40) return "Fair performance. More consistent study required.";
  return "Requires significant improvement and regular study.";
}

export default function FormMasterReportCardsPage() {
  const { profile, loading: authLoading } = useAuth();
  const { session, term } = useSchoolSettings();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [results, setResults] = useState<ResultEntry[]>([]);
  const [behaviour, setBehaviour] = useState<Behaviour>(emptyBehaviour);
  const [nextTermDate, setNextTermDate] = useState("To be announced");
  const [signatureDate, setSignatureDate] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState("");

  // Load the signed-in teacher's assigned class only.
  useEffect(() => {
    if (authLoading) return;

    if (!profile?.uid || profile.role !== "teacher") {
      setError("Please sign in with an authorised teacher account.");
      setPageLoading(false);
      return;
    }

    let active = true;
    setPageLoading(true);

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

        const teacher = teacherData as TeacherRecord;
        const allClasses = (classData || []) as ClassRoom[];
        const assignedIdentifier =
          teacher.formClassId ||
          teacher.formMasterClassId ||
          teacher.formMasterClassName ||
          "";

        const assignedClass = allClasses.find(
          (item) =>
            normalize(item.id) === normalize(assignedIdentifier) ||
            normalize(item.name) === normalize(assignedIdentifier)
        );

        if (!assignedClass) {
          setError(
            "No valid Form Master class is assigned to your account. Please contact the administrator."
          );
          return;
        }

        setClasses(allClasses);
        setSubjects((subjectData || []) as Subject[]);
        setClassId(assignedClass.id);
        setError("");
      })
      .catch(() => {
        if (active) setError("Could not load your report-card data.");
      })
      .finally(() => {
        if (active) setPageLoading(false);
      });

    return () => {
      active = false;
    };
  }, [profile?.uid, profile?.role, authLoading]);

  // Fetch only students in the assigned class.
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setStudentId("");
      setResults([]);
      return;
    }

    let active = true;
    setStudents([]);
    setStudentId("");
    setResults([]);
    setBehaviour(emptyBehaviour);

    getStudentsByClass(classId)
      .then((data) => {
        if (active) setStudents((data || []) as Student[]);
      })
      .catch(() => {
        if (active) setError("Could not load students in your assigned class.");
      });

    return () => {
      active = false;
    };
  }, [classId]);

  // Load the selected student's results for the current term and session.
  useEffect(() => {
    if (!studentId) {
      setResults([]);
      setResultsLoading(false);
      return;
    }

    let active = true;
    setResultsLoading(true);
    setResults([]);

    getResultsForStudent(studentId, term, session)
      .then((data) => {
        if (active) setResults((data || []) as ResultEntry[]);
      })
      .catch(() => {
        if (active) setError("Could not load this student's results.");
      })
      .finally(() => {
        if (active) setResultsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [studentId, term, session]);

  const student = students.find((item) => item.id === studentId);
  const classroom = classes.find((item) => item.id === classId);

  const mainSubjects = useMemo(() => {
    return results
      .map((result) => ({
        result,
        subject: subjects.find((item) => item.id === result.subjectId),
      }))
      .filter(
        ({ subject }) =>
          Boolean(subject) &&
          subject?.section !== "arabic" &&
          subject?.scoringType !== "arabic-40-60"
      );
  }, [results, subjects]);

  const arabicSubjects = useMemo(() => {
    if (!student?.attendsArabic) return [];

    return results
      .map((result) => ({
        result,
        subject: subjects.find((item) => item.id === result.subjectId),
      }))
      .filter(
        ({ subject }) =>
          Boolean(subject) &&
          (subject?.section === "arabic" ||
            subject?.scoringType === "arabic-40-60")
      );
  }, [results, subjects, student]);

  const mainTotal = mainSubjects.reduce(
    (sum, item) => sum + safeNumber(item.result.total),
    0
  );

  const mainAverage = mainSubjects.length
    ? mainTotal / mainSubjects.length
    : 0;

  const arabicTotal = arabicSubjects.reduce(
    (sum, item) => sum + safeNumber(item.result.total),
    0
  );

  const arabicAverage = arabicSubjects.length
    ? arabicTotal / arabicSubjects.length
    : 0;

  const overallTotal = mainTotal + arabicTotal;
  const overallCount = mainSubjects.length + arabicSubjects.length;
  const overallAverage = overallCount
    ? overallTotal / overallCount
    : 0;

  const generalComment = generateGeneralComment(
    overallAverage,
    overallCount
  );

  function updateBehaviour(field: keyof Behaviour, value: string) {
    if (value !== "" && !/^[1-5]$/.test(value)) return;
    setBehaviour((previous) => ({ ...previous, [field]: value }));
  }

  if (authLoading || pageLoading) {
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
    <>
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 6mm;
        }

        .report-card-font {
          font-family: "Times New Roman", Times, serif;
        }

        @media print {
          html,
          body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          .a4-report-wrapper,
          .a4-report-wrapper * {
            visibility: visible;
          }

          .a4-report-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 2mm !important;
            box-sizing: border-box !important;
          }

          .print-controls,
          .print-button {
            display: none !important;
          }
        }
      `}</style>

      <main className="mx-auto max-w-5xl space-y-4 report-card-font">
        <section className="print-controls print:hidden rounded-xl border bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold">Generate Report Cards</h1>
          <p className="mt-1 text-sm text-gray-600">
            Assigned class: {classroom?.name || "Not assigned"}
          </p>
          <p className="text-sm text-gray-600">
            {term} · {session}
          </p>

          <div className="mt-4">
            <SelectInput
              label="Select student"
              value={studentId}
              onChange={(event) => {
                setStudentId(event.target.value);
                setBehaviour(emptyBehaviour);
              }}
              options={[
                { label: "Select a student", value: "" },
                ...students.map((item) => ({
                  label: `${item.firstName} ${item.lastName}`,
                  value: item.id,
                })),
              ]}
            />
          </div>

          <p className="mt-2 text-xs text-gray-500">
            Only students from your assigned class are listed.
          </p>
          <Link className="mt-3 inline-block underline" href="/teacher">
            Return to teacher dashboard
          </Link>
        </section>

        {resultsLoading && (
          <p className="print:hidden text-sm text-gray-500">
            Loading student results...
          </p>
        )}

        {student && !resultsLoading && (
          <div className="a4-report-wrapper w-full">
            <div className="box-border w-full border-[3px] border-gray-800 bg-white p-[1.5mm] text-black">
              <div className="relative border border-gray-800 p-1">
                {/* School heading and branding */}
                <header className="pt-1 text-center">
                  <h1 className="font-serif text-[21px] font-extrabold uppercase leading-none tracking-wider">
                    {SCHOOL.name || "JIDDA STANDARD ACADEMY"}
                  </h1>

                  <div className="mx-1 mt-1 bg-gray-600 px-2 py-[1px] text-[8.5px] font-semibold text-white">
                    Main Campus: No. 5 Hayin Dogo Anguwan Rafi Danmagaji, Zaria
                  </div>
                  <div className="mx-1 mt-0.5 bg-gray-600 px-2 py-[1px] text-[8px] font-semibold text-white">
                    Annex: No. 5 Aminu Mai Kai Close, Behind Baba Kaduna Garage, Gaskiya Road, Zaria
                  </div>

                  <div className="relative mt-1 px-10">
                    <div className="absolute left-1 top-0 h-10 w-10">
                      <Image
                        src={SCHOOL.logoPath}
                        alt="School logo"
                        fill
                        className="object-contain"
                      />
                    </div>

                    <p className="text-[10px] font-semibold italic">
                      Motto: Knowledge is Light
                    </p>
                    <p className="text-[9px] font-bold">
                      Phone Numbers: 08121414008, 08069121401
                    </p>
                    <p className="mx-auto mt-0.5 w-3/5 bg-gray-400 py-[0.5px] text-[8.5px] font-bold text-white">
                      Email:

                    <div className="absolute right-1 top-0 h-10 w-10">
                      <Image
                        src={SCHOOL.logoPath}
                        alt="School logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>

                  <div className="mt-1 border-y border-gray-800 py-0.5">
                    <p className="text-[11px] font-bold italic tracking-wide">
                      End of Term Examination Report Sheet
                    </p>
                  </div>
                </header>

                {/* Student details */}
                <section>
                  <div className="border-b border-gray-800 bg-gray-300 py-[1px] text-center text-[9.5px] font-bold italic">
                    Student Information
                  </div>
                  <table className="w-full border-collapse text-[9.5px]">
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="w-16 border-r border-gray-800 p-0.5 font-bold">
                          Name:
                        </td>
                        <td className="border-r border-gray-800 p-0.5 text-center font-bold uppercase">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="w-16 border-r border-gray-800 p-0.5 font-bold">
                          Class:
                        </td>
                        <td className="p-0.5 text-center font-bold uppercase">
                          {classroom?.name || student.className || ""}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="border-r border-gray-800 p-0.5 font-bold">
                          Session:
                        </td>
                        <td className="border-r border-gray-800 p-0.5 text-center font-bold">
                          {session}
                        </td>
                        <td className="border-r border-gray-800 p-0.5 font-bold">
                          Number in Class:
                        </td>
                        <td className="border-r border-gray-800 p-0.5 text-center font-bold">
                          {students.length}
                        </td>
                        <td className="border-r border-gray-800 p-0.5 font-bold">
                          Term:
                        </td>
                        <td className="p-0.5 text-center font-bold uppercase">
                          {term}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                {/* Main subjects: CA 20 + CA 20 + Exam 60 */}
                <section>
                  <div className="border-y border-gray-800 bg-gray-300 py-[1px] text-center text-[9.5px] font-bold uppercase">
                    Student Academic Performance
                  </div>
                  <table className="w-full border-collapse text-[9.5px]">
                    <thead>
                      <tr className="border-b border-gray-800 font-bold italic">
                        <th className="border-r border-gray-800 p-0.5">S/N</th>
                        <th className="border-r border-gray-800 p-0.5 text-left">
                          SUBJECTS
                        </th>
                        <th className="border-r border-gray-800 p-0.5">1ST CA (20)</th>
                        <th className="border-r border-gray-800 p-0.5">2ND CA (20)</th>
                        <th className="border-r border-gray-800 p-0.5">EXAM (60)</th>
                        <th className="border-r border-gray-800 p-0.5">TOTAL</th>
                        <th className="border-r border-gray-800 p-0.5">GRADE</th>
                        <th className="p-0.5">REMARK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mainSubjects.map((item, index) => (
                        <tr key={item.result.subjectId} className="border-b border-gray-800">
                          <td className="border-r border-gray-800 p-0.5 text-center">
                            {index + 1}
                          </td>
                          <td className="border-r border-gray-800 p-0.5 font-semibold">
                            {item.subject?.name}
                          </td>
                          <td className="border-r border-gray-800 p-0.5 text-center">
                            {item.result.ca1 ?? "—"}
                          </td>
                          <td className="border-r border-gray-800 p-0.5 text-center">
                            {item.result.ca2 ?? "—"}
                          </td>
                          <td className="border-r border-gray-800 p-0.5 text-center">
                            {item.result.exam ?? "—"}
                          </td>
                          <td className="border-r border-gray-800 p-0.5 text-center font-bold">
                            {item.result.total ?? "—"}
                          </td>
                          <td className="border-r border-gray-800 p-0.5 text-center font-bold">
                            {item.result.grade ?? "—"}
                          </td>
                          <td className="p-0.5 text-center italic">
                            {item.result.remark || gradeRemark(item.result.grade)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-b border-gray-800 font-bold">
                        <td colSpan={2} className="border-r border-gray-800 p-0.5 text-right">
                          TOTAL:
                        </td>
                        <td colSpan={3} className="border-r border-gray-800 p-0.5 text-center">
                          {mainTotal}
                        </td>
                        <td colSpan={2} className="border-r border-gray-800 p-0.5 text-right">
                          AVERAGE:
                        </td>
                        <td className="p-0.5 text-center">
                          {mainAverage.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </section>

                {/* Arabic subjects: CA 40 + Exam 60 */}
                {student.attendsArabic && (
                  <section>
                    <div className="border-y border-gray-800 bg-gray-300 py-[1px] text-center text-[9.5px] font-bold uppercase">
                      Student Academic Performance (Arabic Section)
                    </div>
                    <table className="w-full border-collapse text-[9.5px]">
                      <thead>
                        <tr className="border-b border-gray-800 font-bold italic">
                          <th className="border-r border-gray-800 p-0.5">S/N</th>
                          <th className="border-r border-gray-800 p-0.5">SUBJECTS</th>
                          <th className="border-r border-gray-800 p-0.5">CA (40)</th>
                          <th className="border-r border-gray-800 p-0.5">EXAM (60)</th>
                          <th className="border-r border-gray-800 p-0.5">TOTAL</th>
                          <th className="border-r border-gray-800 p-0.5">GRADE</th>
                          <th className="p-0.5">REMARK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {arabicSubjects.map((item, index) => (
                          <tr key={item.result.subjectId} className="border-b border-gray-800">
                            <td className="border-r border-gray-800 p-0.5 text-center">
                              {index + 1}
                            </td>
                            <td className="border-r border-gray-800 p-0.5 font-semibold">
                              {item.subject?.name}
                            </td>
                            <td className="border-r border-gray-800 p-0.5 text-center">
                              {item.result.ca1 ?? "—"}
                            </td>
                            <td className="border-r border-gray-800 p-0.5 text-center">
                              {item.result.exam ?? "—"}
                            </td>
                            <td className="border-r border-gray-800 p-0.5 text-center font-bold">
                              {item.result.total ?? "—"}
                            </td>
                            <td className="border-r border-gray-800 p-0.5 text-center font-bold">
                              {item.result.grade ?? "—"}
                            </td>
                            <td className="p-0.5 text-center italic">
                              {item.result.remark || gradeRemark(item.result.grade)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-b border-gray-800 font-bold">
                          <td colSpan={2} className="border-r border-gray-800 p-0.5 text-right">
                            TOTAL:
                          </td>
                          <td colSpan={2} className="border-r border-gray-800 p-0.5 text-center">
                            {arabicTotal}
                          </td>
                          <td colSpan={2} className="border-r border-gray-800 p-0.5 text-right">
                            AVERAGE:
                          </td>
                          <td className="p-0.5 text-center">
                            {arabicAverage.toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </section>
                )}

                {/* Overall totals */}
                <section className="border-b border-gray-800 text-[9.5px] font-bold uppercase">
                  <div className="grid grid-cols-2 text-center">
                    <div className="border-r border-gray-800 p-0.5">
                      Overall Total: {overallTotal}
                    </div>
                    <div className="p-0.5">
                      Overall Average: {overallAverage.toFixed(2)}%
                    </div>
                  </div>
                </section>

                {/* Behavioural assessment */}
                <section>
                  <div className="border-b border-gray-800 bg-gray-300 py-[1px] text-center text-[9.5px] font-bold italic">
                    Behavioural Assessment (1–5)
                  </div>
                  <div className="grid grid-cols-4 border-b border-gray-800 text-[9.5px]">
                    {(
                      [
                        ["conduct", "Conduct"],
                        ["hospitality", "Hospitality"],
                        ["punctuality", "Punctuality"],
                        ["participation", "Participation in Class"],
                        ["creativity", "Creativity"],
                        ["neatness", "Neatness"],
                        ["dedication", "Dedication"],
                        ["physicalHealth", "Physical Health"],
                      ] as [keyof Behaviour, string][]
                    ).map(([field, label]) => (
                      <div
                        key={field}
                        className="flex items-center justify-between border-r border-b border-gray-800 p-1"
                      >
                        <span className="italic">{label}</span>
                        <input
                          aria-label={label}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={behaviour[field]}
                          onChange={(event) =>
                            updateBehaviour(field, event.target.value)
                          }
                          className="print:hidden h-4 w-5 border border-gray-400 text-center font-bold"
                        />
                        <span className="hidden print:inline font-bold">
                          {behaviour[field] || "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Guide and comment */}
                <section className="grid grid-cols-3 border-b border-gray-800 text-[9.5px]">
                  <div className="border-r border-gray-800 p-1 italic">
                    <p className="text-center font-bold underline">GUIDE</p>
                    <div className="mt-1 grid grid-cols-2 text-[8.5px]">
                      <div>
                        <p>5 - Excellent</p>
                        <p>4 - Very Good</p>
                        <p>3 - Good</p>
                      </div>
                      <div>
                        <p>2 - Fair</p>
                        <p>1 - Weak</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 p-1 text-center">
                    <p className="font-bold italic">General Comment:</p>
                    <p className="mt-1 font-semibold italic">{generalComment}</p>
                  </div>
                </section>

                {/* Next term date */}
                <section className="flex flex-wrap items-center justify-center gap-2 border-b border-gray-800 p-1 text-center text-[9.5px] font-bold italic">
                  <span>Next term begins on:</span>
                  <input
                    value={nextTermDate}
                    onChange={(event) => setNextTermDate(event.target.value)}
                    className="print:hidden w-40 border border-gray-400 px-1 text-center"
                  />
                  <span className="hidden print:inline underline">
                    {nextTermDate}
                  </span>
                </section>

                {/* Signatures and official stamp */}
                <section className="relative grid min-h-[85px] grid-cols-2 text-center text-[9.5px] font-bold italic">
                  <div className="relative flex flex-col justify-between border-r border-gray-800 p-1">
                    <div>
                      <p>Director&apos;s</p>
                      <p>Signature and Date</p>
                    </div>
                    <div className="relative z-10 mt-3 border-t border-gray-500 pt-1 text-[8.5px]">
                      <input
                        value={signatureDate}
                        onChange={(event) => setSignatureDate(event.target.value)}
                        className="print:hidden w-full border border-gray-400 text-center"
                        placeholder="Enter date"
                      />
                      <span className="hidden print:inline">{signatureDate}</span>
                    </div>
                  </div>
                  <div className="relative flex flex-col justify-between p-1">
                    <div>
                      <p>Headmaster&apos;s/Headmistress</p>
                      <p>Signature and Date</p>
                    </div>
                    <div className="relative z-10 mt-3 border-t border-gray-500 pt-1 text-[8.5px]">
                      <input
                        value={signatureDate}
                        onChange={(event) => setSignatureDate(event.target.value)}
                        className="print:hidden w-full border border-gray-400 text-center"
                        placeholder="Enter date"
                      />
                      <span className="hidden print:inline">{signatureDate}</span>
                    </div>
                    <div className="pointer-events-none absolute left-1/2 top-[44px] z-20 h-36 w-36 -translate-x-1/2 -translate-y-1/2 opacity-90">
                      <Image
                        src={SCHOOL.stampPath}
                        alt="Official school stamp"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <p className="mt-0.5 text-[7px] font-semibold italic text-gray-700">
                Designed by Maidammanation tech company 08032191668 / 08117106867
              </p>
            </div>

            <div className="print:hidden flex justify-end p-4">
              <Button onClick={() => window.print()}>
                Print / Save as PDF
              </Button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
