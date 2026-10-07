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

function CoatOfArmsSVG({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M 30,25 L 70,25 L 70,60 C 70,75 50,85 50,85 C 50,85 30,75 30,60 Z" fill="#111" stroke="#000" strokeWidth="2" />
      <path d="M 30,25 L 50,50 L 70,25 M 50,50 L 50,85" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 12,30 C 15,20 25,25 30,35 C 28,45 25,55 18,65 C 15,68 10,50 12,30 Z" fill="#e5e7eb" stroke="#374151" strokeWidth="1.5" />
      <path d="M 88,30 C 85,20 75,25 70,35 C 72,45 75,55 82,65 C 85,68 90,50 88,30 Z" fill="#e5e7eb" stroke="#374151" strokeWidth="1.5" />
      <path d="M 42,18 C 45,10 55,10 58,18 C 55,15 45,15 42,18 Z" fill="#dc2626" />
      <circle cx="50" cy="14" r="4.5" fill="#dc2626" />
      <rect x="12" y="86" width="76" height="9" rx="2" fill="#15803d" />
      <text x="50" y="92.5" textAnchor="middle" fill="#ffffff" fontSize="4.2" fontWeight="bold" fontFamily="sans-serif">
        UNITY & FAITH PEACE & PROGRESS
      </text>
    </svg>
  );
}

function SchoolLogoSVG({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="#f8fafc" stroke="#1e293b" strokeWidth="3" />
      <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />
      <path id="logoTextPath" d="M 18,50 A 32,32 0 1,1 82,50 A 32,32 0 1,1 18,50" fill="none" />
      <text fontSize="6.8" fontWeight="bold" fill="#0f172a" letterSpacing="0.5">
        <textPath href="#logoTextPath" startOffset="50%" textAnchor="middle">
          JIDDA STANDARD ACADEMY
        </textPath>
      </text>
      <path d="M 30,55 Q 50,48 50,65 Q 50,48 70,55 L 70,72 Q 50,65 50,80 Q 50,65 30,72 Z" fill="#2563eb" stroke="#1e293b" strokeWidth="1.5" />
      <path d="M 50,22 L 50,34 M 35,28 L 42,36 M 65,28 L 58,36" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="50" cy="40" r="4.5" fill="#eab308" />
    </svg>
  );
}

