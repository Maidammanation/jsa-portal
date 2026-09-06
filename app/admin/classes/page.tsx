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
import type { ClassRoom, Subject } from "@/lib/types";

type SchoolLevel = "nursery" | "primary" | "jss" | "ss";

const LEVEL_LABELS: Record<SchoolLevel, string> = {
  nursery: "Nursery",
  primary: "Primary",
  jss: "JSS",
  ss: "SS",
};

const DEFAULT_CLASSES: { name: string; level: string }[] = [
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

const DEFAULT_SUBJECTS: {
  name: string;
  levels: SchoolLevel[];
}[] = [
  // Nursery
  {
    name: "English Language",
    levels: ["nursery", "primary", "jss", "ss"],
  },
  {
    name: "Mathematics",
    levels: ["nursery", "primary", "jss", "ss"],
  },
  {
    name: "Basic Science",
    levels: ["nursery", "primary", "jss"],
  },
  {
    name: "Social Studies",
    levels: ["nursery", "jss"],
  },
  {
    name: "Civic Education",
    levels: ["nursery", "jss"],
  },
  {
    name: "Islamic Religious Studies",
    levels: ["nursery", "primary", "jss", "ss"],
  },
  {
    name: "Christian Religious Studies",
    levels: ["nursery", "primary", "jss", "ss"],
  },
  {
    name: "Cultural and Creative Arts (CCA)",
    levels: ["nursery", "primary", "jss", "ss"],
  },
  {
    name: "Physical and Health Education",
    levels: ["nursery", "primary", "jss", "ss"],
  },
  {
    name: "Computer Studies / ICT",
    levels: ["nursery", "primary", "jss", "ss"],
  },
  {
    name: "Hausa Language",
    levels: ["nursery", "primary", "jss", "ss"],
  },

  // Primary
  {
    name: "Basic Science and Technology",
    levels: ["primary"],
  },
  {
    name: "Basic Technology",
    levels: ["primary", "jss"],
  },
  {
    name: "Agricultural Science",
    levels: ["primary", "jss", "ss"],
  },
  {
    name: "Nigerian History",
    levels: ["primary", "jss"],
  },
  {
    name: "Social and Citizenship Studies",
    levels: ["primary"],
  },
  {
    name: "Home Economics",
    levels: ["primary", "jss"],
  },
  {
    name: "French",
    levels: ["primary", "jss", "ss"],
  },
  {
    name: "Arabic Language",
    levels: ["primary", "jss", "ss"],
  },

  // JSS
  {
    name: "Business Studies",
    levels: ["jss"],
  },
  {
    name: "Security Education",
    levels: ["jss"],
  },
  {
    name: "Literature in English",
    levels: ["jss", "ss"],
  },
  {
    name: "Geography",
    levels: ["jss", "ss"],
  },

  // Senior Secondary
  {
    name: "Physics",
    levels: ["ss"],
  },
  {
    name: "Chemistry",
    levels: ["ss"],
  },
  {
    name: "Biology",
    levels: ["ss"],
  },
  {
    name: "Further Mathematics",
    levels: ["ss"],
  },
  {
    name: "Economics",
    levels: ["ss"],
  },
  {
    name: "Government",
    levels: ["ss"],
  },
  {
    name: "Financial Accounting",
    levels: ["ss"],
  },
  {
    name: "Commerce",
    levels: ["ss"],
  },
  {
    name: "General Mathematics",
    levels: ["ss"],
  },
  {
    name: "Citizenship and Heritage Studies",
    levels: ["ss"],
  },
  {
    name: "Digital Technologies",
    levels: ["ss"],
  },
  {
    name: "Visual Arts",
    levels: ["ss"],
  },
  {
    name: "Technical Drawing",
    levels: ["ss"],
  },
  {
    name: "Physical Education",
    levels: ["ss"],
  },
  {
    name: "Health Education",
    levels: ["ss"],
  },
  {
    name: "Foods and Nutrition",
    levels: ["ss"],
  },
  {
    name: "Trade Subject",
    levels: ["ss"],
  },
];

const LEVEL_ORDER: SchoolLevel[] = [
  "nursery",
  "primary",
  "jss",
  "ss",
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

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState("");

  const [newSubjectName, setNewSubjectName] =
    useState("");
  const [newSubjectLevels, setNewSubjectLevels] =
    useState<SchoolLevel[]>([]);

  const [savingClass, setSavingClass] = useState(false);
  const [savingSubject, setSavingSubject] =
    useState(false);
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

  const handleApplyCurriculum = async () => {
    if (
      !confirm(
        "This will add any missing JSA classes and subjects, including Nursery 3, and update the level assignment of matching existing subjects. Existing records will not be deleted. Continue?"
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
            normalize(defaultSubject.name)
        );

        if (existing) {
          await update("subjects", existing.id, {
            levels: defaultSubject.levels,
          });
        } else {
          await create("subjects", {
            name: defaultSubject.name,
            levels: defaultSubject.levels,
          });
        }
      }

      await Promise.all([
        loadClasses(),
        loadSubjects(),
      ]);
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
        "Please select at least one school level for this subject."
      );
      return;
    }

    const alreadyExists = subjects.some(
      (subject) =>
        normalize(subject.name) ===
        normalize(newSubjectName)
    );

    if (alreadyExists) {
      alert(
        "A subject with this name already exists."
      );
      return;
    }

    setSavingSubject(true);

    try {
      await create("subjects", {
        name: newSubjectName.trim(),
        levels: newSubjectLevels,
      });

      setNewSubjectName("");
      setNewSubjectLevels([]);

      await loadSubjects();
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

    await remove("classes", id);
    await loadClasses();
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Remove this subject?")) return;

    await remove("subjects", id);
    await loadSubjects();
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
    },
    {
      header: "School Level",
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
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Classes & Subjects
          </h1>

          <p className="text-sm text-gray-500">
            Manage JSA classes and the subjects offered
            at each school level.
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

      {/* Level filters */}
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
            onClick={() =>
              setSelectedLevel(level)
            }
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

      {/* Curriculum summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LEVEL_ORDER.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() =>
              setSelectedLevel(level)
            }
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

      {/* Classes */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Classes
        </h2>

        <form
          onSubmit={handleAddClass}
          className="bg-white rounded-card border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-end"
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
                setNewClassLevel(
                  event.target.value
                )
              }
            />
          </div>

          <Button
            type="submit"
            disabled={savingClass}
            className="mb-4 sm:mb-0"
          >
            {savingClass
              ? "Adding..."
              : "+ Add Class"}
          </Button>
        </form>

        <DataTable
          columns={classColumns}
          data={filteredClasses}
          emptyMessage="No classes found for this level."
        />
      </section>

      {/* Subjects */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Subjects
        </h2>

        <form
          onSubmit={handleAddSubject}
          className="bg-white rounded-card border border-gray-100 shadow-sm p-4 space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <TextInput
                label="Subject Name"
                placeholder="e.g. Hausa Language"
                value={newSubjectName}
                onChange={(event) =>
                  setNewSubjectName(
                    event.target.value
                  )
                }
              />
            </div>

            <Button
              type="submit"
              disabled={savingSubject}
              className="mb-4 sm:mb-0"
            >
              {savingSubject
                ? "Adding..."
                : "+ Add Subject"}
            </Button>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">
              Subject applies to
            </p>

            <div className="flex flex-wrap gap-2">
              {LEVEL_ORDER.map((level) => {
                const selected =
                  newSubjectLevels.includes(level);

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() =>
                      toggleNewSubjectLevel(level)
                    }
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      selected
                        ? "bg-brand text-white border-brand"
                        : "bg-white text-gray-600 border-gray-200"
                    }`}
                  >
                    {LEVEL_LABELS[level]}
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        <DataTable
          columns={subjectColumns}
          data={filteredSubjects}
          emptyMessage="No subjects found for this level."
        />
      </section>

      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Designed & Developed by Maidammanation
          Tech Company
        </p>

        <p className="text-xs text-gray-400 mt-1">
          08032191668 / 08117106867
        </p>
      </div>
    </div>
  );
}