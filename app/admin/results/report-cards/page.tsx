"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";

import {
  getClasses,
  getStudentsByClass,
  getResultsForStudent,
  getSubjects,
} from "@/services/database";

import { SCHOOL } from "@/settings/config";
import { useSchoolSettings } from "@/lib/useSchoolSettings";

import type {
  ClassRoom,
  ResultEntry,
  Student,
  Subject,
} from "@/lib/types";

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

type SubjectResultRow = {
  result: ResultEntry;
  subject?: Subject;
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

const MIN_MAIN_ROWS = 11;
const MIN_ARABIC_ROWS = 4;

function safeNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function gradeRemark(grade?: string): string {
  switch (grade) {
    case "A":
      return "Excellent";
    case "B":
      return "Very Good";
    case "C":
      return "Good";
    case "D":
      return "Fair";
    case "E":
      return "Pass";
    case "F":
      return "Fail";
    default:
      return "—";
  }
}

function generateGeneralComment(
  overallAverage: number,
  hasMainSubjects: boolean,
  hasArabicSubjects: boolean
): string {
  if (!hasMainSubjects && !hasArabicSubjects) {
    return "No academic results have been recorded for this student.";
  }

  if (overallAverage >= 80) {
    return "Outstanding performance. Keep up the excellent work!";
  }

  if (overallAverage >= 70) {
    return "Excellent performance. Continue striving for excellence.";
  }

  if (overallAverage >= 60) {
    return "Very good overall performance. Keep working hard.";
  }

  if (overallAverage >= 50) {
    return "Good performance. Encouraging progress.";
  }

  if (overallAverage >= 40) {
    return "Fair performance. More consistent study is required.";
  }

  return "Requires significant improvement and regular study.";
}

function formatResultValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

export default function ReportCardsPage() {
  const schoolSettings = useSchoolSettings();

  const session = schoolSettings?.session || "2025/2026";
  const term = schoolSettings?.term || "SECOND TERM";

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");

  const [results, setResults] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [behaviour, setBehaviour] =
    useState<Behaviour>(emptyBehaviour);

  /*
   * These values can later be moved into school settings.
   * Keeping them here prevents undefined values from breaking
   * the printed report.
   */
  const nextTermDate = "30th MARCH, 2026";
  const reportDate = "26 February, 2026";

  /*
   * Load classes and subjects.
   */
  useEffect(() => {
    let mounted = true;

    Promise.all([getClasses(), getSubjects()])
      .then(([classData, subjectData]) => {
        if (!mounted) return;

        setClasses((classData || []) as ClassRoom[]);
        setSubjects((subjectData || []) as Subject[]);
      })
      .catch((error) => {
        console.error("Failed to load report-card data:", error);

        if (!mounted) return;

        setClasses([]);
        setSubjects([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Load students whenever class changes.
   */
  useEffect(() => {
    let mounted = true;

    if (!classId) {
      setStudents([]);
      setStudentId("");
      setResults([]);
      setBehaviour(emptyBehaviour);
      return;
    }

    getStudentsByClass(classId)
      .then((data) => {
        if (!mounted) return;

        setStudents((data || []) as Student[]);
      })
      .catch((error) => {
        console.error("Failed to load students:", error);

        if (!mounted) return;

        setStudents([]);
      });

    return () => {
      mounted = false;
    };
  }, [classId]);

  /*
   * Load student's results whenever student/session/term changes.
   */
  useEffect(() => {
    let mounted = true;

    if (!studentId) {
      setResults([]);
      setBehaviour(emptyBehaviour);
      setLoading(false);
      return;
    }

    setLoading(true);

    getResultsForStudent(studentId, term, session)
      .then((data) => {
        if (!mounted) return;

        setResults((data || []) as ResultEntry[]);
      })
      .catch((error) => {
        console.error("Failed to load student results:", error);

        if (!mounted) return;

        setResults([]);
      })
      .finally(() => {
        if (!mounted) return;

        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [studentId, term, session]);

  /*
   * Current student.
   */
  const student = useMemo(
    () => students.find((item) => item.id === studentId),
    [students, studentId]
  );

  /*
   * Current student's class.
   */
  const classRoom = useMemo(
    () => classes.find((item) => item.id === student?.classId),
    [classes, student?.classId]
  );

  /*
   * Main subjects.
   */
  const mainSubjects = useMemo<SubjectResultRow[]>(() => {
    return results
      .map((result) => {
        const subject = subjects.find(
          (item) => item.id === result.subjectId
        );

        return {
          result,
          subject,
        };
      })
      .filter(
        ({ subject }) =>
          Boolean(subject) &&
          subject?.section !== "arabic" &&
          subject?.scoringType !== "arabic-40-60"
      );
  }, [results, subjects]);

  /*
   * Arabic subjects.
   */
  const arabicSubjects = useMemo<SubjectResultRow[]>(() => {
    return results
      .map((result) => {
        const subject = subjects.find(
          (item) => item.id === result.subjectId
        );

        return {
          result,
          subject,
        };
      })
      .filter(
        ({ subject }) =>
          Boolean(subject) &&
          (subject?.section === "arabic" ||
            subject?.scoringType === "arabic-40-60")
      );
  }, [results, subjects]);

  /*
   * Main subjects: always display at least 11 rows.
   */
  const paddedMainSubjects = useMemo<
    Array<SubjectResultRow | null>
  >(() => {
    const list: Array<SubjectResultRow | null> = [
      ...mainSubjects,
    ];

    while (list.length < MIN_MAIN_ROWS) {
      list.push(null);
    }

    return list;
  }, [mainSubjects]);

  /*
   * Arabic subjects: 1-4 on the left.
   */
  const paddedArabicLeft = useMemo<
    Array<SubjectResultRow | null>
  >(() => {
    const list: Array<SubjectResultRow | null> =
      arabicSubjects.slice(0, 4);

    while (list.length < MIN_ARABIC_ROWS) {
      list.push(null);
    }

    return list;
  }, [arabicSubjects]);

  /*
   * Arabic subjects: 5-8 on the right.
   */
  const paddedArabicRight = useMemo<
    Array<SubjectResultRow | null>
  >(() => {
    const list: Array<SubjectResultRow | null> =
      arabicSubjects.slice(4, 8);

    while (list.length < MIN_ARABIC_ROWS) {
      list.push(null);
    }

    return list;
  }, [arabicSubjects]);

  /*
   * Main subject totals.
   */
  const mainTotal = useMemo(
    () =>
      mainSubjects.reduce(
        (sum, item) =>
          sum + safeNumber(item.result.total),
        0
      ),
    [mainSubjects]
  );

  const mainAverage = useMemo(
    () =>
      mainSubjects.length > 0
        ? mainTotal / mainSubjects.length
        : 0,
    [mainSubjects.length, mainTotal]
  );

  /*
   * Arabic totals.
   */
  const arabicTotal = useMemo(
    () =>
      arabicSubjects.reduce(
        (sum, item) =>
          sum + safeNumber(item.result.total),
        0
      ),
    [arabicSubjects]
  );

  const arabicAverage = useMemo(
    () =>
      arabicSubjects.length > 0
        ? arabicTotal / arabicSubjects.length
        : 0,
    [arabicSubjects.length, arabicTotal]
  );

  /*
   * Overall totals.
   */
  const overallTotal = mainTotal + arabicTotal;

  const overallCount =
    mainSubjects.length + arabicSubjects.length;

  const overallAverage =
    overallCount > 0
      ? overallTotal / overallCount
      : 0;

  /*
   * General comment.
   */
  const generalComment = generateGeneralComment(
    overallAverage,
    mainSubjects.length > 0,
    arabicSubjects.length > 0
  );

  /*
   * Behavioural assessment.
   */
  function updateBehaviour(
    field: keyof Behaviour,
    value: string
  ) {
    if (value !== "" && !/^[1-5]$/.test(value)) {
      return;
    }

    setBehaviour((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  const className =
    classRoom?.name ||
    student?.className ||
    "PRIMARY TWO";

  /*
   * Print.
   */
  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style jsx global>{`
        .report-card-font {
          font-family:
            "Times New Roman",
            Times,
            serif;
        }

        .arabic-font {
          font-family:
            "Noto Naskh Arabic",
            "Times New Roman",
            serif;
        }

        .a4-report-wrapper {
          width: 210mm;
          height: 297mm;
          max-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          box-sizing: border-box;
          padding: 2.5mm;
          position: relative;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: #000000;
        }

        .report-inner-border {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          border: 3px solid #000000;
          padding: 1.5mm;
          background: #ffffff;
        }

        .report-inner-content {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          border: 1px solid #000000;
          padding: 1mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }

        .arabic-cell {
          direction: rtl;
          text-align: right;
        }

        @media screen {
          .a4-report-wrapper {
            box-shadow:
              0 4px 20px rgba(0, 0, 0, 0.12);
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }

          html,
          body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden;
          }

          .print-controls,
          .print-button {
            display: none !important;
          }

          .a4-report-wrapper,
          .a4-report-wrapper * {
            visibility: visible;
          }

          .a4-report-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 2.5mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            box-shadow: none !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-inner-border,
          .report-inner-content {
            page-break-inside: avoid !important;
          }

          table,
          tr,
          td,
          th {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="max-w-5xl space-y-4 report-card-font mx-auto">

        {/* CONTROL PANEL */}
        <div className="print:hidden print-controls grid grid-cols-1 gap-4 rounded-card border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-3 items-center">

          <SelectInput
            label="Class"
            value={classId}
            onChange={(event) => {
              const value = event.target.value;

              setClassId(value);
              setStudentId("");
              setResults([]);
              setBehaviour(emptyBehaviour);
            }}
            options={[
              {
                label: "Select a class",
                value: "",
              },
              ...classes.map((item) => ({
                label: item.name,
                value: item.id,
              })),
            ]}
          />

          <SelectInput
            label="Student"
            value={studentId}
            onChange={(event) => {
              const value = event.target.value;

              setStudentId(value);
              setBehaviour(emptyBehaviour);
            }}
            options={[
              {
                label: "Select a student",
                value: "",
              },
              ...students.map((item) => ({
                label: `${item.firstName} ${item.lastName}`,
                value: item.id,
              })),
            ]}
          />

          <div className="flex justify-end items-end h-full pt-2 md:pt-0">
            <Button
              onClick={handlePrint}
              className="print-button w-full md:w-auto"
            >
              Print / Save as PDF
            </Button>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <p className="print:hidden text-sm text-gray-400 text-center">
            Loading results...
          </p>
        )}

        {/* REPORT */}
        {student && !loading && (
          <div className="a4-report-wrapper text-black">

            <div className="report-inner-border">

              <div className="report-inner-content">

                {/* =========================
                    UPPER DOCUMENT CONTENT
                ========================== */}
                <div>

                  {/* HEADER */}
                  <div className="text-center pt-0.5">

                    <h1 className="text-[20px] sm:text-[22px] font-extrabold tracking-wider uppercase leading-none font-serif">
                      JIDDA STANDARD ACADEMY
                    </h1>

                    <div className="mt-1 bg-gray-600 text-white text-[8px] font-semibold py-[1px] px-2 mx-1 leading-tight">
                      Main Campus: No. 5 Hayin Dogo Anguwan Rafi Danmagaji, Zaria
                    </div>

                    <div className="mt-[1px] bg-gray-600 text-white text-[7.5px] font-semibold py-[1px] px-2 mx-1 leading-tight">
                      Annex: No. 5 Aminu Mai Kai Close, Behind Baba Kaduna&apos;s Garage, Gaskiya Road, Zaria
                    </div>

                    <div className="relative mt-1 px-8 flex items-center justify-between min-h-[42px]">

                      {/* LEFT LOGO */}
                      <div className="absolute left-1 top-0 h-10 w-10">
                        <Image
                          src={SCHOOL.logoPath}
                          alt="Jidda Standard Academy Logo"
                          fill
                          priority
                          className="object-contain"
                        />
                      </div>

                      <div className="w-full text-center">

                        <p className="text-[9.5px] italic font-semibold leading-tight">
                          Motto: Knowledge is Light
                        </p>

                        <p className="text-[8.5px] font-bold leading-tight mt-[1px]">
                          Phone Numbers: 08121414008, 08069121401
                        </p>

                        <div className="bg-gray-400 text-white text-[8px] font-bold py-[0.5px] mt-[1px] mx-auto w-1/2 leading-none">
                          Email:
                        </div>

                      </div>

                      {/* RIGHT LOGO */}
                      <div className="absolute right-1 top-0 h-10 w-10">
                        <Image
                          src={SCHOOL.logoPath}
                          alt="Jidda Standard Academy Logo"
                          fill
                          priority
                          className="object-contain"
                        />
                      </div>

                    </div>

                    <div className="mt-1 border-t border-b border-black py-[1px] bg-gray-100">
                      <p className="text-[10.5px] font-bold italic tracking-wide leading-tight">
                        End of Term Examination Report Sheet (Primary Section)
                      </p>
                    </div>

                  </div>

                  {/* =========================
                      STUDENT INFORMATION
                  ========================== */}
                  <div className="mt-[2px]">

                    <div className="bg-gray-300 text-center font-bold text-[9px] italic border-b border-black py-[1px] leading-tight">
                      Student Information
                    </div>

                    <table className="w-full text-[9px] border-collapse leading-tight">

                      <tbody>

                        {/* ROW 1 — 6 COLUMNS */}
                        <tr className="border-b border-black">

                          <td className="w-[9%] font-bold p-[2px] px-1 border-r border-black">
                            Name:
                          </td>

                          <td className="w-[31%] p-[2px] px-1 border-r border-black uppercase font-bold text-center italic font-serif">
                            {student.firstName}{" "}
                            {student.lastName}
                          </td>

                          <td className="w-[9%] font-bold p-[2px] px-1 border-r border-black">
                            Class:
                          </td>

                          <td className="w-[21%] p-[2px] px-1 border-r border-black uppercase font-bold text-center italic font-serif">
                            {className}
                          </td>

                          <td className="w-[9%] font-bold p-[2px] px-1 border-r border-black">
                            Term:
                          </td>

                          <td className="w-[21%] p-[2px] px-1 text-center font-bold uppercase italic font-serif">
                            {term}
                          </td>

                        </tr>

                        {/* ROW 2 — 6 COLUMNS */}
                        <tr className="border-b border-black">

                          <td className="font-bold p-[2px] px-1 border-r border-black">
                            Session:
                          </td>

                          <td className="p-[2px] px-1 border-r border-black text-center font-bold italic font-serif">
                            {session}
                          </td>

                          <td className="font-bold p-[2px] px-1 border-r border-black">
                            No. in Class:
                          </td>

                          <td className="p-[2px] px-1 border-r border-black text-center font-bold italic font-serif">
                            {students.length}
                          </td>

                          <td className="font-bold p-[2px] px-1 border-r border-black">
                            Student ID:
                          </td>

                          <td className="p-[2px] px-1 text-center font-bold italic font-serif truncate">
                            {student.id}
                          </td>

                        </tr>

                      </tbody>

                    </table>

                  </div>

                  {/* =========================
                      MAIN SUBJECT TABLE
                  ========================== */}
                  <div className="mt-0">

                    <div className="bg-gray-300 text-center font-bold text-[9px] uppercase border-t border-b border-black py-[1px] leading-tight">
                      STUDENT ACADEMIC PERFORMANCE
                    </div>

                    <table className="w-full text-[8.5px] border-collapse leading-tight">

                      <thead>

                        <tr className="border-b border-black font-bold italic bg-gray-50">

                          <th className="border-r border-black p-0.5 w-[5%] text-center leading-none">
                            S/N
                          </th>

                          <th className="border-r border-black p-0.5 w-[32%] text-left pl-2 leading-none">
                            SUBJECTS
                          </th>

                          <th className="border-r border-black p-0.5 w-[11%] text-center leading-none">
                            1ST C.A (20)
                          </th>

                          <th className="border-r border-black p-0.5 w-[11%] text-center leading-none">
                            2ND C.A (20)
                          </th>

                          <th className="border-r border-black p-0.5 w-[11%] text-center leading-none">
                            EXAM (60)
                          </th>

                          <th className="border-r border-black p-0.5 w-[10%] text-center leading-none">
                            TOTAL (100)
                          </th>

                          <th className="border-r border-black p-0.5 w-[8%] text-center leading-none">
                            GRADE
                          </th>

                          <th className="p-0.5 w-[12%] text-center leading-none">
                            REMARK
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {paddedMainSubjects.map(
                          (item, index) => (
                            <tr
                              key={`main-${index}`}
                              className="border-b border-black h-[21px]"
                            >

                              <td className="border-r border-black p-0.5 text-center font-semibold">
                                {index + 1}
                              </td>

                              <td className="border-r border-black p-0.5 pl-2 font-semibold text-gray-900">
                                {item?.subject?.name || ""}
                              </td>

                              <td className="border-r border-black p-0.5 text-center">
                                {formatResultValue(
                                  item?.result.ca1
                                )}
                              </td>

                              <td className="border-r border-black p-0.5 text-center">
                                {formatResultValue(
                                  item?.result.ca2
                                )}
                              </td>

                              <td className="border-r border-black p-0.5 text-center">
                                {formatResultValue(
                                  item?.result.exam
                                )}
                              </td>

                              <td className="border-r border-black p-0.5 text-center font-bold">
                                {formatResultValue(
                                  item?.result.total
                                )}
                              </td>

                              <td className="border-r border-black p-0.5 text-center font-bold">
                                {formatResultValue(
                                  item?.result.grade
                                )}
                              </td>

                              <td className="p-0.5 text-center italic text-[8px]">
                                {item
                                  ? item.result.remark ||
                                    gradeRemark(
                                      item.result.grade
                                    )
                                  : ""}
                              </td>

                            </tr>
                          )
                        )}

                        <tr className="border-b border-black font-bold bg-gray-50 h-[22px]">

                          <td
                            colSpan={2}
                            className="border-r border-black p-0.5 text-right pr-4"
                          >
                            TOTAL:
                          </td>

                          <td
                            colSpan={3}
                            className="border-r border-black p-0.5 text-center text-[9.5px]"
                          >
                            {mainSubjects.length > 0
                              ? mainTotal
                              : ""}
                          </td>

                          <td
                            colSpan={2}
                            className="border-r border-black p-0.5 text-right pr-2"
                          >
                            AVERAGE:
                          </td>

                          <td className="p-0.5 text-center text-[9.5px]">
                            {mainSubjects.length > 0
                              ? mainAverage.toFixed(2)
                              : ""}
                          </td>

                        </tr>

                      </tbody>

                    </table>

                  </div>

                  {/* =========================
                      ARABIC TABLE
                  ========================== */}
                  <div className="mt-0">

                    <div className="bg-gray-300 text-center font-bold text-[9px] uppercase border-t border-b border-black py-[1px] leading-tight">
                      STUDENT ACADEMIC PERFORMANCE (ARABIC SECTION)
                    </div>

                    <table
                      className="w-full text-[8.5px] border-collapse leading-tight"
                      dir="ltr"
                    >

                      <thead>

                        <tr className="border-b border-black font-bold italic bg-gray-50">

                          <th className="border-r border-black p-0.5 w-[4%] text-center leading-none">
                            S/N
                          </th>

                          <th className="border-r border-black p-0.5 w-[20%] text-right pr-2 leading-none">
                            SUBJECTS
                          </th>

                          <th className="border-r border-black p-0.5 w-[8%] text-center leading-none">
                            C.A (40)
                          </th>

                          <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">
                            EXAM (60)
                          </th>

                          <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">
                            TOTAL (100)
                          </th>

                          <th className="border-r border-black p-0.5 w-[6%] text-center leading-none">
                            GRADE
                          </th>

                          <th className="border-r border-black p-0.5 w-[4%] text-center leading-none">
                            S/N
                          </th>

                          <th className="border-r border-black p-0.5 w-[20%] text-right pr-2 leading-none">
                            SUBJECTS
                          </th>

                          <th className="border-r border-black p-0.5 w-[8%] text-center leading-none">
                            C.A (40)
                          </th>

                          <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">
                            EXAM (60)
                          </th>

                          <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">
                            TOTAL (100)
                          </th>

                          <th className="p-0.5 w-[6%] text-center leading-none">
                            GRADE
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {Array.from({
                          length: MIN_ARABIC_ROWS,
                        }).map((_, idx) => {

                          const left =
                            paddedArabicLeft[idx];

                          const right =
                            paddedArabicRight[idx];

                          return (
                            <tr
                              key={`arabic-${idx}`}
                              className="border-b border-black h-[21px]"
                            >

                              {/* LEFT */}
                              <td className="border-r border-black p-0.5 text-center font-semibold">
                                {idx + 1}
                              </td>

                              <td className="border-r border-black p-0.5 text-right pr-2 font-bold arabic-font text-[9.5px] arabic-cell">
                                {left?.subject?.name || ""}
                              </td>

                              <td className="border-r border-black p-0.5 text-center">
                                {formatResultValue(
                                  left?.result.ca1
                                )}
                              </td>

                              <td className="border-r border-black p-0.5 text-center">
                                {formatResultValue(
                                  left?.result.exam
                                )}
                              </td>

                              <td className="border-r border-black p-0.5 text-center font-bold">
                                {formatResultValue(
                                  left?.result.total
                                )}
                              </td>

                              <td className="border-r border-black p-0.5 text-center font-bold">
                                {formatResultValue(
                                  left?.result.grade
                                )}
                              </td>

                              {/* RIGHT */}
                              <td className="border-r border-black p-0.5 text-center font-semibold">
                                {idx + 5}
                              </td>

                              <td className="border-r border-black p-0.5 text-right pr-2 font-bold arabic-font text-[9.5px] arabic-cell">
                                {right?.subject?.name || ""}
                              </td>

                              <td className="border-r border-black p-0.5 text-center">
                                {formatResultValue(
                                  right?.result.ca1
                                )}
                              </td>

                              <td className="border-r border-black p-0.5 text-center">
                                {formatResultValue(
                                  right?.result.exam
                                )}
                              </td>

                              <td className="border-r border-black p-0.5 text-center font-bold">
                                {formatResultValue(
                                  right?.result.total
                                )}
                              </td>

                              <td className="p-0.5 text-center font-bold">
                                {formatResultValue(
                                  right?.result.grade
                                )}
                              </td>

                            </tr>
                          );
                        })}

                        <tr className="border-b border-black font-bold bg-gray-50 h-[22px]">

                          <td
                            colSpan={2}
                            className="border-r border-black p-0.5 text-right pr-2"
                          >
                            TOTAL:
                          </td>

                          <td
                            colSpan={4}
                            className="border-r border-black p-0.5 text-center text-[9.5px]"
                          >
                            {arabicSubjects.length > 0
                              ? arabicTotal
                              : ""}
                          </td>

                          <td
                            colSpan={4}
                            className="border-r border-black p-0.5 text-right pr-2"
                          >
                            AVERAGE:
                          </td>

                          <td
                            colSpan={2}
                            className="p-0.5 text-center text-[9.5px]"
                          >
                            {arabicSubjects.length > 0
                              ? arabicAverage.toFixed(2)
                              : ""}
                          </td>

                        </tr>

                      </tbody>

                    </table>

                  </div>

                  {/* =========================
                      OVERALL TOTAL
                  ========================== */}
                  <div className="border-b border-black font-bold text-[9px] uppercase bg-gray-100 leading-tight">

                    <div className="grid grid-cols-2 text-center py-[2px]">

                      <div className="border-r border-black">
                        OVERALL TOTAL:

                        <span className="ml-4 text-[10px]">
                          {overallCount > 0
                            ? overallTotal
                            : ""}
                        </span>
                      </div>

                      <div>
                        OVERALL AVERAGE:

                        <span className="ml-4 text-[10px]">
                          {overallCount > 0
                            ? overallAverage.toFixed(2)
                            : ""}
                        </span>
                      </div>

                    </div>

                  </div>

                  {/* =========================
                      BEHAVIOURAL ASSESSMENT
                  ========================== */}
                  <div>

                    <div className="bg-gray-300 text-center font-bold text-[9px] italic border-b border-black py-[1px] leading-tight">
                      Behavioural Assessment
                    </div>

                    <div className="grid grid-cols-4 text-[8.5px] border-b border-black leading-tight">

                      <BehaviourCell
                        label="Conduct"
                        value={behaviour.conduct}
                        onChange={(value) =>
                          updateBehaviour(
                            "conduct",
                            value
                          )
                        }
                      />

                      <BehaviourCell
                        label="Hospitality"
                        value={behaviour.hospitality}
                        onChange={(value) =>
                          updateBehaviour(
                            "hospitality",
                            value
                          )
                        }
                      />

                      <BehaviourCell
                        label="Punctuality"
                        value={behaviour.punctuality}
                        onChange={(value) =>
                          updateBehaviour(
                            "punctuality",
                            value
                          )
                        }
                      />

                      <BehaviourCell
                        label="Participation in Class"
                        value={behaviour.participation}
                        onChange={(value) =>
                          updateBehaviour(
                            "participation",
                            value
                          )
                        }
                      />

                      <BehaviourCell
                        label="Creativity"
                        value={behaviour.creativity}
                        onChange={(value) =>
                          updateBehaviour(
                            "creativity",
                            value
                          )
                        }
                      />

                      <BehaviourCell
                        label="Neatness"
                        value={behaviour.neatness}
                        onChange={(value) =>
                          updateBehaviour(
                            "neatness",
                            value
                          )
                        }
                      />

                      <BehaviourCell
                        label="Dedication"
                        value={behaviour.dedication}
                        onChange={(value) =>
                          updateBehaviour(
                            "dedication",
                            value
                          )
                        }
                      />

                      <BehaviourCell
                        label="Physical Health"
                        value={behaviour.physicalHealth}
                        onChange={(value) =>
                          updateBehaviour(
                            "physicalHealth",
                            value
                          )
                        }
                      />

                    </div>

                  </div>

                  {/* =========================
                      GUIDE + COMMENT
                  ========================== */}
                  <div className="grid grid-cols-3 border-b border-black text-[8.5px] leading-tight">

                    <div className="border-r border-black p-1 italic leading-none">

                      <p className="font-bold underline text-center text-[8.5px]">
                        GUIDE:
                      </p>

                      <div className="grid grid-cols-2 mt-0.5 text-[8px] px-0.5">

                        <div>
                          <p>5 - Excellent</p>
                          <p>4 - V. Good</p>
                          <p>3 - Good</p>
                        </div>

                        <div>
                          <p>2 - Fair</p>
                          <p>1 - Weak</p>
                        </div>

                      </div>

                    </div>

                    <div className="col-span-2 p-1 text-center flex flex-col justify-center items-center">

                      <p className="font-bold italic text-[9px]">
                        General Comment:
                      </p>

                      <p className="mt-1 italic font-semibold text-[9.5px] px-1">
                        {generalComment}
                      </p>

                    </div>

                  </div>

                  {/* =========================
                      NEXT TERM
                  ========================== */}
                  <div className="border-b border-black p-1 text-center text-[9px] font-bold italic leading-tight bg-gray-50">

                    Next term begins on:

                    <span className="ml-2 underline font-serif tracking-wider">
                      {nextTermDate}
                    </span>

                  </div>

                </div>

                {/* =========================
                    SIGNATURES + STAMP
                ========================== */}
                <div>

                  <div className="relative grid grid-cols-2 text-[9px] font-bold italic min-h-[46px] leading-tight pt-1">

                    {/* DIRECTOR */}
                    <div className="border-r border-black p-1 text-center relative flex flex-col justify-between items-center">

                      <div>
                        <p className="leading-tight">
                          Director&apos;s
                        </p>

                        <p className="leading-tight">
                          Signature and Date
                        </p>
                      </div>

                      <div className="w-full text-right pr-2 text-[8px] font-serif font-semibold mt-3">
                        {reportDate}
                      </div>

                    </div>

                    {/* HEADMASTER */}
                    <div className="p-1 text-center relative flex flex-col justify-between items-center">

                      <div>
                        <p className="leading-tight">
                          Headmaster&apos;s/Headmistress
                        </p>

                        <p className="leading-tight">
                          Signature and Date
                        </p>
                      </div>

                      <div className="w-full text-right pr-2 text-[8px] font-serif font-semibold mt-3">
                        {reportDate}
                      </div>

                      {/* OFFICIAL STAMP */}
                      <div className="absolute right-[-4px] bottom-[-6px] h-16 w-16 z-10 pointer-events-none opacity-85">

                        <Image
                          src={SCHOOL.stampPath}
                          alt="Official School Stamp"
                          fill
                          className="object-contain"
                        />

                      </div>

                    </div>

                  </div>

                  {/* =========================
                      FOOTER
                  ========================== */}
                  <div className="mt-1 text-[7px] italic text-gray-700 font-semibold border-t border-gray-400 pt-[1px] flex justify-between px-1 leading-none">

                    <span>
                      Designed @ 08101130605
                    </span>

                    <span>
                      JIDDA STANDARD ACADEMY OFFICIAL RESULT SHEET
                    </span>

                  </div>

                </div>

              </div>

            </div>

          </div>
        )}

      </div>
    </>
  );
}

/*
 * Behavioural Assessment Cell
 */
function BehaviourCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-r border-b border-black p-[2px] flex items-center justify-between px-1.5">

      <span className="italic">
        {label}
      </span>

      {/* SCREEN INPUT */}
      <input
        type="text"
        inputMode="numeric"
        maxLength={1}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="print:hidden w-4 h-4 text-center border border-gray-400 font-bold text-[8.5px] outline-none"
        aria-label={`${label} rating`}
      />

      {/* PRINT VALUE */}
      <span className="hidden print:inline font-bold text-[8.5px]">
        {value || "—"}
      </span>

    </div>
  );
}