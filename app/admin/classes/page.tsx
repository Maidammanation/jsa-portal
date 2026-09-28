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

const LEVEL_ORDER: SchoolLevel[] = [
  "nursery",
  "primary",
  "jss",
  "ss",
];

const LEVEL_LABELS: Record<SchoolLevel, string> = {
  nursery: "Nursery",
  primary: "Primary",
  jss: "JSS",
  ss: "SS",
};

type CurriculumSubject = {
  name: string;
  levels: SchoolLevel[];
  section: SubjectSection;
  scoringType: ScoringType;
};

const DEFAULT_CLASSES = [
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

const DEFAULT_SUBJECTS: CurriculumSubject[] = [
  // =========================
  // NURSERY MAIN
  // =========================
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

  // =========================
  // NURSERY ARABIC
  // =========================
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

  // =========================
  // PRIMARY MAIN
  // =========================
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

  // =========================
  // PRIMARY ARABIC
  // =========================
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

  // =========================
  // JSS MAIN
  // =========================
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

  // =========================
  // JSS ARABIC
  // =========================
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
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function getClassLevel(
  level?: string,
  name?: string
): SchoolLevel | "" {
  const value = `${level || ""} ${name || ""}`.toLowerCase();

  if (value.includes("nursery")) {
    return "nursery";
  }

  if (value.includes("primary")) {
    return "primary";
  }

  if (
    value.includes("jss") ||
    value.includes("junior secondary")
  ) {
    return "jss";
  }

  if (
    value.startsWith("ss") ||
    value.includes("senior secondary")
  ) {
    return "ss";
  }

  return "";
}

function sectionLabel(section?: SubjectSection) {
  return section === "arabic" ? "Arabic" : "Main";
}

function scoringLabel(scoring?: ScoringType) {
  return scoring === "arabic-40-60"
    ? "CA 40 + Exam 60"
    : "CA1 20 + CA2 20 + Exam 60";
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

  async function loadClasses() {
    const data = await getClasses();
    setClasses(data as ClassRoom[]);
  }

  async function loadSubjects() {
    const data = await getSubjects();
    setSubjects(data as Subject[]);
  }

  useEffect(() => {
    void loadClasses();
    void loadSubjects();
  }, []);

  const filteredClasses = useMemo(() => {
    if (selectedLevel === "all") {
      return classes;
    }

    return classes.filter(
      (item) =>
        getClassLevel(item.level, item.name) ===
        selectedLevel
    );
  }, [classes, selectedLevel]);

  const filteredSubjects = useMemo(() => {
    if (selectedLevel === "all") {
      return subjects;
    }

    return subjects.filter((item) =>
      item.levels?.includes(selectedLevel)
    );
  }, [subjects, selectedLevel]);

  const subjectCounts = useMemo(
    () => ({
      nursery: subjects.filter((s) =>
        s.levels?.includes("nursery")
      ).length,
      primary: subjects.filter((s) =>
        s.levels?.includes("primary")
      ).length,
      jss: subjects.filter((s) =>
        s.levels?.includes("jss")
      ).length,
      ss: subjects.filter((s) =>
        s.levels?.includes("ss")
      ).length,
    }),
    [subjects]
  );

  function toggleLevel(level: SchoolLevel) {
    setNewSubjectLevels((current) =>
      current.includes(level)
        ? current.filter((item) => item !== level)
        : [...current, level]
    );
  }

  function changeSection(section: SubjectSection) {
    setNewSubjectSection(section);

    setNewSubjectScoring(
      section === "arabic"
        ? "arabic-40-60"
        : "main-20-20-60"
    );
  }

  async function applyCurriculum() {
    const confirmed = confirm(
      "Apply the JSA curriculum? Missing classes and subjects will be added. Existing matching subjects will be updated. Nothing will be deleted."
    );

    if (!confirmed) {
      return;
    }

    setSeeding(true);

    try {
      const currentClasses =
        (await getClasses()) as ClassRoom[];

      const classNames = new Set(
        currentClasses.map((item) =>
          normalize(item.name)
        )
      );

      for (const item of DEFAULT_CLASSES) {
        if (!classNames.has(normalize(item.name))) {
          await create("classes", item);
        }
      }

      const currentSubjects =
        (await getSubjects()) as Subject[];

      for (const item of DEFAULT_SUBJECTS) {
        const existing = currentSubjects.find(
          (subject) =>
            normalize(subject.name) ===
              normalize(item.name) &&
            subject.levels?.some((level) =>
              item.levels.includes(level)
            ) &&
            (subject.section || "main") ===
              item.section
        );

        if (existing) {
          await update("subjects", existing.id, {
            levels: item.levels,
            section: item.section,
            scoringType: item.scoringType,
          });
        } else {
          await create("subjects", {
            name: item.name,
            levels: item.levels,
            section: item.section,
            scoringType: item.scoringType,
          });
        }
      }

      await loadClasses();
      await loadSubjects();

      alert("JSA curriculum applied successfully.");
    } catch (error) {
      console.error(error);
      alert(
        "Unable to apply the JSA curriculum."
      );
    } finally {
      setSeeding(false);
    }
  }

  async function addClass(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!newClassName.trim()) {
      return;
    }

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
  }

  async function addSubject(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!newSubjectName.trim()) {
      return;
    }

    if (newSubjectLevels.length === 0) {
      alert("Select at least one school level.");
      return;
    }

    const exists = subjects.some(
      (subject) =>
        normalize(subject.name) ===
          normalize(newSubjectName) &&
        (subject.section || "main") ===
          newSubjectSection
    );

    if (exists) {
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
  }

  async function deleteClass(id: string) {
    if (!confirm("Remove this class?")) {
      return;
    }

    try {
      await remove("classes", id);
      await loadClasses();
    } catch (error) {
      console.error(error);
      alert("Unable to remove class.");
    }
  }

  async function deleteSubject(id: string) {
    if (!confirm("Remove this subject?")) {
      return;
    }

    try {
      await remove("subjects", id);
      await loadSubjects();
    } catch (error) {
      console.error(error);
      alert("Unable to remove subject.");
    }
  }

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
      render: (item) => (
        <button
          type="button"
          onClick={() => void deleteClass(item.id)}
          className="text-status-disabled hover:underline"
        >
          Remove
        </button>
      ),
    },
  ];

  const subjectColumns: Column<Subject>[] = [
    {
      header: "Subject",
      accessor: "name",
    },
    {
      header: "Level",
      accessor: "levels",
      render: (subject) => (
        <div className="flex flex-wrap gap-1">
          {(subject.levels || []).map((level) => (
            <span
              key={level}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs"
            >
              {LEVEL_LABELS[level]}
            </span>
          ))}
        </div>
      ),
    },
    {
      header: "Section",
      accessor: "section",
      render: (subject) => (
        <span className="text-xs font-medium">
          {sectionLabel(subject.section)}
        </span>
      ),
    },
    {
      header: "Scoring",
      accessor: "scoringType",
      render: (subject) => (
        <span className="text-xs text-gray-600">
          {scoringLabel(subject.scoringType)}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "id",
      render: (subject) => (
        <button
          type="button"
          onClick={() =>
            void deleteSubject(subject.id)
          }
          className="text-status-disabled hover:underline"
        >
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Classes & Subjects
          </h1>

          <p className="text-sm text-gray-500">
            Manage JSA classes, curriculum and scoring.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => void applyCurriculum()}
          disabled={seeding}
          variant="secondary"
        >
          {seeding
            ? "Applying curriculum..."
            : "Apply JSA Curriculum Defaults"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedLevel("all")}
          className={`rounded-lg border px-3 py-2 text-sm ${
            selectedLevel === "all"
              ? "border-brand bg-brand text-white"
              : "border-gray-200 bg-white text-gray-600"
          }`}
        >
          All
        </button>

        {LEVEL_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setSelectedLevel(level)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              selectedLevel === level
                ? "border-brand bg-brand text-white"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            {LEVEL_LABELS[level]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {LEVEL_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setSelectedLevel(level)}
            className="rounded-card border border-gray-100 bg-white p-4 text-left shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-gray-400">
              {LEVEL_LABELS[level]}
            </p>

            <p className="mt-1 text-2xl font-semibold text-gray-800">
              {subjectCounts[level]}
            </p>

            <p className="text-xs text-gray-500">
              subjects
            </p>
          </button>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Classes
        </h2>

        <form
          onSubmit={addClass}
          className="flex flex-col gap-3 rounded-card border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <TextInput
              label="Class Name"
              placeholder="e.g. Nursery 3"
              value={newClassName}
              onChange={(event) =>
                setNewClassName(event.target.value)
              }
            />
          </div>

          <div className="flex-1">
            <TextInput
              label="Level"
              placeholder="e.g. Nursery"
              value={newClassLevel}
              onChange={(event) =>
                setNewClassLevel(event.target.value)
              }
            />
          </div>

          <Button
            type="submit"
            disabled={savingClass}
            className="sm:mb-0"
          >
            {savingClass ? "Adding..." : "+ Add Class"}
          </Button>
        </form>

        <DataTable
          columns={classColumns}
          data={filteredClasses}
          emptyMessage="No classes found."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Subjects
        </h2>

        <form
          onSubmit={addSubject}
          className="space-y-5 rounded-card border border-gray-100 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <TextInput
                label="Subject Name"
                placeholder="e.g. Mathematics or اللغة العربية"
                value={newSubjectName}
                onChange={(event) =>
                  setNewSubjectName(event.target.value)
                }
              />
            </div>

            <Button
              type="submit"
              disabled={savingSubject}
            >
              {savingSubject
                ? "Adding..."
                : "+ Add Subject"}
            </Button>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              School Level
            </p>

            <div className="flex flex-wrap gap-2">
              {LEVEL_ORDER.map((level) => {
                const selected =
                  newSubjectLevels.includes(level);

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => toggleLevel(level)}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      selected
                        ? "border-brand bg-brand text-white"
                        : "border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    {LEVEL_LABELS[level]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">
              Section
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changeSection("main")}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  newSubjectSection === "main"
                    ? "border-brand bg-brand text-white"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                Main
              </button>

              <button
                type="button"
                onClick={() => changeSection("arabic")}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  newSubjectSection === "arabic"
                    ? "border-brand bg-brand text-white"
                    : "border-gray-200 bg-white text-gray-600"
                }`}
              >
                Arabic
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Scoring Structure
            </label>

            <select
              value={newSubjectScoring}
              onChange={(event) =>
                setNewSubjectScoring(
                  event.target.value as ScoringType
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="main-20-20-60">
                Main — CA1 20 + CA2 20 + Exam 60
              </option>

              <option value="arabic-40-60">
                Arabic — CA 40 + Exam 60
              </option>
            </select>
          </div>
        </form>

        <DataTable
          columns={subjectColumns}
          data={filteredSubjects}
          emptyMessage="No subjects found."
        />
      </section>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-400">
          Designed & Developed by Maidammanation Tech
          Company
        </p>

        <p className="mt-1 text-xs text-gray-400">
          08032191668 / 08117106867
        </p>
      </div>
    </div>
  );
}