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

function gradeRemark(grade?: string) {
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
  mainAverage: number,
  arabicAverage: number,
  hasMainSubjects: boolean,
  hasArabicSubjects: boolean
) {
  if (!hasMainSubjects && !hasArabicSubjects) {
    return "No academic results have been recorded for this student.";
  }

  let comment = "";

  if (overallAverage >= 80) {
    comment =
      "Outstanding performance! The student has demonstrated excellent understanding, strong academic ability, and outstanding achievement. Keep up the excellent work.";
  } else if (overallAverage >= 70) {
    comment =
      "Excellent performance! The student has shown strong understanding, consistent effort, and very good academic achievement. Continue striving for excellence.";
  } else if (overallAverage >= 60) {
    comment =
      "Very good overall performance. The student has demonstrated good understanding and steady progress. Continued effort and attention to weaker areas will lead to even better results.";
  } else if (overallAverage >= 50) {
    comment =
      "Good performance. The student has shown encouraging progress and should continue working harder, especially in weaker subjects, to improve overall achievement.";
  } else if (overallAverage >= 40) {
    comment =
      "Fair performance. The student needs more consistent study, practice, and attention to weaker subjects in order to improve academic performance.";
  } else {
    comment =
      "The student needs significant improvement. More regular study, guidance, practice, and attention to academic work are required to strengthen performance.";
  }

  if (
    hasArabicSubjects &&
    arabicAverage >= 75 &&
    hasMainSubjects &&
    mainAverage < 60
  ) {
    comment +=
      " The student has performed excellently in the Arabic section; more attention should be given to the main subjects to improve the overall result.";
  } else if (
    hasArabicSubjects &&
    arabicAverage >= 75
  ) {
    comment +=
      " The student has also performed excellently in the Arabic section.";
  } else if (
    hasArabicSubjects &&
    arabicAverage >= 60
  ) {
    comment +=
      " The student has shown good performance in the Arabic section.";
  } else if (
    hasMainSubjects &&
    mainAverage < 50
  ) {
    comment +=
      " Extra attention should be given to the weaker main subjects.";
  }

  return comment;
}

function safeNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

