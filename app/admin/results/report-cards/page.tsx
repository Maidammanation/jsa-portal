"use client";

import React, { useEffect, useMemo, useState } from "react";
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

function OfficialStampSVG({ className = "w-28 h-28" }: { className?: string }) {
  return (
    <div className={`pointer-events-none select-none relative ${className}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-12 opacity-85" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="56" fill="none" stroke="#1e40af" strokeWidth="2.5" strokeDasharray="100 2" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#1e40af" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="34" fill="none" stroke="#1e40af" strokeWidth="1.5" />
        
        <path id="stampTextPathTop" d="M 16,60 A 44,44 0 0,1 104,60" fill="none" />
        <text fontSize="7.2" fontWeight="900" fill="#1e40af" letterSpacing="0.6">
          <textPath href="#stampTextPathTop" startOffset="50%" textAnchor="middle">
            JIDDA STANDARD ACADEMY
          </textPath>
        </text>

        <path id="stampTextPathBottom" d="M 104,60 A 44,44 0 0,1 16,60" fill="none" />
        <text fontSize="6.5" fontWeight="bold" fill="#1e40af" letterSpacing="0.5">
          <textPath href="#stampTextPathBottom" startOffset="50%" textAnchor="middle">
            ★ ZARIA ★
          </textPath>
        </text>

        <rect x="30" y="44" width="60" height="32" fill="none" stroke="#1e40af" strokeWidth="1.2" />
        <text x="60" y="53" textAnchor="middle" fill="#1e40af" fontSize="6.5" fontWeight="bold">DIRECTOR</text>
        <line x1="32" y1="56" x2="88" y2="56" stroke="#1e40af" strokeWidth="0.8" />
        <text x="60" y="63" textAnchor="middle" fill="#1e40af" fontSize="5.8" fontWeight="bold">SIGN: ..........</text>
        <text x="60" y="71" textAnchor="middle" fill="#1e40af" fontSize="5.8" fontWeight="bold">DATE: 26/02/2026</text>
      </svg>
    </div>
  );
}

function SignatureSVG1({ className = "w-28 h-7" }: { className?: string }) {
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

function SignatureSVG2({ className = "w-28 h-7" }: { className?: string }) {
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

const defaultBehaviour: Behaviour = {
  conduct: "4",
  hospitality: "5",
  punctuality: "5",
  participation: "4",
  creativity: "5",
  neatness: "4",
  dedication: "5",
  physicalHealth: "5",
};

const SAMPLE_MAIN_SUBJECTS = [
  { sn: 1, name: "English Language", ca1: "5", ca2: "5", exam: "20", total: "30", grade: "F", remark: "Fail" },
  { sn: 2, name: "Mathematics", ca1: "10", ca2: "10", exam: "45", total: "65", grade: "B", remark: "Very Good" },
  { sn: 3, name: "Computer", ca1: "10", ca2: "10", exam: "30", total: "50", grade: "C", remark: "Good" },
  { sn: 4, name: "Social Studies", ca1: "10", ca2: "10", exam: "44", total: "64", grade: "B", remark: "Very Good" },
  { sn: 5, name: "Basic Science", ca1: "10", ca2: "10", exam: "48", total: "68", grade: "B", remark: "Very Good" },
  { sn: 6, name: "Islamic Studies", ca1: "15", ca2: "15", exam: "40", total: "70", grade: "A", remark: "Excellent" },
  { sn: 7, name: "Verbal Reasoning", ca1: "10", ca2: "10", exam: "18", total: "38", grade: "F", remark: "Fail" },
  { sn: 8, name: "Quantitative Reasoning", ca1: "10", ca2: "10", exam: "20", total: "40", grade: "D", remark: "Pass" },
  { sn: 9, name: "CCA", ca1: "15", ca2: "15", exam: "30", total: "60", grade: "B", remark: "Very Good" },
  { sn: 10, name: "Writing", ca1: "10", ca2: "10", exam: "40", total: "60", grade: "B", remark: "Very Good" },
  { sn: 11, name: "Hausa", ca1: "10", ca2: "10", exam: "40", total: "60", grade: "B", remark: "Very Good" },
];

const SAMPLE_ARABIC_SUBJECTS = [
  { leftSn: 1, leftName: "القرءان الكريم", leftCa: "39", leftExam: "30", leftTotal: "69", leftGrade: "B", rightSn: 5, rightName: "السيرة", rightCa: "32", rightExam: "50", rightTotal: "82", rightGrade: "A" },
  { leftSn: 2, leftName: "الحديث", leftCa: "33", leftExam: "40", leftTotal: "73", leftGrade: "A", rightSn: 6, rightName: "التربية", rightCa: "28", rightExam: "60", rightTotal: "88", rightGrade: "A" },
  { leftSn: 3, leftName: "التوحيد", leftCa: "37", leftExam: "40", leftTotal: "77", leftGrade: "A", rightSn: 7, rightName: "الحروف", rightCa: "39", rightExam: "60", rightTotal: "99", rightGrade: "A" },
  { leftSn: 4, leftName: "الفقه", leftCa: "34", leftExam: "60", leftTotal: "94", leftGrade: "A", rightSn: 8, rightName: "الأذكار", rightCa: "39", rightExam: "60", rightTotal: "99", rightGrade: "A" },
];

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
      return "Pass";
    case "E":
      return "Fair";
    case "F":
      return "Fail";
    default:
      return "—";
  }
}

function generateGeneralComment(overallAverage: number): string {
  if (overallAverage >= 60) {
    return "Very good result, keep pushing and all the hard work will pay up!";
  } else if (overallAverage >= 50) {
    return "Good performance. Encouraging progress.";
  } else {
    return "Requires significant improvement and regular study.";
  }
}

export default function ReportCardsPage() {
  const schoolSettings = useSchoolSettings() || { session: "2025/2026", term: "SECOND TERM" };
  const session = schoolSettings.session || "2025/2026";
  const term = schoolSettings.term || "SECOND TERM";

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");

  const [results, setResults] = useState<ResultEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const [behaviour] = useState<Behaviour>(defaultBehaviour);
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

  const dbMainSubjects = useMemo(() => {
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

  const dbArabicSubjects = useMemo(() => {
    if (student && !student.attendsArabic) {
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

  const hasDbData = Boolean(student && (dbMainSubjects.length > 0 || dbArabicSubjects.length > 0));

  const mainTotal = hasDbData
    ? dbMainSubjects.reduce((sum, item) => sum + safeNumber(item.result.total), 0)
    : 605;

  const mainAverage = hasDbData
    ? dbMainSubjects.length > 0
      ? (mainTotal / dbMainSubjects.length).toFixed(2)
      : "0.00"
    : "55.00";

  const arabicTotal = hasDbData
    ? dbArabicSubjects.reduce((sum, item) => sum + safeNumber(item.result.total), 0)
    : 681;

  const arabicAverage = hasDbData
    ? dbArabicSubjects.length > 0
      ? (arabicTotal / dbArabicSubjects.length).toFixed(2)
      : "0.00"
    : "85.13";

  const overallTotal = mainTotal + arabicTotal;
  const totalSubjectCount = hasDbData
    ? dbMainSubjects.length + dbArabicSubjects.length
    : 19;

  const overallAverage = hasDbData
    ? totalSubjectCount > 0
      ? (overallTotal / totalSubjectCount).toFixed(2)
      : "0.00"
    : "67.68";

  const generalComment = generateGeneralComment(parseFloat(overallAverage));

  const studentName = student
    ? `${student.firstName} ${student.lastName}`
    : "KHADIJA SALE";
  const className = classRoom?.name || student?.className || "PRIMARY TWO";
  const studentCount = student ? students.length : "25";

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

        .a4-sheet {
          width: 210mm;
          min-height: 297mm;
          height: auto;
          margin: 0 auto;
          background: #ffffff;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          box-sizing: border-box;
          padding: 2.5mm;
          position: relative;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm !important;
          }

          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-controls {
            display: none !important;
          }

          .a4-sheet {
            width: 210mm !important;
            height: 297mm !important;
            max-height: 297mm !important;
            margin: 0 !important;
            padding: 2.5mm !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <div className="max-w-5xl space-y-4 report-card-font mx-auto p-2 sm:p-4">
        {/* CONTROL PANEL */}
        <div className="print-controls grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-3 items-center">
          <SelectInput
            label="Class"
            value={classId}
            onChange={(event) => {
              setClassId(event.target.value);
              setStudentId("");
              setResults([]);
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
            }}
            options={[
              { label: "Select a student", value: "" },
              ...students.map((item) => ({
                label: `${item.firstName} ${item.lastName}`,
                value: item.id,
              })),
            ]}
          />

          <div className="flex justify-end items-end h-full pt-4 md:pt-0">
            <Button onClick={() => window.print()} className="w-full md:w-auto">
              Print / Save as PDF
            </Button>
          </div>
        </div>

        {loading && (
          <p className="print-controls text-sm text-gray-500 text-center">Loading student results...</p>
        )}

        {/* PRINTABLE A4 CONTAINER */}
        <div className="a4-sheet text-black flex flex-col justify-between">
          {/* DOUBLE BLACK BORDER CONTAINER */}
          <div className="w-full h-full border-[3px] border-black p-[2px] box-border">
            <div className="border border-black h-full flex flex-col justify-between p-1 relative">

              {/* UPPER DOCUMENT CONTENT */}
              <div>
                {/* HEADER SECTION */}
                <div className="text-center pt-0.5">
                  <h1 className="text-[22px] font-extrabold tracking-tight uppercase leading-none font-serif">
                    JIDDA STANDARD ACADEMY
                  </h1>

                  {/* MAIN CAMPUS BANNER */}
                  <div className="mt-1 bg-[#555555] text-white text-[8.5px] font-bold py-[1px] px-2 mx-0.5 leading-none">
                    Main Campus: No. 5 Hayin Dogo Anguwan Rafi Danmagaji, Zaria
                  </div>

                  {/* ANNEX BANNER */}
                  <div className="mt-[2px] bg-[#555555] text-white text-[8px] font-bold py-[1px] px-2 mx-0.5 leading-none">
                    Annex: No. 5 Aminu Mai Kai Close, Behind Baba Kaduna&apos;s Garage, Gaskiya Road, Zaria
                  </div>

                  {/* MOTTO & CONTACT DETAILS */}
                  <div className="relative mt-1 px-12 flex items-center justify-between min-h-[46px]">
                    <div className="absolute left-1 top-0">
                      {SCHOOL?.logoPath ? (
                        <div className="relative w-11 h-11">
                          <Image src={SCHOOL.logoPath} alt="Logo" fill className="object-contain" />
                        </div>
                      ) : (
                        <SchoolLogoSVG className="w-11 h-11" />
                      )}
                    </div>

                    <div className="w-full text-center">
                      <p className="text-[10px] italic font-bold leading-tight">
                        Motto: Knowledge is Light
                      </p>
                      <p className="text-[9px] font-bold leading-tight mt-[1px]">
                        Phone Numbers: 08121414008, 08069121401
                      </p>

                      <div className="bg-[#888888] text-white text-[8.5px] font-bold py-[0.5px] mt-[1px] mx-auto w-3/5 border border-gray-500">
                        Email:
                      </div>
                    </div>

                    <div className="absolute right-1 top-0">
                      <CoatOfArmsSVG className="w-11 h-11" />
                    </div>
                  </div>

                  {/* REPORT SHEET TITLE BAR */}
                  <div className="mt-1 border-t border-b border-black py-[2px] bg-gray-100">
                    <p className="text-[11px] font-bold italic tracking-wide">
                      End of Term Examination Report Sheet (Primary Section)
                    </p>
                  </div>
                </div>

                {/* STUDENT INFORMATION SECTION */}
                <div className="mt-[2px]">
                  <div className="bg-[#cccccc] text-center font-bold text-[9px] italic border-b border-black py-[1px]">
                    Student Information
                  </div>
                  <table className="w-full text-[9px] border-collapse">
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="w-14 font-bold p-0.5 border-r border-black pl-1">Name:</td>
                        <td className="p-0.5 border-r border-black uppercase font-bold text-center italic font-serif">
                          {studentName}
                        </td>
                        <td className="w-12 font-bold p-0.5 border-r border-black pl-1">Class:</td>
                        <td className="p-0.5 uppercase font-bold text-center italic font-serif">
                          {className}
                        </td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="font-bold p-0.5 border-r border-black pl-1">Session:</td>
                        <td className="p-0.5 border-r border-black text-center font-bold italic font-serif">
                          {session}
                        </td>
                        <td className="font-bold p-0.5 border-r border-black pl-1">Number in Class:</td>
                        <td className="p-0.5 border-r border-black text-center font-bold italic font-serif w-12">
                          {studentCount}
                        </td>
                        <td className="w-12 font-bold p-0.5 border-r border-black pl-1">Term:</td>
                        <td className="p-0.5 text-center font-bold uppercase italic font-serif">
                          {term}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* MAIN ACADEMIC PERFORMANCE TABLE */}
                <div className="mt-0">
                  <div className="bg-[#cccccc] text-center font-bold text-[9px] uppercase border-b border-black py-[1px]">
                    STUDENT ACADEMIC PERFORMANCE
                  </div>

                  <table className="w-full text-[8.5px] border-collapse">
                    <thead>
                      <tr className="border-b border-black font-bold italic bg-gray-50">
                        <th className="border-r border-black p-0.5 w-[5%] text-center">S/N</th>
                        <th className="border-r border-black p-0.5 w-[30%] text-left pl-2">SUBJECTS</th>
                        <th className="border-r border-black p-0.5 w-[11%] text-center leading-tight">
                          1ST C.A (20)
                        </th>
                        <th className="border-r border-black p-0.5 w-[11%] text-center leading-tight">
                          2ND C.A (20)
                        </th>
                        <th className="border-r border-black p-0.5 w-[12%] text-center leading-tight">
                          EXAM (60)
                        </th>
                        <th className="border-r border-black p-0.5 w-[11%] text-center leading-none">
                          TOTAL<br />(100)
                        </th>
                        <th className="border-r border-black p-0.5 w-[8%] text-center">GRADE</th>
                        <th className="p-0.5 w-[12%] text-center">REMARK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasDbData
                        ? dbMainSubjects.map((item, index) => (
                            <tr key={index} className="border-b border-black h-[17px]">
                              <td className="border-r border-black p-0.5 text-center font-semibold">{index + 1}</td>
                              <td className="border-r border-black p-0.5 pl-2 font-semibold text-gray-900">
                                {item.subject?.name}
                              </td>
                              <td className="border-r border-black p-0.5 text-center">{item.result.ca1 ?? "—"}</td>
                              <td className="border-r border-black p-0.5 text-center">{item.result.ca2 ?? "—"}</td>
                              <td className="border-r border-black p-0.5 text-center">{item.result.exam ?? "—"}</td>
                              <td className="border-r border-black p-0.5 text-center font-bold">{item.result.total ?? "—"}</td>
                              <td className="border-r border-black p-0.5 text-center font-bold">{item.result.grade ?? "—"}</td>
                              <td className="p-0.5 text-center italic text-[8px]">
                                {item.result.remark || gradeRemark(item.result.grade)}
                              </td>
                            </tr>
                          ))
                        : SAMPLE_MAIN_SUBJECTS.map((row, index) => (
                            <tr key={index} className="border-b border-black h-[17px]">
                              <td className="border-r border-black p-0.5 text-center font-semibold">{row.sn}</td>
                              <td className="border-r border-black p-0.5 pl-2 font-semibold text-gray-900">{row.name}</td>
                              <td className="border-r border-black p-0.5 text-center">{row.ca1}</td>
                              <td className="border-r border-black p-0.5 text-center">{row.ca2}</td>
                              <td className="border-r border-black p-0.5 text-center">{row.exam}</td>
                              <td className="border-r border-black p-0.5 text-center font-bold">{row.total}</td>
                              <td className="border-r border-black p-0.5 text-center font-bold">{row.grade}</td>
                              <td className="p-0.5 text-center italic text-[8px]">{row.remark}</td>
                            </tr>
                          ))}
                      <tr className="border-b border-black font-bold h-[18px] bg-gray-50">
                        <td colSpan={2} className="border-r border-black p-0.5 text-right pr-4 tracking-wider">
                          TOTAL:
                        </td>
                        <td colSpan={3} className="border-r border-black p-0.5 text-center text-[9.5px]">
                          {mainTotal}
                        </td>
                        <td colSpan={2} className="border-r border-black p-0.5 text-right pr-2 tracking-wider">
                          AVERAGE:
                        </td>
                        <td className="p-0.5 text-center text-[9.5px]">{mainAverage}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* ARABIC SECTION ACADEMIC PERFORMANCE */}
                <div className="mt-0">
                  <div className="bg-[#cccccc] text-center font-bold text-[9px] uppercase border-b border-black py-[1px]">
                    STUDENT ACADEMIC PERFORMANCE (ARABIC SECTION)
                  </div>

                  <table className="w-full text-[8.5px] border-collapse">
                    <thead>
                      <tr className="border-b border-black font-bold italic bg-gray-50">
                        <th className="border-r border-black p-0.5 w-[4%] text-center">S/N</th>
                        <th className="border-r border-black p-0.5 w-[21%] text-right pr-2">SUBJECTS</th>
                        <th className="border-r border-black p-0.5 w-[8%] text-center leading-none">C.A (40)</th>
                        <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">EXAM (60)</th>
                        <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">TOTAL (100)</th>
                        <th className="border-r border-black p-0.5 w-[6%] text-center">GRADE</th>

                        <th className="border-r border-black p-0.5 w-[4%] text-center">S/N</th>
                        <th className="border-r border-black p-0.5 w-[21%] text-right pr-2">SUBJECTS</th>
                        <th className="border-r border-black p-0.5 w-[8%] text-center leading-none">C.A (40)</th>
                        <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">EXAM (60)</th>
                        <th className="border-r border-black p-0.5 w-[9%] text-center leading-none">TOTAL (100)</th>
                        <th className="p-0.5 w-[6%] text-center">GRADE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SAMPLE_ARABIC_SUBJECTS.map((row, index) => (
                        <tr key={index} className="border-b border-black h-[17px]">
                          <td className="border-r border-black p-0.5 text-center font-semibold">{row.leftSn}</td>
                          <td className="border-r border-black p-0.5 text-right pr-2 font-bold arabic-font text-[9.5px]">
                            {row.leftName}
                          </td>
                          <td className="border-r border-black p-0.5 text-center">{row.leftCa}</td>
                          <td className="border-r border-black p-0.5 text-center">{row.leftExam}</td>
                          <td className="border-r border-black p-0.5 text-center font-bold">{row.leftTotal}</td>
                          <td className="border-r border-black p-0.5 text-center font-bold">{row.leftGrade}</td>

                          <td className="border-r border-black p-0.5 text-center font-semibold">{row.rightSn}</td>
                          <td className="border-r border-black p-0.5 text-right pr-2 font-bold arabic-font text-[9.5px]">
                            {row.rightName}
                          </td>
                          <td className="border-r border-black p-0.5 text-center">{row.rightCa}</td>
                          <td className="border-r border-black p-0.5 text-center">{row.rightExam}</td>
                          <td className="border-r border-black p-0.5 text-center font-bold">{row.rightTotal}</td>
                          <td className="p-0.5 text-center font-bold">{row.rightGrade}</td>
                        </tr>
                      ))}
                      <tr className="border-b border-black font-bold h-[18px] bg-gray-50">
                        <td colSpan={2} className="border-r border-black p-0.5 text-right pr-2 tracking-wider">
                          TOTAL:
                        </td>
                        <td colSpan={4} className="border-r border-black p-0.5 text-center text-[9.5px]">
                          {arabicTotal}
                        </td>
                        <td colSpan={4} className="border-r border-black p-0.5 text-right pr-2 tracking-wider">
                          AVERAGE:
                        </td>
                        <td colSpan={2} className="p-0.5 text-center text-[9.5px]">
                          {arabicAverage}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* OVERALL TOTAL AND AVERAGE */}
                <div className="border-b border-black font-bold text-[9px] uppercase bg-gray-100">
                  <div className="grid grid-cols-2 text-center py-[1px]">
                    <div className="border-r border-black tracking-wide">
                      OVERALL TOTAL: <span className="ml-6 text-[10px]">{overallTotal}</span>
                    </div>
                    <div className="tracking-wide">
                      OVERALL AVERAGE: <span className="ml-6 text-[10px]">{overallAverage}</span>
                    </div>
                  </div>
                </div>

                {/* BEHAVIOURAL ASSESSMENT */}
                <div>
                  <div className="bg-[#cccccc] text-center font-bold text-[9px] italic border-b border-black py-[1px]">
                    Behavioural Assessment
                  </div>

                  <div className="grid grid-cols-4 text-[8.5px] border-b border-black">
                    <div className="border-r border-b border-black p-0.5 flex items-center justify-between px-2">
                      <span className="italic">Conduct</span>
                      <span className="font-bold">{behaviour.conduct}</span>
                    </div>
                    <div className="border-r border-b border-black p-0.5 flex items-center justify-between px-2">
                      <span className="italic">Hospitality</span>
                      <span className="font-bold">{behaviour.hospitality}</span>
                    </div>
                    <div className="border-r border-b border-black p-0.5 flex items-center justify-between px-2">
                      <span className="italic">Punctuality</span>
                      <span className="font-bold">{behaviour.punctuality}</span>
                    </div>
                    <div className="border-b border-black p-0.5 flex items-center justify-between px-2">
                      <span className="italic">Participation in Class</span>
                      <span className="font-bold">{behaviour.participation}</span>
                    </div>

                    <div className="border-r border-black p-0.5 flex items-center justify-between px-2">
                      <span className="italic">Creativity</span>
                      <span className="font-bold">{behaviour.creativity}</span>
                    </div>
                    <div className="border-r border-black p-0.5 flex items-center justify-between px-2">
                      <span className="italic">Neatness</span>
                      <span className="font-bold">{behaviour.neatness}</span>
                    </div>
                    <div className="border-r border-black p-0.5 flex items-center justify-between px-2">
                      <span className="italic">Dedication</span>
                      <span className="font-bold">{behaviour.dedication}</span>
                    </div>
                    <div className="p-0.5 flex items-center justify-between px-2">
                      <span className="italic">Physical Health</span>
                      <span className="font-bold">{behaviour.physicalHealth}</span>
                    </div>
                  </div>
                </div>

                {/* GUIDE & GENERAL COMMENT */}
                <div className="grid grid-cols-3 border-b border-black text-[8.5px]">
                  <div className="border-r border-black p-1 italic leading-tight">
                    <p className="font-bold underline text-center text-[8.5px]">GUIDE:</p>
                    <div className="grid grid-cols-2 mt-0.5 text-[8px] px-1">
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
                    <p className="mt-1 italic font-semibold text-[9.5px] px-2 leading-tight">
                      {generalComment}
                    </p>
                  </div>
                </div>

                {/* NEXT TERM ROW */}
                <div className="border-b border-black p-0.5 text-center text-[9px] font-bold italic bg-gray-50">
                  Next term begins on:{" "}
                  <span className="ml-3 underline font-serif tracking-wider">
                    {nextTermDate}
                  </span>
                </div>
              </div>

              {/* LOWER SIGNATURE & STAMP FOOTER */}
              <div>
                <div className="relative grid grid-cols-2 text-[9px] font-bold italic min-h-[54px] pt-1">
                  {/* DIRECTOR SIGNATURE */}
                  <div className="border-r border-black p-1 text-center relative flex flex-col justify-between items-center">
                    <div>
                      <p className="leading-tight">Director&apos;s</p>
                      <p className="leading-tight">Signature and Date</p>
                    </div>
                    
                    <div className="my-0.5">
                      <SignatureSVG1 className="w-28 h-7" />
                    </div>

                    <div className="w-full text-right pr-2 text-[8px] font-semibold font-serif">
                      26 February, 2026
                    </div>
                  </div>

                  {/* HEADMASTER SIGNATURE & OVERLAID STAMP */}
                  <div className="p-1 text-center relative flex flex-col justify-between items-center">
                    <div>
                      <p className="leading-tight">Headmaster&apos;s/Headmistress</p>
                      <p className="leading-tight">Signature and Date</p>
                    </div>

                    <div className="my-0.5">
                      <SignatureSVG2 className="w-28 h-7" />
                    </div>

                    <div className="w-full text-right pr-2 text-[8px] font-semibold font-serif">
                      26 February, 2026
                    </div>

                    {/* BLUE OFFICIAL RUBBER STAMP OVERLAY */}
                    <div className="absolute right-[-10px] bottom-[-10px] z-20">
                      <OfficialStampSVG className="w-28 h-28" />
                    </div>
                  </div>
                </div>

                {/* BRANDING FOOTER */}
                <div className="mt-1 text-[7px] italic text-gray-700 font-semibold border-t border-gray-400 pt-[1px] flex justify-between items-center px-1">
                  <span>Designed @ 08101130605</span>
                  <span className="text-[6.5px]">JIDDA STANDARD ACADEMY OFFICIAL RESULT SHEET</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
