"use client";

import { useEffect, useMemo, useState } from "react";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { DataTable, type Column } from "@/components/Tables";
import {
  getClasses,
  getSubjects,
  create,
  update,
  remove,
} from "@/services/database";
import type {
  ClassRoom,
  SchoolLevel,
  Subject,
  SubjectSection,
  ScoringType,
} from "@/lib/types";

const LEVEL_LABELS: Record<SchoolLevel, string> = {
  nursery: "Nursery",
  primary: "Primary",
  jss: "JSS",
  ss: "SS",
};

const LEVEL_ORDER: SchoolLevel[] = [
  "nursery",
  "primary",
  "jss",
  "ss",
];

type CurriculumSubject = {
  name: string;
  levels: SchoolLevel[];
  section: SubjectSection;
  scoringType: ScoringType;
};

/*
|--------------------------------------------------------------------------
| JSA CLASSES
|--------------------------------------------------------------------------
*/

const DEFAULT_CLASSES: {
  name: string;
  level: string;
}[] = [
  { name: "Nursery 1", level: "Nursery" },
  { name: "Nursery 2", level: "Nursery" },
  { name: "Nursery 3", level: "Nursery" },

  { name: "Primary 1", level: "Primary" },
  { name: "Primary 2", level: "Primary" },
  { name: "Primary 3", level: "Primary" },
  { name: "Primary 4", level: "Primary" },
  { name: "Primary 5", level: "Primary" },
  { name: "Primary 6", level: "Primary" },

  { name: "JSS 1", level: "Junior Secondary" },
  { name: "JSS 2", level: "Junior Secondary" },
  { name: "JSS 3", level: "Junior Secondary" },

  { name: "SS 1", level: "Senior Secondary" },
  { name: "SS 2", level: "Senior Secondary" },
  { name: "SS 3", level: "Senior Secondary" },
];

/*
|--------------------------------------------------------------------------
| JSA CURRICULUM
|--------------------------------------------------------------------------
*/