export default function ReportCardsPage() {
  const { session, term } =
    useSchoolSettings();

  const [classes, setClasses] =
    useState<ClassRoom[]>([]);

  const [subjects, setSubjects] =
    useState<Subject[]>([]);

  const [classId, setClassId] =
    useState("");

  const [students, setStudents] =
    useState<Student[]>([]);

  const [studentId, setStudentId] =
    useState("");

  const [results, setResults] =
    useState<ResultEntry[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [behaviour, setBehaviour] =
    useState<Behaviour>(emptyBehaviour);

  const [nextTermDate, setNextTermDate] =
    useState("");

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getClasses(),
      getSubjects(),
    ])
      .then(
        ([
          classData,
          subjectData,
        ]) => {
          if (!mounted) return;

          setClasses(
            (classData || []) as ClassRoom[]
          );

          setSubjects(
            (subjectData || []) as Subject[]
          );
        }
      )
      .catch(() => {
        if (!mounted) return;

        setClasses([]);
        setSubjects([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!classId) {
      setStudents([]);
      setStudentId("");
      setResults([]);
      return;
    }

    getStudentsByClass(classId)
      .then((data) => {
        if (!mounted) return;

        setStudents(
          (data || []) as Student[]
        );
      })
      .catch(() => {
        if (!mounted) return;

        setStudents([]);
      });

    return () => {
      mounted = false;
    };
  }, [classId]);

  useEffect(() => {
    let mounted = true;

    if (!studentId) {
      setResults([]);
      setBehaviour(emptyBehaviour);
      setNextTermDate("");
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

        setResults(
          (data || []) as ResultEntry[]
        );
      })
      .catch(() => {
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
  }, [
    studentId,
    term,
    session,
  ]);

  const student = students.find(
    (item) => item.id === studentId
  );

  const classRoom = classes.find(
    (item) =>
      item.id === student?.classId
  );

  const mainSubjects = useMemo(() => {
    return results
      .map((result) => {
        const subject = subjects.find(
          (item) =>
            item.id ===
            result.subjectId
        );

        return {
          result,
          subject,
        };
      })
      .filter(
        ({ subject }) =>
          Boolean(subject) &&
          subject?.section !==
            "arabic" &&
          subject?.scoringType !==
            "arabic-40-60"
      );
  }, [results, subjects]);

  const arabicSubjects = useMemo(() => {
    if (!student?.attendsArabic) {
      return [];
    }

    return results
      .map((result) => {
        const subject = subjects.find(
          (item) =>
            item.id ===
            result.subjectId
        );

        return {
          result,
          subject,
        };
      })
      .filter(
        ({ subject }) =>
          Boolean(subject) &&
          (
            subject?.section ===
              "arabic" ||
            subject?.scoringType ===
              "arabic-40-60"
          )
      );
  }, [
    results,
    subjects,
    student,
  ]);

  const mainTotal =
    mainSubjects.reduce(
      (sum, item) =>
        sum +
        safeNumber(
          item.result.total
        ),
      0
    );

  const mainAverage =
    mainSubjects.length > 0
      ? mainTotal /
        mainSubjects.length
      : 0;

  const arabicTotal =
    arabicSubjects.reduce(
      (sum, item) =>
        sum +
        safeNumber(
          item.result.total
        ),
      0
    );

  const arabicAverage =
    arabicSubjects.length > 0
      ? arabicTotal /
        arabicSubjects.length
      : 0;

  const overallTotal =
    mainTotal + arabicTotal;

  const overallSubjectCount =
    mainSubjects.length +
    arabicSubjects.length;

  const overallAverage =
    overallSubjectCount > 0
      ? overallTotal /
        overallSubjectCount
      : 0;

  const generalComment =
    generateGeneralComment(
      overallAverage,
      mainAverage,
      arabicAverage,
      mainSubjects.length > 0,
      arabicSubjects.length > 0
    );

  const updateBehaviour = (
    field: keyof Behaviour,
    value: string
  ) => {
    if (
      value !== "" &&
      !/^[1-5]?$/.test(value)
    ) {
      return;
    }

    setBehaviour((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const className =
    classRoom?.name ||
    student?.className ||
    "";

  return (
    <>
      <style jsx global>{`
        /*
         * A4 PRINT SETTINGS
         * Physical A4 = 210mm x 297mm
         */

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            width: 210mm !important;
            height: 297mm !important;
            min-width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /*
           * Hide everything except the report.
           */

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

            width: 210mm !important;
            height: 297mm !important;

            margin: 0 !important;
            padding: 0 !important;

            overflow: hidden !important;

            background: white !important;
          }

          /*
           * The actual report is slightly smaller
           * than A4 so nothing touches the printer edge.
           */

          .a4-report {
            position: absolute !important;

            left: 5mm !important;
            top: 5mm !important;

            width: 200mm !important;

            /*
             * Natural report height is allowed,
             * then scaled down to fit exactly.
             */

            transform-origin: top left !important;

            /*
             * This scale is intentionally compact.
             * It makes the complete report fit
             * inside one A4 page.
             */

            transform: scale(0.94) !important;

            margin: 0 !important;
            padding: 0 !important;

            border: 0 !important;
            box-shadow: none !important;

            page-break-before: avoid !important;
            page-break-after: avoid !important;
            break-before: avoid !important;
            break-after: avoid !important;
          }

          .a4-report-inner {
            width: 200mm !important;
            margin: 0 !important;
            padding: 0 !important;

            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /*
           * Compact print typography.
           */

          .print-header {
            padding: 2mm 2mm 0 2mm !important;
          }

          .print-logo {
            width: 13mm !important;
            height: 13mm !important;
          }

          .print-school-name {
            font-size: 17px !important;
            line-height: 18px !important;
          }

          .print-address {
            font-size: 7px !important;
            line-height: 8px !important;
            margin-top: 1px !important;
          }

          .print-motto {
            font-size: 8px !important;
            line-height: 9px !important;
            margin-top: 1px !important;
          }

          .print-phone {
            font-size: 7px !important;
            line-height: 8px !important;
          }

          .print-email {
            font-size: 6px !important;
            line-height: 7px !important;
            padding: 1px !important;
            margin-top: 1px !important;
          }

          .print-title {
            font-size: 9px !important;
            line-height: 10px !important;
            padding: 1px !important;
            margin-top: 1px !important;
          }

          .print-section-title {
            font-size: 8px !important;
            line-height: 9px !important;
            padding: 1px !important;
          }

          /*
           * Student information.
           */

          .print-student-info {
            font-size: 7.5px !important;
            line-height: 9px !important;
          }

          .print-student-info > div {
            padding: 1px 2px !important;
          }

          /*
           * Main table.
           */

          .print-main-table {
            font-size: 7px !important;
            line-height: 8px !important;
          }

          .print-main-table th,
          .print-main-table td {
            padding: 1px 1.5px !important;
            line-height: 8px !important;
          }

          /*
           * Arabic table.
           */

          .print-arabic-table {
            font-size: 6.5px !important;
            line-height: 7px !important;
          }

          .print-arabic-table th,
          .print-arabic-table td {
            padding: 1px !important;
            line-height: 7px !important;
          }

          /*
           * Overall result.
           */

          .print-overall {
            font-size: 7.5px !important;
            line-height: 9px !important;
          }

          .print-overall > div {
            padding: 1px 2px !important;
          }

          /*
           * Behaviour.
           */

          .print-behaviour {
            font-size: 6.5px !important;
            line-height: 7px !important;
          }

          .print-behaviour > div {
            padding: 1px 2px !important;
          }

          .print-behaviour input {
            width: 14px !important;
            height: 12px !important;
            font-size: 7px !important;
          }

          /*
           * Guide and comment.
           */

          .print-guide-comment {
            font-size: 6.5px !important;
            line-height: 7px !important;
          }

          .print-guide {
            padding: 1.5px !important;
          }

          .print-comment {
            padding: 1.5px 3px !important;
          }

          .print-comment-title {
            font-size: 7px !important;
            line-height: 8px !important;
          }

          .print-comment-text {
            min-height: 23px !important;
            height: 23px !important;
            padding-top: 1px !important;
            margin-top: 0 !important;
            font-size: 6.5px !important;
            line-height: 8px !important;
          }

          /*
           * Next term.
           */

          .print-next-term {
            font-size: 7px !important;
            line-height: 8px !important;
            padding: 1.5px !important;
          }

          /*
           * Signatures.
           */

          .print-signatures {
            font-size: 7px !important;
            line-height: 8px !important;
          }

          .print-signatures > div {
            min-height: 38px !important;
            height: 38px !important;
            padding: 2px !important;
          }

          .print-signature-line {
            margin-top: 5px !important;
            padding-top: 1px !important;
          }

          /*
           * Completely remove the old
           * developer footer.
           */

          .developer-footer {
            display: none !important;
          }

          /*
           * Never allow individual sections
           * to create another page.
           */

          .a4-report,
          .a4-report-inner,
          .a4-report table,
          .a4-report tr,
          .a4-report td,
          .a4-report th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          /*
           * Hide print button.
           */

          .print-button {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-5xl space-y-4">
        {/* CONTROL PANEL */}

        <div className="print:hidden">
          <h1 className="text-xl font-semibold text-gray-800">
            Generate Report Card
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            {SCHOOL.name ||
              "Jidda Standard Academy"}
          </p>
        </div>

        <div className="print:hidden bg-white rounded-card border border-gray-100 shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput
            label="Class"
            value={classId}
            onChange={(event) => {
              setClassId(
                event.target.value
              );

              setStudentId("");
              setResults([]);

              setBehaviour(
                emptyBehaviour
              );

              setNextTermDate("");
            }}
            options={[
              {
                label:
                  "Select a class",
                value: "",
              },

              ...classes.map(
                (item) => ({
                  label: item.name,
                  value: item.id,
                })
              ),
            ]}
          />

          <SelectInput
            label="Student"
            value={studentId}
            onChange={(event) => {
              setStudentId(
                event.target.value
              );

              setBehaviour(
                emptyBehaviour
              );

              setNextTermDate("");
            }}
            options={[
              {
                label:
                  "Select a student",
                value: "",
              },

              ...students.map(
                (item) => ({
                  label: `${item.firstName} ${item.lastName}`,
                  value: item.id,
                })
              ),
            ]}
          />
        </div>

        {loading && (
          <p className="print:hidden text-sm text-gray-400">
            Loading results...
          </p>
        )}

        {student && !loading && (
          <div className="a4-report-wrapper">
            <div className="a4-report">
              <div className="a4-report-inner">
                <div className="report-card bg-white text-black border border-gray-400 shadow-sm print:shadow-none print:border-0">
                  {/* REPORT BORDER */}

                  <div className="border-2 border-black m-3">
                    {/* HEADER */}

                    <div className="print-header px-3 pt-3">
                      <div className="grid grid-cols-[80px_1fr_80px] items-center gap-2">
                        <div className="print-logo relative h-16 w-16">
                          <Image
                            src={
                              SCHOOL.logoPath
                            }
                            alt="School Logo"
                            fill
                            className="object-contain"
                          />
                        </div>

                        <div className="text-center">
                          <h1 className="print-school-name text-xl sm:text-2xl font-extrabold tracking-wide">
                            {SCHOOL.name ||
                              "JIDDA STANDARD ACADEMY"}
                          </h1>

                          <div className="print-address mt-1 inline-block border border-gray-500 px-3 py-0.5 text-[9px] font-semibold">
                            Main Campus: No. 5 Hayin Dogo Anguwan Rahi Danmagaji, Zaria
                          </div>

                          <div className="print-address mt-1 border border-gray-500 px-2 py-0.5 text-[9px] font-semibold">
                            Annex: No. 5 Aminu Mai Kai Close, Behind Baba Kaduna's Garage, Gaskiya Road, Zaria
                          </div>

                          <p className="print-motto mt-2 text-sm italic">
                            Motto:{" "}
                            <b>
                              Knowledge is Light
                            </b>
                          </p>

                          <p className="print-phone text-[10px]">
                            Phone Numbers:
                            08121414008,
                            08069121401
                          </p>

                          <div className="print-email mx-auto mt-1 max-w-xs bg-gray-300 py-1 text-[10px] font-semibold">
                            Email:
                          </div>
                        </div>

                        <div className="print-logo relative h-16 w-16 justify-self-end">
                          <Image
                            src={
                              SCHOOL.logoPath
                            }
                            alt="School Emblem"
                            fill
                            className="object-contain"
                          />
                        </div>
                      </div>

                      <div className="print-title mt-2 border-t-2 border-black pt-1 pb-1 text-center">
                        <p className="text-sm font-semibold italic">
                          End of Term Examination Report Sheet (Primary Section)
                        </p>
                      </div>
                    </div>

                    {/* STUDENT INFORMATION */}

                    <div className="border-t border-black">
                      <div className="print-section-title bg-gray-200 text-center font-semibold text-xs py-1">
                        Student Information
                      </div>

                      <div className="print-student-info grid grid-cols-2 text-xs">
                        <div className="border-t border-r border-black p-1">
                          <b>Name:</b>{" "}
                          {student.firstName}{" "}
                          {student.lastName}
                        </div>

                        <div className="border-t border-black p-1">
                          <b>Class:</b>{" "}
                          {className}
                        </div>

                        <div className="border-t border-r border-black p-1">
                          <b>Session:</b>{" "}
                          {session}
                        </div>

                        <div className="border-t border-black p-1">
                          <b>Number in Class:</b>{" "}
                          {students.length}
                        </div>

                        <div className="border-t border-r border-black p-1">
                          <b>Admission No:</b>{" "}
                          {student.admissionNo}
                        </div>

                        <div className="border-t border-black p-1">
                          <b>Term:</b>{" "}
                          {term}
                        </div>
                      </div>
                    </div>

                    {/* MAIN PERFORMANCE */}

                    <div className="border-t border-black">
                      <div className="print-section-title bg-gray-200 text-center font-semibold text-xs py-1">
                        STUDENT ACADEMIC PERFORMANCE
                      </div>

                      <table className="print-main-table w-full border-collapse text-[10px]">
                        <thead>
                          <tr>
                            <th className="border border-black p-1">
                              S/N
                            </th>

                            <th className="border border-black p-1">
                              SUBJECTS
                            </th>

                            <th className="border border-black p-1">
                              1ST C.A (20)
                            </th>

                            <th className="border border-black p-1">
                              2ND C.A (20)
                            </th>

                            <th className="border border-black p-1">
                              EXAM (60)
                            </th>

                            <th className="border border-black p-1">
                              TOTAL
                              <br />
                              (100)
                            </th>

                            <th className="border border-black p-1">
                              GRADE
                            </th>

                            <th className="border border-black p-1">
                              REMARK
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {mainSubjects.length ===
                          0 ? (
                            <tr>
                              <td
                                colSpan={8}
                                className="border border-black p-3 text-center"
                              >
                                No main subject
                                results recorded.
                              </td>
                            </tr>
                          ) : (
                            mainSubjects.map(
                              (
                                item,
                                index
                              ) => (
                                <tr
                                  key={
                                    item
                                      .result
                                      .id ||
                                    item
                                      .result
                                      .subjectId
                                  }
                                >
                                  <td className="border border-black p-1 text-center">
                                    {index +
                                      1}
                                  </td>

                                  <td className="border border-black p-1">
                                    {
                                      item
                                        .subject
                                        ?.name
                                    }
                                  </td>

                                  <td className="border border-black p-1 text-center">
                                    {item.result
                                      .ca1 ??
                                      "—"}
                                  </td>

                                  <td className="border border-black p-1 text-center">
                                    {item.result
                                      .ca2 ??
                                      "—"}
                                  </td>

                                  <td className="border border-black p-1 text-center">
                                    {item.result
                                      .exam ??
                                      "—"}
                                  </td>

                                  <td className="border border-black p-1 text-center font-semibold">
                                    {item.result
                                      .total ??
                                      "—"}
                                  </td>

                                  <td className="border border-black p-1 text-center font-semibold">
                                    {item.result
                                      .grade ??
                                      "—"}
                                  </td>

                                  <td className="border border-black p-1 text-center">
                                    {item.result
                                      .remark ||
                                      gradeRemark(
                                        item
                                          .result
                                          .grade
                                      )}
                                  </td>
                                </tr>
                              )
                            )
                          )}

                          <tr>
                            <td
                              colSpan={2}
                              className="border border-black p-1 text-right font-bold"
                            >
                              TOTAL:
                            </td>

                            <td
                              colSpan={3}
                              className="border border-black p-1 text-center font-bold"
                            >
                              {mainTotal}
                            </td>

                            <td
                              colSpan={2}
                              className="border border-black p-1 text-right font-bold"
                            >
                              AVERAGE:
                            </td>

                            <td className="border border-black p-1 text-center font-bold">
                              {mainAverage.toFixed(
                                2
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* ARABIC */}

                    {student.attendsArabic && (
                      <div className="border-t border-black">
                        <div className="print-section-title bg-gray-200 text-center font-semibold text-xs py-1">
                          STUDENT ACADEMIC PERFORMANCE (ARABIC SECTION)
                        </div>

                        <table className="print-arabic-table w-full border-collapse text-[9px]">
                          <thead>
                            <tr>
                              <th className="border border-black p-1">
                                S/N
                              </th>

                              <th className="border border-black p-1">
                                SUBJECTS
                              </th>

                              <th className="border border-black p-1">
                                C.A
                                <br />
                                (40)
                              </th>

                              <th className="border border-black p-1">
                                EXAM
                                <br />
                                (60)
                              </th>

                              <th className="border border-black p-1">
                                TOTAL
                                <br />
                                (100)
                              </th>

                              <th className="border border-black p-1">
                                GRADE
                              </th>

                              <th className="border border-black p-1">
                                S/N
                              </th>

                              <th className="border border-black p-1">
                                SUBJECTS
                              </th>

                              <th className="border border-black p-1">
                                C.A
                                <br />
                                (40)
                              </th>

                              <th className="border border-black p-1">
                                EXAM
                                <br />
                                (60)
                              </th>

                              <th className="border border-black p-1">
                                TOTAL
                                <br />
                                (100)
                              </th>

                              <th className="border border-black p-1">
                                GRADE
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {(() => {
                              const left =
                                arabicSubjects.slice(
                                  0,
                                  4
                                );

                              const right =
                                arabicSubjects.slice(
                                  4,
                                  8
                                );

                              const rows =
                                Math.max(
                                  left.length,
                                  right.length,
                                  1
                                );

                              return Array.from({
                                length:
                                  rows,
                              }).map(
                                (
                                  _,
                                  index
                                ) => {
                                  const a =
                                    left[
                                      index
                                    ];

                                  const b =
                                    right[
                                      index
                                    ];

                                  return (
                                    <tr
                                      key={
                                        index
                                      }
                                    >
                                      <td className="border border-black p-1 text-center">
                                        {a
                                          ? index +
                                            1
                                          : ""}
                                      </td>

                                      <td className="border border-black p-1 text-center">
                                        {a
                                          ?.subject
                                          ?.name ||
                                          ""}
                                      </td>

                                      <td className="border border-black p-1 text-center">
                                        {a
                                          ?.result
                                          .ca1 ??
                                          ""}
                                      </td>

                                      <td className="border border-black p-1 text-center">
                                        {a
                                          ?.result
                                          .exam ??
                                          ""}
                                      </td>

                                      <td className="border border-black p-1 text-center font-semibold">
                                        {a
                                          ?.result
                                          .total ??
                                          ""}
                                      </td>

                                      <td className="border border-black p-1 text-center font-semibold">
                                        {a
                                          ?.result
                                          .grade ??
                                          ""}
                                      </td>

                                      <td className="border border-black p-1 text-center">
                                        {b
                                          ? index +
                                            5
                                          : ""}
                                      </td>

                                      <td className="border border-black p-1 text-center">
                                        {b
                                          ?.subject
                                          ?.name ||
                                          ""}
                                      </td>

                                      <td className="border border-black p-1 text-center">
                                        {b
                                          ?.result
                                          .ca1 ??
                                          ""}
                                      </td>

                                      <td className="border border-black p-1 text-center">
                                        {b
                                          ?.result
                                          .exam ??
                                          ""}
                                      </td>

                                      <td className="border border-black p-1 text-center font-semibold">
                                        {b
                                          ?.result
                                          .total ??
                                          ""}
                                      </td>

                                      <td className="border border-black p-1 text-center font-semibold">
                                        {b
                                          ?.result
                                          .grade ??
                                          ""}
                                      </td>
                                    </tr>
                                  );
                                }
                              );
                            })()}

                            <tr>
                              <td
                                colSpan={2}
                                className="border border-black p-1 text-right font-bold"
                              >
                                TOTAL:
                              </td>

                              <td
                                colSpan={4}
                                className="border border-black p-1 text-center font-bold"
                              >
                                {arabicTotal}
                              </td>

                              <td
                                colSpan={4}
                                className="border border-black p-1 text-right font-bold"
                              >
                                AVERAGE:
                              </td>

                              <td
                                colSpan={2}
                                className="border border-black p-1 text-center font-bold"
                              >
                                {arabicAverage.toFixed(
                                  2
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* OVERALL */}

                    <div className="border-t border-black">
                      <div className="print-overall grid grid-cols-2 text-xs font-bold">
                        <div className="border-r border-black p-1 text-right">
                          OVERALL TOTAL:
                        </div>

                        <div className="p-1">
                          {overallTotal}
                        </div>

                        <div className="border-t border-r border-black p-1 text-right">
                          OVERALL AVERAGE:
                        </div>

                        <div className="border-t border-black p-1">
                          {overallAverage.toFixed(
                            2
                          )}
                        </div>
                      </div>
                    </div>

                    {/* BEHAVIOURAL ASSESSMENT */}

                    <div className="border-t border-black">
                      <div className="print-section-title bg-gray-200 text-center font-semibold text-xs py-1 italic">
                        Behavioural Assessment
                      </div>

                      <div className="print-behaviour grid grid-cols-4 text-[10px]">
                        <BehaviourField
                          label="Conduct"
                          value={
                            behaviour.conduct
                          }
                          onChange={(value) =>
                            updateBehaviour(
                              "conduct",
                              value
                            )
                          }
                        />

                        <BehaviourField
                          label="Hospitality"
                          value={
                            behaviour.hospitality
                          }
                          onChange={(value) =>
                            updateBehaviour(
                              "hospitality",
                              value
                            )
                          }
                        />

                        <BehaviourField
                          label="Punctuality"
                          value={
                            behaviour.punctuality
                          }
                          onChange={(value) =>
                            updateBehaviour(
                              "punctuality",
                              value
                            )
                          }
                        />

                        <BehaviourField
                          label="Participation in Class"
                          value={
                            behaviour.participation
                          }
                          onChange={(value) =>
                            updateBehaviour(
                              "participation",
                              value
                            )
                          }
                        />

                        <BehaviourField
                          label="Creativity"
                          value={
                            behaviour.creativity
                          }
                          onChange={(value) =>
                            updateBehaviour(
                              "creativity",
                              value
                            )
                          }
                        />

                        <BehaviourField
                          label="Neatness"
                          value={
                            behaviour.neatness
                          }
                          onChange={(value) =>
                            updateBehaviour(
                              "neatness",
                              value
                            )
                          }
                        />

                        <BehaviourField
                          label="Dedication"
                          value={
                            behaviour.dedication
                          }
                          onChange={(value) =>
                            updateBehaviour(
                              "dedication",
                              value
                            )
                          }
                        />

                        <BehaviourField
                          label="Physical Health"
                          value={
                            behaviour.physicalHealth
                          }
                          onChange={(value) =>
                            updateBehaviour(
                              "physicalHealth",
                              value
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* GUIDE + COMMENT */}

                    <div className="print-guide-comment grid grid-cols-1 sm:grid-cols-3 border-t border-black">
                      <div className="print-guide border-r border-black p-2 text-[9px]">
                        <p className="font-bold underline">
                          GUIDE:
                        </p>

                        <p>
                          5 - Excellent
                        </p>

                        <p>
                          4 - V. Good
                        </p>

                        <p>
                          3 - Good
                        </p>

                        <p>
                          2 - Fair
                        </p>

                        <p>
                          1 - Weak
                        </p>
                      </div>

                      <div className="print-comment sm:col-span-2 p-2">
                        <p className="print-comment-title text-center font-semibold italic text-xs">
                          General Comment:
                        </p>

                        <div className="print-comment-text mt-1 min-h-[55px] text-center text-xs italic pt-2">
                          {generalComment}
                        </div>
                      </div>
                    </div>

                    {/* NEXT TERM */}

                    <div className="print-next-term border-t border-black p-1 text-center text-xs">
                      <b>
                        Next term begins on:
                      </b>{" "}

                      <input
                        type="text"
                        value={
                          nextTermDate
                        }
                        onChange={(
                          event
                        ) =>
                          setNextTermDate(
                            event.target
                              .value
                          )
                        }
                        className="print:hidden border-b border-black outline-none text-center px-2"
                        placeholder="e.g. 30th March, 2026"
                      />

                      <span className="hidden print:inline">
                        {nextTermDate}
                      </span>
                    </div>

                    {/* SIGNATURES */}

                    <div className="print-signatures grid grid-cols-2 border-t border-black text-xs">
                      <div className="border-r border-black p-3 text-center min-h-[90px]">
                        <p className="font-semibold">
                          Director's
                        </p>

                        <p className="font-semibold">
                          Signature and Date
                        </p>

                        <div className="print-signature-line mt-8 border-t border-gray-400 pt-1">
                          Signature / Date
                        </div>
                      </div>

                      <div className="p-3 text-center min-h-[90px]">
                        <p className="font-semibold">
                          Headmaster's/Headmistress
                        </p>

                        <p className="font-semibold">
                          Signature and Date
                        </p>

                        <div className="print-signature-line mt-8 border-t border-gray-400 pt-1">
                          Signature / Date
                        </div>
                      </div>
                    </div>

                    {/* NO DEVELOPER FOOTER */}
                  </div>
                </div>

                {/* PRINT BUTTON */}

                <div className="print:hidden print-button flex justify-end p-4">
                  <Button
                    onClick={() =>
                      window.print()
                    }
                  >
                    Print / Save as PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function BehaviourField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-r border-b border-black p-1 flex items-center justify-between gap-2">
      <span className="italic">
        {label}
      </span>

      <input
        type="text"
        inputMode="numeric"
        maxLength={1}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="print:hidden w-6 h-5 border border-gray-300 text-center font-bold"
      />

      <span className="hidden print:inline font-bold">
        {value || "—"}
      </span>
    </div>
  );
}