function SignatureSVG1({ className = "w-28 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 50" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M 10,35 C 25,10 35,45 45,15 C 50,5 60,30 75,25 C 85,20 90,40 105,30 C 115,20 120,35 145,15 M 20,25 C 50,25 90,20 135,28 M 60,40 L 110,38"
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SignatureSVG2({ className = "w-28 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 50" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M 15,25 C 25,5 30,45 50,20 C 65,35 70,10 90,30 C 100,15 110,40 130,22 C 140,15 145,30 155,20 M 30,38 C 70,36 100,32 140,35"
        fill="none"
        stroke="#1e3a8a"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  mainAverage: number,
  arabicAverage: number,
  hasMainSubjects: boolean,
  hasArabicSubjects: boolean
): string {
  if (!hasMainSubjects && !hasArabicSubjects) {
    return "No academic results have been recorded for this student.";
  }

  if (overallAverage >= 80) {
    return "Very good result, keep pushing and all the hard work will pay up!";
  } else if (overallAverage >= 70) {
    return "Excellent performance! Continue striving for excellence.";
  } else if (overallAverage >= 60) {
    return "Very good overall performance. Keep working hard.";
  } else if (overallAverage >= 50) {
    return "Good performance. Encouraging progress.";
  } else if (overallAverage >= 40) {
    return "Fair performance. More consistent study required.";
  } else {
    return "Requires significant improvement and regular study.";
  }
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

  const [behaviour, setBehaviour] = useState<Behaviour>(emptyBehaviour);
  const [nextTermDate] = useState("30th MARCH, 2026");

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
  }, [results, subjects]);

  const paddedMainSubjects = useMemo(() => {
    const list = [...mainSubjects];
    while (list.length < MIN_MAIN_ROWS) {
      list.push(null as unknown as (typeof mainSubjects)[0]);
    }
    return list;
  }, [mainSubjects]);

  const paddedArabicLeft = useMemo(() => {
    const list = arabicSubjects.slice(0, 4);
    while (list.length < MIN_ARABIC_ROWS) {
      list.push(null as unknown as (typeof arabicSubjects)[0]);
    }
    return list;
  }, [arabicSubjects]);

  const paddedArabicRight = useMemo(() => {
    const list = arabicSubjects.slice(4, 8);
    while (list.length < MIN_ARABIC_ROWS) {
      list.push(null as unknown as (typeof arabicSubjects)[0]);
    }
    return list;
  }, [arabicSubjects]);

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
        @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&family=Noto+Naskh+Arabic:wght@400;700&display=swap');

        .report-card-font {
          font-family: 'Times New Roman', Times, serif, sans-serif;
        }

        .arabic-font {
          font-family: 'Noto Naskh Arabic', 'Times New Roman', serif;
        }

        .a4-report-wrapper {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
          box-sizing: border-box;
          padding: 2.5mm;
          position: relative;
        }

        @media print {
          @page {
            size: 210mm 297mm;
            margin: 0 !important;
          }

          html, body {
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
            page-break-before: avoid !important;
            page-break-after: avoid !important;
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

          <div className="flex justify-end items-end h-full pt-2 md:pt-0">
            <Button onClick={() => window.print()} className="w-full md:w-auto">
              Print / Save as PDF
            </Button>
          </div>
        </div>

        {loading && (
          <p className="print:hidden text-sm text-gray-400 text-center">Loading results...</p>
        )}

        {student && !loading && (
          <div className="a4-report-wrapper text-black">
            {/* FULL WIDTH CONTAINER WITH DOUBLE BORDER */}
            <div className="w-full border-[3px] border-black p-[1.5mm] bg-white text-black box-border">
              <div className="border border-black relative p-1 flex flex-col">

                {/* HEADER SECTION */}
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
                    <div className="absolute left-1 top-0 h-10 w-10">
                      {SCHOOL?.logoPath ? (
                        <Image
                          src={SCHOOL.logoPath}
                          alt="Logo"
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <SchoolLogoSVG className="w-10 h-10" />
                      )}
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

                    <div className="absolute right-1 top-0 h-10 w-10">
                      <CoatOfArmsSVG className="w-10 h-10" />
                    </div>
                  </div>

                  <div className="mt-1 border-t border-b border-black py-[1px] bg-gray-100">
                    <p className="text-[10.5px] font-bold italic tracking-wide leading-tight">
                      End of Term Examination Report Sheet (Primary Section)
                    </p>
                  </div>
                </div>

                {/* STUDENT INFORMATION */}
                <div className="mt-[2px]">
                  <div className="bg-gray-300 text-center font-bold text-[9px] italic border-b border-black py-[1px] leading-tight">
                    Student Information
                  </div>
                  <table className="w-full text-[9px] border-collapse leading-tight">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="w-14 font-bold p-[2px] px-1 border-r border-black">Name:</td>
                        <td className="p-[2px] px-1 border-r border-black uppercase font-bold text-center italic font-serif">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="w-14 font-bold p-[2px] px-1 border-r border-black">Class:</td>
                        <td className="p-[2px] px-1 uppercase font-bold text-center italic font-serif">{className}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="font-bold p-[2px] px-1 border-r border-black">Session:</td>
                        <td className="p-[2px] px-1 border-r border-black text-center font-bold italic font-serif">{session}</td>
                        <td className="font-bold p-[2px] px-1 border-r border-black">Number in Class:</td>
                        <td className="p-[2px] px-1 border-r border-black text-center font-bold italic font-serif">{students.length}</td>
                        <td className="w-12 font-bold p-[2px] px-1 border-r border-black">Term:</td>
                        <td className="p-[2px] px-1 text-center font-bold uppercase italic font-serif">{term}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* MAIN SUBJECTS TABLE (FIXED 11 ROWS) */}
                <div className="mt-0">
                  <div className="bg-gray-300 text-center font-bold text-[9px] uppercase border-t border-b border-black py-[1px] leading-tight">
                    STUDENT ACADEMIC PERFORMANCE
                  </div>

                  <table className="w-full text-[8.5px] border-collapse leading-tight">
                    <thead>
                      <tr className="border-b border-black font-bold italic bg-gray-50">
                        <th className="border-r border-black p-0.5 w-[5%] text-center leading-none">S/N</th>
                        <th className="border-r border-black p-0.5 w-[32%] text-left pl-2 leading-none">SUBJECTS</th>
                        <th className="border-r border-black p-0.5 w-[11%] text-center leading-none">1ST C.A (20)</th>
                        <th className="border-r border-black p-0.5 w-[11%] text-center leading-none">2ND C.A (20)</th>
                        <th className="border-r border-black p-0.5 w-[11%] text-center leading-none">EXAM (60)</th>
                        <th className="border-r border-black p-0.5 w-[10%] text-center leading-none">TOTAL (100)</th>
                        <th className="border-r border-black p-0.5 w-[8%] text-center leading-none">GRADE</th>
                        <th className="p-0.5 w-[12%] text-center leading-none">REMARK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paddedMainSubjects.map((item, index) => (
                        <tr key={index} className="border-b border-black h-[22px]">
                          <td className="border-r border-black p-0.5 text-center font-semibold">{index + 1}</td>
                          <td className="border-r border-black p-0.5 pl-2 font-semibold text-gray-900">
                            {item?.subject?.name || ""}
                          </td>
                          <td className="border-r border-black p-0.5 text-center">{item?.result.ca1 ?? ""}</td>
                          <td className="border-r border-black p-0.5 text-center">{item?.result.ca2 ?? ""}</td>
                          <td className="border-r border-black p-0.5 text-center">{item?.result.exam ?? ""}</td>
                          <td className="border-r border-black p-0.5 text-center font-bold">{item?.result.total ?? ""}</td>
                          <td className="border-r border-black p-0.5 text-center font-bold">{item?.result.grade ?? ""}</td>
                          <td className="p-0.5 text-center italic text-[8px]">
                            {item ? (item.result.remark || gradeRemark(item.result.grade)) : ""}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-b border-black font-bold bg-gray-50 h-[22px]">
                        <td colSpan={2} className="border-r border-black p-0.5 text-right pr-4">TOTAL:</td>
                        <td colSpan={3} className="border-r border-black p-0.5 text-center text-[9.5px]">{mainTotal || 0}</td>
                        <td colSpan={2} className="border-r border-black p-0.5 text-right pr-2">AVERAGE:</td>
                        <td className="p-0.5 text-center text-[9.5px]">{mainAverage.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ARABIC SECTION TABLE (FIXED 4 ROWS / 8 SUBJECT SLOTS) */}
                <div className="mt-0">
                  <div className="bg-gray-300 text-center font-bold text-[9px] uppercase border-t border-b border-black py-[1px] leading-tight">
                    STUDENT ACADEMIC PERFORMANCE (ARABIC SECTION)
                  </div>

                  <table className="w-full text-[8.5px] border-collapse leading-tight">
                    <thead>
                      <tr className="border-b border-black font-bold italic bg-gray-50">
                        <th className="border-r border-black p-0.5 w-[4%] text-center leading-none">S/N</th>
                        <th className="border-r border-black p-0.5 w-[20%] text-right pr-2 leading-none">SUBJECTS</th>
                        <th className="border-r border-black p-0.5 w-[8%] text-center leading-none">C.A (40)</th>
                        <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">EXAM (60)</th>
                        <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">TOTAL (100)</th>
                        <th className="border-r border-black p-0.5 w-[6%] text-center leading-none">GRADE</th>

                        <th className="border-r border-black p-0.5 w-[4%] text-center leading-none">S/N</th>
                        <th className="border-r border-black p-0.5 w-[20%] text-right pr-2 leading-none">SUBJECTS</th>
                        <th className="border-r border-black p-0.5 w-[8%] text-center leading-none">C.A (40)</th>
                        <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">EXAM (60)</th>
                        <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">TOTAL (100)</th>
                        <th className="p-0.5 w-[6%] text-center leading-none">GRADE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: MIN_ARABIC_ROWS }).map((_, idx) => {
                        const left = paddedArabicLeft[idx];
                        const right = paddedArabicRight[idx];

                        return (
                          <tr key={idx} className="border-b border-black h-[22px]">
                            <td className="border-r border-black p-0.5 text-center font-semibold">{idx + 1}</td>
                            <td className="border-r border-black p-0.5 text-right pr-2 font-bold arabic-font text-[9.5px]">
                              {left?.subject?.name || ""}
                            </td>
                            <td className="border-r border-black p-0.5 text-center">{left?.result.ca1 ?? ""}</td>
                            <td className="border-r border-black p-0.5 text-center">{left?.result.exam ?? ""}</td>
                            <td className="border-r border-black p-0.5 text-center font-bold">{left?.result.total ?? ""}</td>
                            <td className="border-r border-black p-0.5 text-center font-bold">{left?.result.grade ?? ""}</td>

                            <td className="border-r border-black p-0.5 text-center font-semibold">{idx + 5}</td>
                            <td className="border-r border-black p-0.5 text-right pr-2 font-bold arabic-font text-[9.5px]">
                              {right?.subject?.name || ""}
                            </td>
                            <td className="border-r border-black p-0.5 text-center">{right?.result.ca1 ?? ""}</td>
                            <td className="border-r border-black p-0.5 text-center">{right?.result.exam ?? ""}</td>
                            <td className="border-r border-black p-0.5 text-center font-bold">{right?.result.total ?? ""}</td>
                            <td className="p-0.5 text-center font-bold">{right?.result.grade ?? ""}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-b border-black font-bold bg-gray-50 h-[22px]">
                        <td colSpan={2} className="border-r border-black p-0.5 text-right pr-2">TOTAL:</td>
                        <td colSpan={4} className="border-r border-black p-0.5 text-center text-[9.5px]">{arabicTotal || 0}</td>
                        <td colSpan={4} className="border-r border-black p-0.5 text-right pr-2">AVERAGE:</td>
                        <td colSpan={2} className="p-0.5 text-center text-[9.5px]">{arabicAverage.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* OVERALL TOTAL & AVERAGE */}
                <div className="border-b border-black font-bold text-[9px] uppercase bg-gray-100 leading-tight">
                  <div className="grid grid-cols-2 text-center py-[2px]">
                    <div className="border-r border-black">
                      OVERALL TOTAL: <span className="ml-4 text-[10px]">{overallTotal || 0}</span>
                    </div>
                    <div>
                      OVERALL AVERAGE: <span className="ml-4 text-[10px]">{overallAverage.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* BEHAVIOURAL ASSESSMENT */}
                <div>
                  <div className="bg-gray-300 text-center font-bold text-[9px] italic border-b border-black py-[1px] leading-tight">
                    Behavioural Assessment
                  </div>

                  <div className="grid grid-cols-4 text-[8.5px] border-b border-black leading-tight">
                    <BehaviourCell label="Conduct" value={behaviour.conduct} onChange={(v) => updateBehaviour("conduct", v)} />
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
                <div className="grid grid-cols-3 border-b border-black text-[8.5px] leading-tight">
                  <div className="border-r border-black p-1 italic leading-none">
                    <p className="font-bold underline text-center text-[8.5px]">GUIDE:</p>
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
                    <p className="font-bold italic text-[9px]">General Comment:</p>
                    <p className="mt-1 italic font-semibold text-[9.5px] px-1">{generalComment}</p>
                  </div>
                </div>

                {/* NEXT TERM */}
                <div className="border-b border-black p-1 text-center text-[9px] font-bold italic leading-tight bg-gray-50">
                  Next term begins on: <span className="ml-2 underline font-serif tracking-wider">{nextTermDate}</span>
                </div>

                {/* SIGNATURES & STAMP SECTION */}
                <div>
                  <div className="relative grid grid-cols-2 text-[9px] font-bold italic min-h-[58px] leading-tight pt-1">
                    {/* DIRECTOR SIGNATURE BOX */}
                    <div className="border-r border-black p-1 text-center relative flex flex-col justify-between items-center">
                      <div>
                        <p className="leading-tight">Director&apos;s</p>
                        <p className="leading-tight">Signature and Date</p>
                      </div>

                      {/* DIRECTOR SIGNATURE GRAPHIC & LINE */}
                      <div className="my-0.5 flex flex-col items-center">
                        <SignatureSVG1 className="w-28 h-7" />
                        <div className="border-b border-black w-32 mt-[1px]"></div>
                      </div>

                      <div className="w-full text-right pr-2 text-[8px] font-serif font-semibold">
                        26 February, 2026
                      </div>
                    </div>

                    {/* HEADMASTER SIGNATURE BOX */}
                    <div className="p-1 text-center relative flex flex-col justify-between items-center">
                      <div>
                        <p className="leading-tight">Headmaster&apos;s/Headmistress</p>
                        <p className="leading-tight">Signature and Date</p>
                      </div>

                      {/* HEADMASTER SIGNATURE GRAPHIC & LINE */}
                      <div className="my-0.5 flex flex-col items-center">
                        <SignatureSVG2 className="w-28 h-7" />
                        <div className="border-b border-black w-32 mt-[1px]"></div>
                      </div>

                      <div className="w-full text-right pr-2 text-[8px] font-serif font-semibold">
                        26 February, 2026
                      </div>

                      {/* OFFICIAL STAMP OVERLAY */}
                      <div className="absolute right-[-4px] bottom-[-6px] h-20 w-20 z-10 pointer-events-none opacity-85">
                        {SCHOOL?.stampPath ? (
                          <Image
                            src={SCHOOL.stampPath}
                            alt="Official Stamp"
                            fill
                            className="object-contain"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* BRANDING FOOTER */}
                  <div className="mt-1 text-[7px] italic text-gray-700 font-semibold border-t border-gray-400 pt-[1px] flex justify-between px-1 leading-none">
                    <span>Designed @ 08101130605</span>
                    <span>JIDDA STANDARD ACADEMY OFFICIAL RESULT SHEET</span>
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
    <div className="border-r border-b border-black p-[2px] flex items-center justify-between px-1.5">
      <span className="italic">{label}</span>
      <input
        type="text"
        maxLength={1}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="print:hidden w-4 h-4 text-center border border-gray-400 font-bold text-[8.5px]"
      />
      <span className="hidden print:inline font-bold text-[8.5px]">{value || "—"}</span>
    </div>
  );
}
