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

type SubjectResult = {
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

function displayValue(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return String(value);
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
  average: number,
  hasResults: boolean
): string {
  if (!hasResults) {
    return "No academic results have been recorded for this student.";
  }

  if (average >= 80) {
    return "Outstanding performance. Keep up the excellent work!";
  }

  if (average >= 70) {
    return "Excellent performance. Continue striving for excellence.";
  }

  if (average >= 60) {
    return "Very good overall performance. Keep working hard.";
  }

  if (average >= 50) {
    return "Good performance. Encouraging progress.";
  }

  if (average >= 40) {
    return "Fair performance. More consistent study is required.";
  }

  return "Requires significant improvement and regular study.";
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

  const nextTermDate = "30th MARCH, 2026";
  const reportDate = "26 February, 2026";

  /*
   * =========================================================
   * LOAD CLASSES + SUBJECTS
   * =========================================================
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
        console.error(
          "Failed to load classes/subjects:",
          error
        );

        if (!mounted) return;

        setClasses([]);
        setSubjects([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * =========================================================
   * LOAD STUDENTS WHEN CLASS CHANGES
   * =========================================================
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
        console.error(
          "Failed to load students:",
          error
        );

        if (!mounted) return;

        setStudents([]);
      });

    return () => {
      mounted = false;
    };
  }, [classId]);

  /*
   * =========================================================
   * LOAD RESULTS
   * =========================================================
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

    getResultsForStudent(
      studentId,
      term,
      session
    )
      .then((data) => {
        if (!mounted) return;

        setResults((data || []) as ResultEntry[]);
      })
      .catch((error) => {
        console.error(
          "Failed to load results:",
          error
        );

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
   * =========================================================
   * CURRENT STUDENT
   * =========================================================
   */
  const student = useMemo(
    () =>
      students.find(
        (item) => item.id === studentId
      ),
    [students, studentId]
  );

  /*
   * =========================================================
   * CURRENT CLASS
   * =========================================================
   */
  const classRoom = useMemo(
    () =>
      classes.find(
        (item) => item.id === student?.classId
      ),
    [classes, student?.classId]
  );

  /*
   * =========================================================
   * MAIN SUBJECTS
   * =========================================================
   */
  const mainSubjects = useMemo<SubjectResult[]>(() => {
    return results
      .map((result) => ({
        result,
        subject: subjects.find(
          (subject) =>
            subject.id === result.subjectId
        ),
      }))
      .filter(
        ({ subject }) =>
          Boolean(subject) &&
          subject?.section !== "arabic" &&
          subject?.scoringType !== "arabic-40-60"
      );
  }, [results, subjects]);

  /*
   * =========================================================
   * ARABIC SUBJECTS
   * =========================================================
   */
  const arabicSubjects = useMemo<SubjectResult[]>(() => {
    return results
      .map((result) => ({
        result,
        subject: subjects.find(
          (subject) =>
            subject.id === result.subjectId
        ),
      }))
      .filter(
        ({ subject }) =>
          Boolean(subject) &&
          (subject?.section === "arabic" ||
            subject?.scoringType ===
              "arabic-40-60")
      );
  }, [results, subjects]);

  /*
   * =========================================================
   * PAD MAIN SUBJECTS
   * =========================================================
   */
  const paddedMainSubjects = useMemo<
    Array<SubjectResult | null>
  >(() => {
    const list: Array<SubjectResult | null> = [
      ...mainSubjects,
    ];

    while (list.length < MIN_MAIN_ROWS) {
      list.push(null);
    }

    return list;
  }, [mainSubjects]);

  /*
   * =========================================================
   * PAD ARABIC SUBJECTS
   * =========================================================
   */
  const paddedArabicLeft = useMemo<
    Array<SubjectResult | null>
  >(() => {
    const list: Array<SubjectResult | null> =
      arabicSubjects.slice(0, 4);

    while (list.length < MIN_ARABIC_ROWS) {
      list.push(null);
    }

    return list;
  }, [arabicSubjects]);

  const paddedArabicRight = useMemo<
    Array<SubjectResult | null>
  >(() => {
    const list: Array<SubjectResult | null> =
      arabicSubjects.slice(4, 8);

    while (list.length < MIN_ARABIC_ROWS) {
      list.push(null);
    }

    return list;
  }, [arabicSubjects]);

  /*
   * =========================================================
   * TOTALS
   * =========================================================
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

  const mainAverage =
    mainSubjects.length > 0
      ? mainTotal / mainSubjects.length
      : 0;

  const arabicTotal = useMemo(
    () =>
      arabicSubjects.reduce(
        (sum, item) =>
          sum + safeNumber(item.result.total),
        0
      ),
    [arabicSubjects]
  );

  const arabicAverage =
    arabicSubjects.length > 0
      ? arabicTotal / arabicSubjects.length
      : 0;

  const overallTotal =
    mainTotal + arabicTotal;

  const overallCount =
    mainSubjects.length +
    arabicSubjects.length;

  const overallAverage =
    overallCount > 0
      ? overallTotal / overallCount
      : 0;

  const generalComment =
    generateGeneralComment(
      overallAverage,
      overallCount > 0
    );

  /*
   * =========================================================
   * BEHAVIOUR
   * =========================================================
   */
  function updateBehaviour(
    field: keyof Behaviour,
    value: string
  ) {
    if (
      value !== "" &&
      !/^[1-5]$/.test(value)
    ) {
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
   * =========================================================
   * PRINT
   * =========================================================
   */
  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

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

        /*
         * A4 PAGE
         */
        .a4-report-wrapper {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;

          margin: 0 auto;

          background: #ffffff;

          padding: 3mm;

          position: relative;

          overflow: hidden;

          color: #000000;

          box-sizing: border-box;

          display: flex;
        }

        /*
         * OUTER BLACK BORDER
         */
        .report-outer-border {
          width: 100%;
          height: 100%;

          border: 3px solid #000000;

          padding: 1.5mm;

          background: #ffffff;

          box-sizing: border-box;
        }

        /*
         * INNER BLACK BORDER
         */
        .report-inner {
          width: 100%;
          height: 100%;

          border: 1px solid #000000;

          padding: 1.5mm;

          background: #ffffff;

          box-sizing: border-box;

          display: flex;
          flex-direction: column;

          overflow: hidden;
        }

        /*
         * THE MAIN CONTENT IS ALLOWED TO USE
         * THE AVAILABLE A4 HEIGHT.
         */
        .report-main {
          flex: 1 1 auto;

          min-height: 0;

          display: flex;
          flex-direction: column;

          overflow: hidden;
        }

        /*
         * FOOTER MUST STAY AT THE BOTTOM.
         */
        .report-footer {
          flex: 0 0 auto;
        }

        /*
         * ARABIC CELLS
         */
        .arabic-cell {
          direction: rtl;
          text-align: right;
        }

        /*
         * SCREEN VIEW
         */
        @media screen {
          .a4-report-wrapper {
            box-shadow:
              0 5px 25px
              rgba(0, 0, 0, 0.15);
          }
        }

        /*
         * PRINT
         */
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

            min-height: 297mm !important;
            max-height: 297mm !important;

            margin: 0 !important;

            padding: 3mm !important;

            overflow: hidden !important;

            box-shadow: none !important;

            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }

          .report-outer-border,
          .report-inner,
          .report-main,
          .report-footer {
            page-break-inside: avoid !important;
          }

          table {
            page-break-inside: avoid !important;
          }

          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="max-w-5xl mx-auto space-y-4 report-card-font">

        {/* =====================================================
            CONTROL PANEL
        ====================================================== */}
        <div className="print:hidden print-controls grid grid-cols-1 gap-4 rounded-card border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-3 items-center">

          <SelectInput
            label="Class"
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
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
              setStudentId(event.target.value);
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

        {/* =====================================================
            LOADING
        ====================================================== */}
        {loading && (
          <p className="print:hidden text-sm text-gray-400 text-center">
            Loading results...
          </p>
        )}

        {/* =====================================================
            REPORT
        ====================================================== */}
        {student && !loading && (
          <div className="a4-report-wrapper">

            <div className="report-outer-border">

              <div className="report-inner">

                {/* =================================================
                    MAIN REPORT CONTENT
                ================================================== */}
                <div className="report-main">

                  {/* =================================================
                      SCHOOL HEADER
                  ================================================== */}
                  <div className="text-center shrink-0">

                    <h1 className="text-[20px] font-extrabold tracking-wider uppercase leading-none">
                      JIDDA STANDARD ACADEMY
                    </h1>

                    <div className="mt-1 bg-gray-700 text-white text-[8px] font-semibold py-[2px] px-2 mx-1 leading-tight">
                      Main Campus: No. 5 Hayin Dogo Anguwan Rafi Danmagaji, Zaria
                    </div>

                    <div className="mt-[1px] bg-gray-700 text-white text-[7.5px] font-semibold py-[2px] px-2 mx-1 leading-tight">
                      Annex: No. 5 Aminu Mai Kai Close, Behind Baba Kaduna&apos;s Garage, Gaskiya Road, Zaria
                    </div>

                    <div className="relative mt-1 px-10 flex items-center justify-between min-h-[42px]">

                      {/* LEFT LOGO */}
                      <div className="absolute left-1 top-0 h-10 w-10">
                        <Image
                          src={SCHOOL.logoPath}
                          alt="School Logo"
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

                        <p className="text-[8px] font-bold leading-tight mt-[1px]">
                          Email: —
                        </p>

                      </div>

                      {/* RIGHT LOGO */}
                      <div className="absolute right-1 top-0 h-10 w-10">
                        <Image
                          src={SCHOOL.logoPath}
                          alt="School Logo"
                          fill
                          priority
                          className="object-contain"
                        />
                      </div>

                    </div>

                    <div className="mt-1 border-t border-b border-black py-[2px] bg-gray-100">
                      <p className="text-[10.5px] font-bold italic tracking-wide leading-tight">
                        End of Term Examination Report Sheet (Primary Section)
                      </p>
                    </div>

                  </div>

                  {/* =================================================
                      STUDENT INFORMATION
                  ================================================== */}
                  <div className="shrink-0">

                    <div className="bg-gray-300 text-center font-bold text-[9px] italic border-b border-black py-[2px] leading-tight">
                      Student Information
                    </div>

                    <table className="w-full text-[8.5px] border-collapse leading-tight">

                      <tbody>

                        <tr className="border-b border-black">

                          <td className="w-[8%] font-bold p-[2px] px-1 border-r border-black">
                            Name:
                          </td>

                          <td className="w-[32%] p-[2px] px-1 border-r border-black uppercase font-bold text-center italic">
                            {student.firstName}{" "}
                            {student.lastName}
                          </td>

                          <td className="w-[8%] font-bold p-[2px] px-1 border-r border-black">
                            Class:
                          </td>

                          <td className="w-[18%] p-[2px] px-1 border-r border-black uppercase font-bold text-center italic">
                            {className}
                          </td>

                          <td className="w-[8%] font-bold p-[2px] px-1 border-r border-black">
                            Term:
                          </td>

                          <td className="w-[26%] p-[2px] px-1 text-center font-bold uppercase italic">
                            {term}
                          </td>

                        </tr>

                        <tr className="border-b border-black">

                          <td className="font-bold p-[2px] px-1 border-r border-black">
                            Session:
                          </td>

                          <td className="p-[2px] px-1 border-r border-black text-center font-bold italic">
                            {session}
                          </td>

                          <td className="font-bold p-[2px] px-1 border-r border-black">
                            No. in Class:
                          </td>

                          <td className="p-[2px] px-1 border-r border-black text-center font-bold italic">
                            {students.length}
                          </td>

                          <td className="font-bold p-[2px] px-1 border-r border-black">
                            Student ID:
                          </td>

                          <td className="p-[2px] px-1 text-center font-bold italic truncate">
                            {student.id}
                          </td>

                        </tr>

                      </tbody>

                    </table>

                  </div>

                  {/* =================================================
                      MAIN ACADEMIC TABLE
                  ================================================== */}
                  <div className="shrink-0">

                    <div className="bg-gray-300 text-center font-bold text-[9px] uppercase border-t border-b border-black py-[2px] leading-tight">
                      STUDENT ACADEMIC PERFORMANCE
                    </div>

                    <table className="w-full text-[8px] border-collapse leading-none">

                      <thead>

                        <tr className="border-b border-black font-bold italic bg-gray-50">

                          <th className="border-r border-black p-[2px] w-[5%] text-center">
                            S/N
                          </th>

                          <th className="border-r border-black p-[2px] w-[31%] text-left pl-2">
                            SUBJECTS
                          </th>

                          <th className="border-r border-black p-[2px] w-[11%] text-center">
                            1ST C.A (20)
                          </th>

                          <th className="border-r border-black p-[2px] w-[11%] text-center">
                            2ND C.A (20)
                          </th>

                          <th className="border-r border-black p-[2px] w-[11%] text-center">
                            EXAM (60)
                          </th>

                          <th className="border-r border-black p-[2px] w-[11%] text-center">
                            TOTAL (100)
                          </th>

                          <th className="border-r border-black p-[2px] w-[8%] text-center">
                            GRADE
                          </th>

                          <th className="p-[2px] w-[12%] text-center">
                            REMARK
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {paddedMainSubjects.map(
                          (item, index) => (
                            <tr
                              key={`main-${index}`}
                              className="border-b border-black h-[20px]"
                            >

                              <td className="border-r border-black p-[2px] text-center font-semibold">
                                {index + 1}
                              </td>

                              <td className="border-r border-black p-[2px] pl-2 font-semibold">
                                {item?.subject?.name || ""}
                              </td>

                              <td className="border-r border-black p-[2px] text-center">
                                {displayValue(
                                  item?.result.ca1
                                )}
                              </td>

                              <td className="border-r border-black p-[2px] text-center">
                                {displayValue(
                                  item?.result.ca2
                                )}
                              </td>

                              <td className="border-r border-black p-[2px] text-center">
                                {displayValue(
                                  item?.result.exam
                                )}
                              </td>

                              <td className="border-r border-black p-[2px] text-center font-bold">
                                {displayValue(
                                  item?.result.total
                                )}
                              </td>

                              <td className="border-r border-black p-[2px] text-center font-bold">
                                {displayValue(
                                  item?.result.grade
                                )}
                              </td>

                              <td className="p-[2px] text-center italic text-[7.5px]">
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

                        <tr className="border-b border-black font-bold bg-gray-50 h-[20px]">

                          <td
                            colSpan={2}
                            className="border-r border-black p-[2px] text-right pr-4"
                          >
                            TOTAL:
                          </td>

                          <td
                            colSpan={3}
                            className="border-r border-black p-[2px] text-center"
                          >
                            {mainSubjects.length
                              ? mainTotal
                              : ""}
                          </td>

                          <td
                            colSpan={2}
                            className="border-r border-black p-[2px] text-right pr-2"
                          >
                            AVERAGE:
                          </td>

                          <td className="p-[2px] text-center">
                            {mainSubjects.length
                              ? mainAverage.toFixed(2)
                              : ""}
                          </td>

                        </tr>

                      </tbody>

                    </table>

                  </div>

                  {/* =================================================
                      ARABIC TABLE
                  ================================================== */}
                  <div className="shrink-0">

                    <div className="bg-gray-300 text-center font-bold text-[9px] uppercase border-t border-b border-black py-[2px] leading-tight">
                      STUDENT ACADEMIC PERFORMANCE (ARABIC SECTION)
                    </div>

                    <table
                      className="w-full text-[7.8px] border-collapse leading-none"
                      dir="ltr"
                    >

                      <thead>

                        <tr className="border-b border-black font-bold italic bg-gray-50">

                          <th className="border-r border-black p-[2px] w-[4%] text-center">
                            S/N
                          </th>

                          <th className="border-r border-black p-[2px] w-[20%] text-right pr-2">
                            SUBJECTS
                          </th>

                          <th className="border-r border-black p-[2px] w-[8%] text-center">
                            C.A (40)
                          </th>

                          <th className="border-r border-black p-[2px] w-[9%] text-center">
                            EXAM (60)
                          </th>

                          <th className="border-r border-black p-[2px] w-[9%] text-center">
                            TOTAL
                          </th>

                          <th className="border-r border-black p-[2px] w-[6%] text-center">
                            GRADE
                          </th>

                          <th className="border-r border-black p-[2px] w-[4%] text-center">
                            S/N
                          </th>

                          <th className="border-r border-black p-[2px] w-[20%] text-right pr-2">
                            SUBJECTS
                          </th>

                          <th className="border-r border-black p-[2px] w-[8%] text-center">
                            C.A (40)
                          </th>

                          <th className="border-r border-black p-[2px] w-[9%] text-center">
                            EXAM (60)
                          </th>

                          <th className="border-r border-black p-[2px] w-[9%] text-center">
                            TOTAL
                          </th>

                          <th className="p-[2px] w-[6%] text-center">
                            GRADE
                          </th>

                        </tr>

                      </thead>

                      <tbody>

                        {Array.from({
                          length: MIN_ARABIC_ROWS,
                        }).map((_, index) => {

                          const left =
                            paddedArabicLeft[index];

                          const right =
                            paddedArabicRight[index];

                          return (
                            <tr
                              key={`arabic-${index}`}
                              className="border-b border-black h-[20px]"
                            >

                              <td className="border-r border-black p-[2px] text-center font-semibold">
                                {index + 1}
                              </td>

                              <td className="border-r border-black p-[2px] text-right pr-2 font-bold arabic-font arabic-cell">
                                {left?.subject?.name || ""}
                              </td>

                              <td className="border-r border-black p-[2px] text-center">
                                {displayValue(
                                  left?.result.ca1
                                )}
                              </td>

                              <td className="border-r border-black p-[2px] text-center">
                                {displayValue(
                                  left?.result.exam
                                )}
                              </td>

                              <td className="border-r border-black p-[2px] text-center font-bold">
                                {displayValue(
                                  left?.result.total
                                )}
                              </td>

                              <td className="border-r border-black p-[2px] text-center font-bold">
                                {displayValue(
                                  left?.result.grade
                                )}
                              </td>

                              <td className="border-r border-black p-[2px] text-center font-semibold">
                                {index + 5}
                              </td>

                              <td className="border-r border-black p-[2px] text-right pr-2 font-bold arabic-font arabic-cell">
                                {right?.subject?.name || ""}
                              </td>

                              <td className="border-r border-black p-[2px] text-center">
                                {displayValue(
                                  right?.result.ca1
                                )}
                              </td>

                              <td className="border-r border-black p-[2px] text-center">
                                {displayValue(
                                  right?.result.exam
                                )}
                              </td>

                              <td className="border-r border-black p-[2px] text-center font-bold">
                                {displayValue(
                                  right?.result.total
                                )}
                              </td>

                              <td className="p-[2px] text-center font-bold">
                                {displayValue(
                                  right?.result.grade
                                )}
                              </td>

                            </tr>
                          );
                        })}

                        <tr className="border-b border-black font-bold bg-gray-50 h-[20px]">

                          <td
                            colSpan={2}
                            className="border-r border-black p-[2px] text-right pr-2"
                          >
                            TOTAL:
                          </td>

                          <td
                            colSpan={4}
                            className="border-r border-black p-[2px] text-center"
                          >
                            {arabicSubjects.length
                              ? arabicTotal
                              : ""}
                          </td>

                          <td
                            colSpan={4}
                            className="border-r border-black p-[2px] text-right pr-2"
                          >
                            AVERAGE:
                          </td>

                          <td
                            colSpan={2}
                            className="p-[2px] text-center"
                          >
                            {arabicSubjects.length
                              ? arabicAverage.toFixed(2)
                              : ""}
                          </td>

                        </tr>

                      </tbody>

                    </table>

                  </div>

                  {/* =================================================
                      OVERALL RESULT
                  ================================================== */}
                  <div className="border-b border-black font-bold text-[8.5px] uppercase bg-gray-100 leading-tight shrink-0">

                    <div className="grid grid-cols-2 text-center py-[3px]">

                      <div className="border-r border-black">
                        OVERALL TOTAL:

                        <span className="ml-4 text-[9.5px]">
                          {overallCount
                            ? overallTotal
                            : ""}
                        </span>
                      </div>

                      <div>
                        OVERALL AVERAGE:

                        <span className="ml-4 text-[9.5px]">
                          {overallCount
                            ? overallAverage.toFixed(2)
                            : ""}
                        </span>
                      </div>

                    </div>

                  </div>

                  {/* =================================================
                      BEHAVIOURAL ASSESSMENT
                  ================================================== */}
                  <div className="shrink-0">

                    <div className="bg-gray-300 text-center font-bold text-[9px] italic border-b border-black py-[2px] leading-tight">
                      Behavioural Assessment
                    </div>

                    <div className="grid grid-cols-4 text-[7.8px] border-b border-black leading-tight">

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

                  {/* =================================================
                      GUIDE + GENERAL COMMENT
                  ================================================== */}
                  <div className="grid grid-cols-3 border-b border-black text-[7.8px] leading-tight shrink-0">

                    <div className="border-r border-black p-1">

                      <p className="font-bold underline text-center">
                        GUIDE
                      </p>

                      <div className="grid grid-cols-2 mt-0.5 px-1">

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

                      <p className="font-bold italic text-[8.5px]">
                        General Comment:
                      </p>

                      <p className="mt-1 italic font-semibold text-[9px] px-2">
                        {generalComment}
                      </p>

                    </div>

                  </div>

                  {/* =================================================
                      NEXT TERM
                  ================================================== */}
                  <div className="border-b border-black p-[3px] text-center text-[8.5px] font-bold italic leading-tight bg-gray-50 shrink-0">

                    Next term begins on:

                    <span className="ml-2 underline font-serif tracking-wider">
                      {nextTermDate}
                    </span>

                  </div>

                </div>

                {/* =================================================
                    REPORT FOOTER
                ================================================== */}
                <div className="report-footer">

                  {/* SIGNATURE AREA */}
                  <div className="relative grid grid-cols-2 text-[8.5px] font-bold italic min-h-[48px] leading-tight pt-1">

                    {/* DIRECTOR */}
                    <div className="border-r border-black p-1 text-center relative flex flex-col justify-between items-center">

                      <div>
                        <p>
                          Director&apos;s
                        </p>

                        <p>
                          Signature and Date
                        </p>
                      </div>

                      <div className="w-full text-right pr-2 text-[7.5px] font-serif font-semibold">
                        {reportDate}
                      </div>

                    </div>

                    {/* HEADMASTER */}
                    <div className="p-1 text-center relative flex flex-col justify-between items-center">

                      <div>
                        <p>
                          Headmaster&apos;s/Headmistress
                        </p>

                        <p>
                          Signature and Date
                        </p>
                      </div>

                      <div className="w-full text-right pr-2 text-[7.5px] font-serif font-semibold">
                        {reportDate}
                      </div>

                      {/* SCHOOL STAMP */}
                      <div className="absolute right-0 bottom-[-4px] h-[62px] w-[62px] z-10 pointer-events-none opacity-90">

                        <Image
                          src={SCHOOL.stampPath}
                          alt="Official School Stamp"
                          fill
                          className="object-contain"
                        />

                      </div>

                    </div>

                  </div>

                  {/* =================================================
                      MAIDAMMANATION TECHNOLOGY FOOTER
                  ================================================== */}
                  <div className="mt-1 border-t border-gray-500 pt-[2px] px-1 flex items-center justify-between text-[7px] leading-tight">

                    <div className="font-bold italic">
                      Maidammanation Tech Company
                    </div>

                    <div className="font-semibold text-center">
                      08032191668&nbsp;&nbsp;|&nbsp;&nbsp;08117106867
                    </div>

                    <div className="italic font-semibold">
                      School Management System
                    </div>

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
 * ============================================================
 * BEHAVIOUR CELL
 * ============================================================
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
    <div className="border-r border-b border-black p-[3px] flex items-center justify-between px-1.5 min-h-[20px]">

      <span className="italic leading-none">
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
        className="print:hidden w-4 h-4 text-center border border-gray-400 font-bold text-[8px] outline-none"
        aria-label={`${label} rating`}
      />

      {/* PRINT VALUE */}
      <span className="hidden print:inline font-bold text-[8px]">
        {value || "—"}
      </span>

    </div>
  );
}