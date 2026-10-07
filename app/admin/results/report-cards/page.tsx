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

import type { ClassRoom, ResultEntry, Student, Subject } from "@/lib/types";

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
      return "Pass"; // FIX: was "Fair" — sample shows D = Pass
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
): string {
  if (!hasMainSubjects && !hasArabicSubjects) {
    return "No academic results have been recorded for this student.";
  }

  // FIX: tiers were shifted by one level (80+ had the 70+ phrase, etc).
  // Each phrase now sits one bracket lower so quality ascends correctly,
  // and 67.68 (your sample) now correctly returns the "very good result" line.
  if (overallAverage >= 80) {
    return "Excellent performance! Continue striving for excellence.";
  } else if (overallAverage >= 70) {
    return "Very good overall performance. Keep working hard.";
  } else if (overallAverage >= 60) {
    return "Very good result, keep pushing and all the hard work will pay up!";
  } else if (overallAverage >= 50) {
    return "Good performance. Encouraging progress.";
  } else if (overallAverage >= 40) {
    return "Fair performance. More consistent study required.";
  } else {
    return "Requires significant improvement and regular study.";
  }
}

export default function ReportCardsPage() {
  const { session, term } = useSchoolSettings();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");

  const [results, setResults] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [behaviour, setBehaviour] = useState<Behaviour>(emptyBehaviour);
  const [nextTermDate, setNextTermDate] = useState("30th MARCH, 2026");

  // ADDED: single shared date for BOTH signature lines. Director's and
  // Headmaster's date inputs both read/write this one value, so editing
  // either one updates the other automatically (as requested).
  const [signatureDate, setSignatureDate] = useState("26 February, 2026");

  useEffect(() => {
    let mounted = true;

    Promise.all([getClasses(), getSubjects()])
      .then(([classData, subjectData]) => {
        if (!mounted) return;
        setClasses((classData || []) as ClassRoom[]);
        setSubjects((subjectData || []) as Subject[]);
      })
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
        setStudents((data || []) as Student[]);
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
      setLoading(false);
      return;
    }

    setLoading(true);

    getResultsForStudent(studentId, term, session)
      .then((data) => {
        if (!mounted) return;
        setResults((data || []) as ResultEntry[]);
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
  }, [studentId, term, session]);

  const student = students.find((item) => item.id === studentId);
  const classRoom = classes.find((item) => item.id === student?.classId);

  const mainSubjects = useMemo(() => {
    return results
      .map((result) => {
        const subject = subjects.find((item) => item.id === result.subjectId);
        return { result, subject };
      })
      .filter(
        ({ subject }) =>
          Boolean(subject) &&
          subject?.section !== "arabic" &&
          subject?.scoringType !== "arabic-40-60"
      );
  }, [results, subjects]);

  const arabicSubjects = useMemo(() => {
    if (!student?.attendsArabic) {
      return [];
    }

    return results
      .map((result) => {
        const subject = subjects.find((item) => item.id === result.subjectId);
        return { result, subject };
      })
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

  const mainAverage =
    mainSubjects.length > 0 ? mainTotal / mainSubjects.length : 0;

  const arabicTotal = arabicSubjects.reduce(
    (sum, item) => sum + safeNumber(item.result.total),
    0
  );

  const arabicAverage =
    arabicSubjects.length > 0 ? arabicTotal / arabicSubjects.length : 0;

  const overallTotal = mainTotal + arabicTotal;
  const overallCount = mainSubjects.length + arabicSubjects.length;
  const overallAverage =
    overallCount > 0 ? overallTotal / overallCount : 0;

  const generalComment = generateGeneralComment(
    overallAverage,
    mainAverage,
    arabicAverage,
    mainSubjects.length > 0,
    arabicSubjects.length > 0
  );

  function updateBehaviour(field: keyof Behaviour, value: string) {
    if (value !== "" && !/^[1-5]?$/.test(value)) {
      return;
    }

    setBehaviour((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  const className = classRoom?.name || student?.className || "PRIMARY TWO";

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');

        @page {
          /* FIX: "portrait" alone leaves paper size up to the browser/printer
             default. If that default is Letter (279mm tall) instead of
             A4 (297mm tall), this content — sized for A4 — overflows onto
             a second page. Naming the size removes that ambiguity. */
          size: A4 portrait;
          margin: 6mm;
        }

        .report-card-font {
          font-family: 'Times New Roman', Times, serif, sans-serif;
        }

        @media print {
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
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
            box-sizing: border-box !important;
            /* FIX: reduced from 4mm now that @page margin (6mm) also applies,
               so the two don't stack into an oversized combined margin that
               eats into the usable page height. */
            padding: 2mm !important;
          }

          .print-button,
          .print-controls {
            display: none !important;
          }
        }
      `}</style>

      <div className="max-w-5xl space-y-4 report-card-font mx-auto">
        {/* CONTROL PANEL */}
        <div className="print:hidden print-controls grid grid-cols-1 gap-4 rounded-card border border-gray-100 bg-white p-6 shadow-sm md:grid-cols-2">
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
              { label: "Select a class", value: "" },
              ...classes.map((item) => ({ label: item.name, value: item.id })),
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
              { label: "Select a student", value: "" },
              ...students.map((item) => ({
                label: `${item.firstName} ${item.lastName}`,
                value: item.id,
              })),
            ]}
          />
        </div>

        {loading && (
          <p className="print:hidden text-sm text-gray-400">Loading results...</p>
        )}

        {student && !loading && (
          <div className="a4-report-wrapper w-full">
            {/* FULL WIDTH STRETCH CONTAINER WITH DOUBLE BORDER */}
            <div className="w-full border-[3px] border-gray-800 p-[1.5mm] bg-white text-black box-border">
              <div className="border border-gray-800 relative p-1">

                {/* HEADER SECTION */}
                <div className="text-center pt-1">
                  <h1 className="text-[21px] sm:text-[23px] font-extrabold tracking-wider uppercase leading-none font-serif">
                    JIDDA STANDARD ACADEMY
                  </h1>

                  <div className="mt-1 bg-gray-600 text-white text-[8.5px] font-semibold py-[1px] px-2 mx-1">
                    Main Campus: No. 5 Hayin Dogo Anguwan Rafi Danmagaji, Zaria
                  </div>
                  <div className="mt-0.5 bg-gray-600 text-white text-[8px] font-semibold py-[1px] px-2 mx-1">
                    Annex: No. 5 Aminu Mai Kai Close, Behind Baba Kaduna&apos;s Garage, Gaskiya Road, Zaria
                  </div>

                  <div className="relative mt-1 px-10">
                    <div className="absolute left-1 top-0 h-10 w-10">
                      <Image
                        src={SCHOOL.logoPath}
                        alt="Logo"
                        fill
                        className="object-contain"
                      />
                    </div>

                    <p className="text-[10px] italic font-semibold">
                      Motto: Knowledge is Light
                    </p>
                    <p className="text-[9px] font-bold">
                      Phone Numbers: 08121414008, 08069121401
                    </p>

                    <div className="bg-gray-400 text-white text-[8.5px] font-bold py-[0.5px] mt-0.5 mx-auto w-3/5">
                      Email:
                    </div>

                    {/* Mirrored crest (same logo on both sides, per confirmed direction) */}
                    <div className="absolute right-1 top-0 h-10 w-10">
                      <Image
                        src={SCHOOL.logoPath}
                        alt="Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>

                  <div className="mt-1 border-t border-b border-gray-800 py-0.5">
                    <p className="text-[11px] font-bold italic tracking-wide">
                      End of Term Examination Report Sheet (Primary Section)
                    </p>
                  </div>
                </div>

                {/* STUDENT INFORMATION */}
                <div>
                  <div className="bg-gray-300 text-center font-bold text-[9.5px] italic border-b border-gray-800 py-[1px]">
                    Student Information
                  </div>
                  <table className="w-full text-[9.5px] border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="w-16 font-bold p-0.5 border-r border-gray-800">Name:</td>
                        <td className="p-0.5 border-r border-gray-800 uppercase font-bold text-center">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="w-16 font-bold p-0.5 border-r border-gray-800">Class:</td>
                        <td className="p-0.5 uppercase font-bold text-center">{className}</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="font-bold p-0.5 border-r border-gray-800">Session:</td>
                        <td className="p-0.5 border-r border-gray-800 text-center font-bold">{session}</td>
                        <td className="font-bold p-0.5 border-r border-gray-800">Number in Class:</td>
                        <td className="p-0.5 border-r border-gray-800 text-center font-bold">{students.length}</td>
                        <td className="w-12 font-bold p-0.5 border-r border-gray-800">Term:</td>
                        <td className="p-0.5 text-center font-bold uppercase">{term}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* MAIN SUBJECTS TABLE */}
                <div>
                  <div className="bg-gray-300 text-center font-bold text-[9.5px] uppercase border-t border-b border-gray-800 py-[1px]">
                    STUDENT ACADEMIC PERFORMANCE
                  </div>

                  <table className="w-full text-[9.5px] border-collapse">
                    <thead>
                      <tr className="border-b border-gray-800 font-bold italic">
                        <th className="border-r border-gray-800 p-0.5 w-[5%] text-center">S/N</th>
                        <th className="border-r border-gray-800 p-0.5 w-[32%] text-left pl-2">SUBJECTS</th>
                        <th className="border-r border-gray-800 p-0.5 w-[11%] text-center">1ST C.A (20)</th>
                        <th className="border-r border-gray-800 p-0.5 w-[11%] text-center">2ND C.A (20)</th>
                        <th className="border-r border-gray-800 p-0.5 w-[11%] text-center">EXAM (60)</th>
                        <th className="border-r border-gray-800 p-0.5 w-[10%] text-center">TOTAL (100)</th>
                        <th className="border-r border-gray-800 p-0.5 w-[8%] text-center">GRADE</th>
                        <th className="p-0.5 w-[12%] text-center">REMARK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mainSubjects.map((item, index) => (
                        <tr key={index} className="border-b border-gray-800">
                          <td className="border-r border-gray-800 p-0.5 text-center">{index + 1}</td>
                          <td className="border-r border-gray-800 p-0.5 pl-2 font-semibold">{item.subject?.name}</td>
                          <td className="border-r border-gray-800 p-0.5 text-center">{item.result.ca1 ?? "—"}</td>
                          <td className="border-r border-gray-800 p-0.5 text-center">{item.result.ca2 ?? "—"}</td>
                          <td className="border-r border-gray-800 p-0.5 text-center">{item.result.exam ?? "—"}</td>
                          <td className="border-r border-gray-800 p-0.5 text-center font-bold">{item.result.total ?? "—"}</td>
                          <td className="border-r border-gray-800 p-0.5 text-center font-bold">{item.result.grade ?? "—"}</td>
                          <td className="p-0.5 text-center italic">{item.result.remark || gradeRemark(item.result.grade)}</td>
                        </tr>
                      ))}
                      <tr className="border-b border-gray-800 font-bold">
                        <td colSpan={2} className="border-r border-gray-800 p-0.5 text-right pr-4">TOTAL:</td>
                        <td colSpan={3} className="border-r border-gray-800 p-0.5 text-center">{mainTotal}</td>
                        <td colSpan={2} className="border-r border-gray-800 p-0.5 text-right pr-2">AVERAGE:</td>
                        <td className="p-0.5 text-center">{mainAverage.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ARABIC SECTION TABLE */}
                {student.attendsArabic && (
                  <div>
                    <div className="bg-gray-300 text-center font-bold text-[9.5px] uppercase border-t border-b border-gray-800 py-[1px]">
                      STUDENT ACADEMIC PERFORMANCE (ARABIC SECTION)
                    </div>

                    <table className="w-full text-[9.5px] border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 font-bold italic">
                          <th className="border-r border-gray-800 p-0.5 w-[4%] text-center">S/N</th>
                          <th className="border-r border-gray-800 p-0.5 w-[20%] text-right pr-2">SUBJECTS</th>
                          <th className="border-r border-gray-800 p-0.5 w-[8%] text-center">C.A (40)</th>
                          <th className="border-r border-gray-800 p-0.5 w-[9%] text-center">EXAM (60)</th>
                          <th className="border-r border-gray-800 p-0.5 w-[9%] text-center">TOTAL (100)</th>
                          <th className="border-r border-gray-800 p-0.5 w-[6%] text-center">GRADE</th>

                          <th className="border-r border-gray-800 p-0.5 w-[4%] text-center">S/N</th>
                          <th className="border-r border-gray-800 p-0.5 w-[20%] text-right pr-2">SUBJECTS</th>
                          <th className="border-r border-gray-800 p-0.5 w-[8%] text-center">C.A (40)</th>
                          <th className="border-r border-gray-800 p-0.5 w-[9%] text-center">EXAM (60)</th>
                          <th className="border-r border-gray-800 p-0.5 w-[9%] text-center">TOTAL (100)</th>
                          <th className="p-0.5 w-[6%] text-center">GRADE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const left = arabicSubjects.slice(0, 4);
                          const right = arabicSubjects.slice(4, 8);
                          const rows = Math.max(left.length, right.length, 4);

                          return Array.from({ length: rows }).map((_, idx) => {
                            const a = left[idx];
                            const b = right[idx];

                            return (
                              <tr key={idx} className="border-b border-gray-800">
                                <td className="border-r border-gray-800 p-0.5 text-center">{a ? idx + 1 : ""}</td>
                                <td className="border-r border-gray-800 p-0.5 text-right pr-2 font-semibold">{a?.subject?.name || ""}</td>
                                <td className="border-r border-gray-800 p-0.5 text-center">{a?.result.ca1 ?? ""}</td>
                                <td className="border-r border-gray-800 p-0.5 text-center">{a?.result.exam ?? ""}</td>
                                <td className="border-r border-gray-800 p-0.5 text-center font-bold">{a?.result.total ?? ""}</td>
                                <td className="border-r border-gray-800 p-0.5 text-center font-bold">{a?.result.grade ?? ""}</td>

                                <td className="border-r border-gray-800 p-0.5 text-center">{b ? idx + 5 : ""}</td>
                                <td className="border-r border-gray-800 p-0.5 text-right pr-2 font-semibold">{b?.subject?.name || ""}</td>
                                <td className="border-r border-gray-800 p-0.5 text-center">{b?.result.ca1 ?? ""}</td>
                                <td className="border-r border-gray-800 p-0.5 text-center">{b?.result.exam ?? ""}</td>
                                <td className="border-r border-gray-800 p-0.5 text-center font-bold">{b?.result.total ?? ""}</td>
                                <td className="p-0.5 text-center font-bold">{b?.result.grade ?? ""}</td>
                              </tr>
                            );
                          });
                        })()}
                        <tr className="border-b border-gray-800 font-bold">
                          <td colSpan={2} className="border-r border-gray-800 p-0.5 text-right pr-2">TOTAL:</td>
                          <td colSpan={4} className="border-r border-gray-800 p-0.5 text-center">{arabicTotal}</td>
                          <td colSpan={4} className="border-r border-gray-800 p-0.5 text-right pr-2">AVERAGE:</td>
                          <td colSpan={2} className="p-0.5 text-center">{arabicAverage.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* OVERALL TOTAL & AVERAGE */}
                <div className="border-b border-gray-800 font-bold text-[9.5px] uppercase">
                  <div className="grid grid-cols-2 text-center">
                    <div className="border-r border-gray-800 p-0.5">
                      OVERALL TOTAL: <span className="ml-4">{overallTotal}</span>
                    </div>
                    <div className="p-0.5">
                      OVERALL AVERAGE: <span className="ml-4">{overallAverage.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* BEHAVIOURAL ASSESSMENT */}
                <div>
                  <div className="bg-gray-300 text-center font-bold text-[9.5px] italic border-b border-gray-800 py-[1px]">
                    Behavioural Assessment
                  </div>

                  <div className="grid grid-cols-4 text-[9.5px] border-b border-gray-800">
                    <BehaviourCell
                      label="Conduct"
                      value={behaviour.conduct}
                      onChange={(v) => updateBehaviour("conduct", v)}
                    />
                    <BehaviourCell label="Hospitality" value={behaviour.hospitality} onChange={(v) => updateBehaviour("hospitality", v)} />
                    <BehaviourCell label="Punctuality" value={behaviour.punctuality} onChange={(v) => updateBehaviour("punctuality", v)} />
                    <BehaviourCell label="Participation in Class" value={behaviour.participation} onChange={(v) => updateBehaviour("participation", v)} />
                    <BehaviourCell label="Creativity" value={behaviour.creativity} onChange={(v) => updateBehaviour("creativity", v)} />
                    <BehaviourCell label="Neatness" value={behaviour.neatness} onChange={(v) => updateBehaviour("neatness", v)} />
                    <BehaviourCell label="Dedication" value={behaviour.dedication} onChange={(v) => updateBehaviour("dedication", v)} />
                    <BehaviourCell label="Physical Health" value={behaviour.physicalHealth} onChange={(v) => updateBehaviour("physicalHealth", v)} />
                  </div>
                </div>

                {/* GUIDE & GENERAL COMMENT */}
                <div className="grid grid-cols-3 border-b border-gray-800 text-[9.5px]">
                  <div className="border-r border-gray-800 p-1 italic leading-tight">
                    <p className="font-bold underline text-center">GUIDE:</p>
                    <div className="grid grid-cols-2 mt-0.5 text-[8.5px]">
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

                  <div className="col-span-2 p-1 text-center">
                    <p className="font-bold italic">General Comment:</p>
                    <p className="mt-1 italic font-semibold">{generalComment}</p>
                  </div>
                </div>

                {/* NEXT TERM — ADDED: now an editable input (print:hidden) backed
                    by the existing nextTermDate state, with a plain printable
                    span for the actual printed page. Previously this state
                    existed but had no input anywhere, so it could never change. */}
                <div className="border-b border-gray-800 p-0.5 text-center text-[9.5px] font-bold italic flex items-center justify-center gap-2 flex-wrap">
                  <span>Next term begins on:</span>
                  <input
                    type="text"
                    value={nextTermDate}
                    onChange={(e) => setNextTermDate(e.target.value)}
                    className="print:hidden w-40 border border-gray-400 px-1 py-0.5 text-center font-bold italic underline not-italic"
                  />
                  <span className="hidden print:inline underline">{nextTermDate}</span>
                </div>

                {/* SIGNATURES & STAMP */}
                <div className="relative grid grid-cols-2 text-[9.5px] font-bold italic min-h-[85px]">
                  <div className="border-r border-gray-800 p-1 text-center relative flex flex-col justify-between">
                    <div className="relative z-20">
                      <p>Director&apos;s</p>
                      <p>Signature and Date</p>
                    </div>
                    {/* ADDED: editable, synced to the shared signatureDate state */}
                    <div className="relative z-20 border-t border-gray-500 pt-0.5 mt-3 text-[8.5px]">
                      <input
                        type="text"
                        value={signatureDate}
                        onChange={(e) => setSignatureDate(e.target.value)}
                        className="print:hidden w-full border border-gray-400 px-1 text-center text-[8.5px] not-italic"
                      />
                      <span className="hidden print:inline">{signatureDate}</span>
                    </div>
                  </div>

                  <div className="p-1 text-center relative flex flex-col justify-between">
                    <div className="relative z-20">
                      <p>Headmaster&apos;s/Headmistress</p>
                      <p>Signature and Date</p>
                    </div>
                    {/* ADDED: same shared signatureDate — editing this one updates
                        the Director's field above automatically, and vice versa */}
                    <div className="relative z-20 border-t border-gray-500 pt-0.5 mt-3 text-[8.5px]">
                      <input
                        type="text"
                        value={signatureDate}
                        onChange={(e) => setSignatureDate(e.target.value)}
                        className="print:hidden w-full border border-gray-400 px-1 text-center text-[8.5px] not-italic"
                      />
                      <span className="hidden print:inline">{signatureDate}</span>
                    </div>

                    {/* REPOSITIONED per your sample: shifted left off the bled
                        right edge, centered horizontally in the column, and
                        placed vertically between the "Headmaster's/Headmistress
                        Signature and Date" label and the date line below it —
                        i.e. straddling the border-t divider that acts as the
                        signature line, so a real signature crosses over it.
                        z-10 (below the z-20 text above) so the label/date stay
                        legible on top of the stamp rather than hidden under it.
                        This offset is estimated from the cell's layout, not a
                        live render — check it against the real page and tell me
                        which way to nudge if it's off. */}
                    <div className="absolute left-1/2 top-[44px] -translate-x-1/2 -translate-y-1/2 h-20 w-20 z-10 pointer-events-none opacity-90">
                      <Image
                        src={SCHOOL.stampPath}
                        alt="Official Stamp"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* BRANDING FOOTER */}
              <div className="mt-0.5 text-[7px] italic text-gray-700 font-semibold">
                Designed by Maidammanation tech company 08032191668 / 08117106867
              </div>
            </div>

            <div className="print:hidden flex justify-end p-4">
              <Button onClick={() => window.print()}>Print / Save as PDF</Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function BehaviourCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="border-r border-b border-gray-800 p-0.5 flex items-center justify-between px-1">
      <span className="italic">{label}</span>
      <input
        type="text"
        maxLength={1}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="print:hidden w-4 h-4 text-center border border-gray-400 font-bold"
      />
      <span className="hidden print:inline font-bold">{value || "—"}</span>
    </div>
  );
}
