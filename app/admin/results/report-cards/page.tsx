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
    useState<Behaviour>(
      emptyBehaviour
    );

  const [generalComment, setGeneralComment] =
    useState("");

  const [nextTermDate, setNextTermDate] =
    useState("");

  useEffect(() => {
    Promise.all([
      getClasses(),
      getSubjects(),
    ])
      .then(([classData, subjectData]) => {
        setClasses(
          classData as ClassRoom[]
        );

        setSubjects(
          subjectData as Subject[]
        );
      })
      .catch(() => {
        setClasses([]);
        setSubjects([]);
      });
  }, []);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      setStudentId("");
      return;
    }

    getStudentsByClass(classId)
      .then((data) =>
        setStudents(data as Student[])
      )
      .catch(() =>
        setStudents([])
      );
  }, [classId]);

  useEffect(() => {
    if (!studentId) {
      setResults([]);
      return;
    }

    setLoading(true);

    getResultsForStudent(
      studentId,
      term,
      session
    )
      .then((data) =>
        setResults(
          data as ResultEntry[]
        )
      )
      .catch(() =>
        setResults([])
      )
      .finally(() =>
        setLoading(false)
      );
  }, [
    studentId,
    term,
    session,
  ]);

  const student = students.find(
    (item) => item.id === studentId
  );

  const classRoom = classes.find(
    (item) => item.id === student?.classId
  );

  const mainSubjects = useMemo(() => {
    return results
      .map((result) => {
        const subject = subjects.find(
          (item) =>
            item.id === result.subjectId
        );

        return {
          result,
          subject,
        };
      })
      .filter(
        ({ subject }) =>
          subject &&
          subject.section !== "arabic" &&
          subject.scoringType !==
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
            item.id === result.subjectId
        );

        return {
          result,
          subject,
        };
      })
      .filter(
        ({ subject }) =>
          subject &&
          (subject.section ===
            "arabic" ||
            subject.scoringType ===
              "arabic-40-60")
      );
  }, [
    results,
    subjects,
    student,
  ]);

  const mainTotal = mainSubjects.reduce(
    (sum, item) =>
      sum + Number(item.result.total || 0),
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
        Number(
          item.result.total || 0
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
    <div className="max-w-5xl space-y-4">
      {/* CONTROL PANEL */}

      <div className="print:hidden">
        <h1 className="text-xl font-semibold text-gray-800">
          Generate Report Card
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Jidda Standard Academy
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
          }}
          options={[
            {
              label:
                "Select a class",
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
          onChange={(event) =>
            setStudentId(
              event.target.value
            )
          }
          options={[
            {
              label:
                "Select a student",
              value: "",
            },

            ...students.map((item) => ({
              label: `${item.firstName} ${item.lastName}`,
              value: item.id,
            })),
          ]}
        />
      </div>

      {loading && (
        <p className="print:hidden text-sm text-gray-400">
          Loading results...
        </p>
      )}

      {student && !loading && (
        <div className="report-card bg-white text-black border border-gray-400 shadow-sm print:shadow-none print:border-0">
          {/* HEADER */}

          <div className="border-2 border-black m-3">
            <div className="px-3 pt-3">
              <div className="grid grid-cols-[80px_1fr_80px] items-center gap-2">
                <div className="relative h-16 w-16">
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
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-wide">
                    JIDDA STANDARD ACADEMY
                  </h1>

                  <div className="mt-1 inline-block border border-gray-500 px-3 py-0.5 text-[9px] font-semibold">
                    Main Campus: No. 5 Hayin Dogo Anguwan Rahi Danmagaji, Zaria
                  </div>

                  <div className="mt-1 border border-gray-500 px-2 py-0.5 text-[9px] font-semibold">
                    Annex: No. 5 Aminu Mai Kai Close, Behind Baba Kaduna's Garage, Gaskiya Road, Zaria
                  </div>

                  <p className="mt-2 text-sm italic">
                    Motto: <b>Knowledge is Light</b>
                  </p>

                  <p className="text-[10px]">
                    Phone Numbers:
                    08121414008,
                    08069121401
                  </p>

                  <div className="mx-auto mt-1 max-w-xs bg-gray-300 py-1 text-[10px] font-semibold">
                    Email:
                  </div>
                </div>

                <div className="relative h-16 w-16 justify-self-end">
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

              <div className="mt-2 border-t-2 border-black pt-1 pb-1 text-center">
                <p className="text-sm font-semibold italic">
                  End of Term Examination Report Sheet (Primary Section)
                </p>
              </div>
            </div>

            {/* STUDENT INFORMATION */}

            <div className="border-t border-black">
              <div className="bg-gray-200 text-center font-semibold text-xs py-1">
                Student Information
              </div>

              <div className="grid grid-cols-2 text-xs">
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
              <div className="bg-gray-200 text-center font-semibold text-xs py-1">
                STUDENT ACADEMIC PERFORMANCE
              </div>

              <table className="w-full border-collapse text-[10px]">
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
                            item.result.id ||
                            item.result.subjectId
                          }
                        >
                          <td className="border border-black p-1 text-center">
                            {index + 1}
                          </td>

                          <td className="border border-black p-1">
                            {
                              item
                                .subject
                                ?.name
                            }
                          </td>

                          <td className="border border-black p-1 text-center">
                            {item.result.ca1 ??
                              "—"}
                          </td>

                          <td className="border border-black p-1 text-center">
                            {item.result.ca2 ??
                              "—"}
                          </td>

                          <td className="border border-black p-1 text-center">
                            {item.result.exam ??
                              "—"}
                          </td>

                          <td className="border border-black p-1 text-center font-semibold">
                            {item.result.total ??
                              "—"}
                          </td>

                          <td className="border border-black p-1 text-center font-semibold">
                            {item.result.grade ??
                              "—"}
                          </td>

                          <td className="border border-black p-1 text-center">
                            {item.result.remark ||
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
                <div className="bg-gray-200 text-center font-semibold text-xs py-1">
                  STUDENT ACADEMIC PERFORMANCE (ARABIC SECTION)
                </div>

                <table className="w-full border-collapse text-[9px]">
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
                        length: rows,
                      }).map(
                        (_, index) => {
                          const a =
                            left[index];

                          const b =
                            right[index];

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
                                {a?.result
                                  .ca1 ??
                                  ""}
                              </td>

                              <td className="border border-black p-1 text-center">
                                {a?.result
                                  .exam ??
                                  ""}
                              </td>

                              <td className="border border-black p-1 text-center font-semibold">
                                {a?.result
                                  .total ??
                                  ""}
                              </td>

                              <td className="border border-black p-1 text-center font-semibold">
                                {a?.result
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
                                {b?.result
                                  .ca1 ??
                                  ""}
                              </td>

                              <td className="border border-black p-1 text-center">
                                {b?.result
                                  .exam ??
                                  ""}
                              </td>

                              <td className="border border-black p-1 text-center font-semibold">
                                {b?.result
                                  .total ??
                                  ""}
                              </td>

                              <td className="border border-black p-1 text-center font-semibold">
                                {b?.result
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
              <div className="grid grid-cols-2 text-xs font-bold">
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
              <div className="bg-gray-200 text-center font-semibold text-xs py-1 italic">
                Behavioural Assessment
              </div>

              <div className="grid grid-cols-4 text-[10px]">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-black">
              <div className="border-r border-black p-2 text-[9px]">
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

              <div className="sm:col-span-2 p-2">
                <p className="text-center font-semibold italic text-xs">
                  General Comment:
                </p>

                <textarea
                  value={
                    generalComment
                  }
                  onChange={(event) =>
                    setGeneralComment(
                      event.target
                        .value
                    )
                  }
                  className="print:hidden mt-1 w-full min-h-[55px] resize-none border border-gray-300 p-2 text-xs"
                  placeholder="Enter general comment..."
                />

                <div className="hidden print:block min-h-[55px] text-center text-xs italic pt-2">
                  {generalComment ||
                    " "}
                </div>
              </div>
            </div>

            {/* NEXT TERM */}

            <div className="border-t border-black p-1 text-center text-xs">
              <b>
                Next term begins on:
              </b>{" "}

              <input
                type="text"
                value={nextTermDate}
                onChange={(event) =>
                  setNextTermDate(
                    event.target.value
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

            <div className="grid grid-cols-2 border-t border-black text-xs">
              <div className="border-r border-black p-3 text-center min-h-[90px]">
                <p className="font-semibold">
                  Director's
                </p>

                <p className="font-semibold">
                  Signature and Date
                </p>

                <div className="mt-8 border-t border-gray-400 pt-1">
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

                <div className="mt-8 border-t border-gray-400 pt-1">
                  Signature / Date
                </div>
              </div>
            </div>

            <div className="border-t border-black p-1 text-center text-[8px]">
              Designed & Developed by Maidammanation Tech Company
            </div>
          </div>

          {/* PRINT BUTTON */}

          <div className="print:hidden flex justify-end p-4">
            <Button
              onClick={() =>
                window.print()
              }
            >
              Print / Save as PDF
            </Button>
          </div>
        </div>
      )}
    </div>
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