const DEFAULT_SUBJECTS: CurriculumSubject[] = [
  /*
  |--------------------------------------------------------------------------
  | NURSERY MAIN
  |--------------------------------------------------------------------------
  */

  {
    name: "Literacy",
    levels: ["nursery"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Numeracy",
    levels: ["nursery"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Social Habits",
    levels: ["nursery"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Social Norms",
    levels: ["nursery"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "General Knowledge",
    levels: ["nursery"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Jolly Phonics",
    levels: ["nursery"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Rhythms",
    levels: ["nursery"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Creative Arts",
    levels: ["nursery"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Handwriting",
    levels: ["nursery"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Health Habits",
    levels: ["nursery"],
    section: "main",
    scoringType: "main-20-20-60",
  },

  /*
  |--------------------------------------------------------------------------
  | NURSERY ARABIC
  |--------------------------------------------------------------------------
  */

  {
    name: "اللغة العربية",
    levels: ["nursery"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الحروف",
    levels: ["nursery"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الحديث",
    levels: ["nursery"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "التوحيد",
    levels: ["nursery"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الأرقام",
    levels: ["nursery"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "القرآن الكريم",
    levels: ["nursery"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الحوار",
    levels: ["nursery"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الأذكار",
    levels: ["nursery"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },

  /*
  |--------------------------------------------------------------------------
  | PRIMARY MAIN
  |--------------------------------------------------------------------------
  */

  {
    name: "English Language",
    levels: ["primary"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Mathematics",
    levels: ["primary"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Computer",
    levels: ["primary"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Social Studies",
    levels: ["primary"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Basic Science",
    levels: ["primary"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Islamic Studies",
    levels: ["primary"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Verbal Reasoning",
    levels: ["primary"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Quantitative Reasoning",
    levels: ["primary"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "CCA",
    levels: ["primary"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Writing",
    levels: ["primary"],
    section: "main",
    scoringType: "main-20-20-60",
  },

  /*
  |--------------------------------------------------------------------------
  | PRIMARY ARABIC
  |--------------------------------------------------------------------------
  */

  {
    name: "القرآن الكريم",
    levels: ["primary"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الحديث",
    levels: ["primary"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "التوحيد",
    levels: ["primary"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الفقه",
    levels: ["primary"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "السيرة",
    levels: ["primary"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "العربية",
    levels: ["primary"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الحروف",
    levels: ["primary"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الأذكار",
    levels: ["primary"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },

  /*
  |--------------------------------------------------------------------------
  | JSS MAIN
  |--------------------------------------------------------------------------
  */

  {
    name: "English Language",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Mathematics",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Basic Science & Technology",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Civic Education",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Computer",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Agricultural Science",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Islamic Studies",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Business Studies",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Home Economics",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "Physical & Health Education",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },
  {
    name: "CCA",
    levels: ["jss"],
    section: "main",
    scoringType: "main-20-20-60",
  },

  /*
  |--------------------------------------------------------------------------
  | JSS ARABIC
  |--------------------------------------------------------------------------
  */

  {
    name: "القرآن الكريم",
    levels: ["jss"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "التوحيد",
    levels: ["jss"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "خلاصة نور اليقين",
    levels: ["jss"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الحديث",
    levels: ["jss"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الجديد",
    levels: ["jss"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "باري وبيبا",
    levels: ["jss"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "النحو",
    levels: ["jss"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "التجويد",
    levels: ["jss"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },
  {
    name: "الأذكار",
    levels: ["jss"],
    section: "arabic",
    scoringType: "arabic-40-60",
  },

  /*
  |--------------------------------------------------------------------------
  | SS
  |--------------------------------------------------------------------------
  |
  | SS curriculum was not provided in the actual JSA curriculum list.
  | We leave it available for manual creation from the interface.
  |
  |--------------------------------------------------------------------------
  */
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getClassLevel(
  level?: string,
  name?: string
): SchoolLevel | "" {
  const value = `${level || ""} ${name || ""}`.toLowerCase();

  if (value.includes("nursery")) return "nursery";

  if (value.includes("primary")) return "primary";

  if (
    value.includes("jss") ||
    value.includes("junior secondary")
  ) {
    return "jss";
  }

  if (
    value.includes("ss ") ||
    value.startsWith("ss") ||
    value.includes("senior secondary")
  ) {
    return "ss";
  }

  return "";
}

function getSectionLabel(section?: SubjectSection) {
  return section === "arabic"
    ? "Arabic"
    : "Main";
}

function getScoringLabel(scoringType?: ScoringType) {
  if (scoringType === "arabic-40-60") {
    return "CA 40 + Exam 60";
  }

  return "CA1 20 + CA2 20 + Exam 60";
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState("");

  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectLevels, setNewSubjectLevels] =
    useState<SchoolLevel[]>([]);

  const [newSubjectSection, setNewSubjectSection] =
    useState<SubjectSection>("main");

  const [newSubjectScoring, setNewSubjectScoring] =
    useState<ScoringType>("main-20-20-60");

  const [savingClass, setSavingClass] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [selectedLevel, setSelectedLevel] =
    useState<"all" | SchoolLevel>("all");

  const loadClasses = async () => {
    const data = await getClasses();
    setClasses(data as ClassRoom[]);
  };

  const loadSubjects = async () => {
    const data = await getSubjects();
    setSubjects(data as Subject[]);
  };

  useEffect(() => {
    loadClasses();
    loadSubjects();
  }, []);

  const subjectsByLevel = useMemo(() => {
    return {
      nursery: subjects.filter((subject) =>
        subject.levels?.includes("nursery")
      ),
      primary: subjects.filter((subject) =>
        subject.levels?.includes("primary")
      ),
      jss: subjects.filter((subject) =>
        subject.levels?.includes("jss")
      ),
      ss: subjects.filter((subject) =>
        subject.levels?.includes("ss")
      ),
    };
  }, [subjects]);

  const filteredClasses = useMemo(() => {
    if (selectedLevel === "all") {
      return classes;
    }

    return classes.filter(
      (classRoom) =>
        getClassLevel(
          classRoom.level,
          classRoom.name
        ) === selectedLevel
    );
  }, [classes, selectedLevel]);

  const filteredSubjects = useMemo(() => {
    if (selectedLevel === "all") {
      return subjects;
    }

    return subjects.filter((subject) =>
      subject.levels?.includes(selectedLevel)
    );
  }, [subjects, selectedLevel]);

  const toggleNewSubjectLevel = (
    level: SchoolLevel
  ) => {
    setNewSubjectLevels((previous) =>
      previous.includes(level)
        ? previous.filter(
            (item) => item !== level
          )
        : [...previous, level]
    );
  };

  const handleSectionChange = (
    section: SubjectSection
  ) => {
    setNewSubjectSection(section);

    setNewSubjectScoring(
      section === "arabic"
        ? "arabic-40-60"
        : "main-20-20-60"
    );
  };

  const handleApplyCurriculum = async () => {
    if (
      !confirm(
        "Apply the official JSA curriculum defaults? Missing classes and subjects will be added. Existing matching subjects will be updated with their correct level, section and scoring structure. Existing records will not be deleted."
      )
    ) {
      return;
    }

    setSeeding(true);

    try {
      const existingClassNames = new Set(
        classes.map((item) => normalize(item.name))
      );

      for (const classItem of DEFAULT_CLASSES) {
        if (
          !existingClassNames.has(
            normalize(classItem.name)
          )
        ) {
          await create("classes", classItem);
        }
      }

      const currentSubjects =
        (await getSubjects()) as Subject[];

      for (const defaultSubject of DEFAULT_SUBJECTS) {
        const existing = currentSubjects.find(
          (subject) =>
            normalize(subject.name) ===
              normalize(defaultSubject.name) &&
            subject.levels?.some((level) =>
              defaultSubject.levels.includes(level)
            )
        );

        if (existing) {
          await update("subjects", existing.id, {
            levels: defaultSubject.levels,
            section: defaultSubject.section,
            scoringType: defaultSubject.scoringType,
          });
        } else {
          await create("subjects", {
            name: defaultSubject.name,
            levels: defaultSubject.levels,
            section: defaultSubject.section,
            scoringType: defaultSubject.scoringType,
          });
        }
      }

      await Promise.all([
        loadClasses(),
        loadSubjects(),
      ]);

      alert("JSA curriculum applied successfully.");
    } catch (error) {
      console.error(error);
      alert(
        "Unable to apply the curriculum. Please try again."
      );
    } finally {
      setSeeding(false);
    }
  };

  const handleAddClass = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!newClassName.trim()) return;

    setSavingClass(true);

    try {
      await create("classes", {
        name: newClassName.trim(),
        level: newClassLevel.trim(),
      });

      setNewClassName("");
      setNewClassLevel("");

      await loadClasses();
    } catch (error) {
      console.error(error);
      alert("Unable to add class.");
    } finally {
      setSavingClass(false);
    }
  };

  const handleAddSubject = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!newSubjectName.trim()) return;

    if (newSubjectLevels.length === 0) {
      alert(
        "Please select at least one school level."
      );
      return;
    }

    const alreadyExists = subjects.some(
      (subject) =>
        normalize(subject.name) ===
          normalize(newSubjectName) &&
        subject.section === newSubjectSection
    );

    if (alreadyExists) {
      alert(
        "A subject with this name and section already exists."
      );
      return;
    }

    setSavingSubject(true);

    try {
      await create("subjects", {
        name: newSubjectName.trim(),
        levels: newSubjectLevels,
        section: newSubjectSection,
        scoringType: newSubjectScoring,
      });

      setNewSubjectName("");
      setNewSubjectLevels([]);
      setNewSubjectSection("main");
      setNewSubjectScoring("main-20-20-60");

      await loadSubjects();
    } catch (error) {
      console.error(error);
      alert("Unable to add subject.");
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (
      !confirm(
        "Remove this class? Students already in it will need to be reassigned."
      )
    ) {
      return;
    }

    try {
      await remove("classes", id);
      await loadClasses();
    } catch (error) {
      console.error(error);
      alert("Unable to remove class.");
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Remove this subject?")) return;

    try {
      await remove("subjects", id);
      await loadSubjects();
    } catch (error) {
      console.error(error);
      alert("Unable to remove subject.");
    }
  };

  const classColumns: Column<ClassRoom>[] = [
    {
      header: "Class Name",
      accessor: "name",
    },
    {
      header: "Level",
      accessor: "level",
    },
    {
      header: "Actions",
      accessor: "id",
      render: (classRoom) => (
        <button
          onClick={() =>
            handleDeleteClass(classRoom.id)
          }
          className="text-status-disabled hover:underline"
        >
          Remove
        </button>
      ),
    },
  ];

  const subjectColumns: Column<Subject>[] = [
    {
      header: "Subject Name",
      accessor: "name",
      render: (subject) => (
        <span
          className={
            subject.section === "arabic"
              ? "font-medium"
              : ""
          }
        >
          {subject.name}
        </span>
      ),
    },
    {
      header: "Level",
      accessor: "levels",
      render: (subject) => {
        if (!subject.levels?.length) {
          return (
            <span className="text-xs text-gray-400">
              Not assigned
            </span>
          );
        }

        return (
          <div className="flex flex-wrap gap-1">
            {LEVEL_ORDER.filter((level) =>
              subject.levels?.includes(level)
            ).map((level) => (
              <span
                key={level}
                className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {LEVEL_LABELS[level]}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      header: "Section",
      accessor: "section",
      render: (subject) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
            subject.section === "arabic"
              ? "bg-amber-100 text-amber-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {getSectionLabel(subject.section)}
        </span>
      ),
    },
    {
      header: "Scoring",
      accessor: "scoringType",
      render: (subject) => (
        <span className="text-xs text-gray-600">
          {getScoringLabel(subject.scoringType)}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "id",
      render: (subject) => (
        <button
          onClick={() =>
            handleDeleteSubject(subject.id)
          }
          className="text-status-disabled hover:underline"
        >
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Classes & Subjects
          </h1>

          <p className="text-sm text-gray-500">
            Manage JSA classes, curriculum sections and
            subject scoring structures.
          </p>
        </div>

        <Button
          onClick={handleApplyCurriculum}
          disabled={seeding}
          variant="secondary"
        >
          {seeding
            ? "Applying curriculum..."
            : "Apply JSA Curriculum Defaults"}
        </Button>
      </div>

      {/* LEVEL FILTERS */}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedLevel("all")}
          className={`rounded-lg px-3 py-2 text-sm border ${
            selectedLevel === "all"
              ? "bg-brand text-white border-brand"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          All
        </button>

        {LEVEL_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setSelectedLevel(level)}
            className={`rounded-lg px-3 py-2 text-sm border ${
              selectedLevel === level
                ? "bg-brand text-white border-brand"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            {LEVEL_LABELS[level]}
          </button>
        ))}
      </div>

      {/* CURRICULUM SUMMARY */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LEVEL_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setSelectedLevel(level)}
            className="bg-white rounded-card border border-gray-100 shadow-sm p-4 text-left hover:border-brand/30"
          >
            <p className="text-xs text-gray-400 uppercase tracking-wide">
              {LEVEL_LABELS[level]}
            </p>

            <p className="text-2xl font-semibold text-gray-800 mt-1">
              {subjectsByLevel[level].length}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              subjects
            </p>
          </button>
        ))}
      </div>

      {/* CLASSES */}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Classes
        </h2>

        <form
          onSubmit={handleAddClass}
          className="bg-white rounded-card border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3