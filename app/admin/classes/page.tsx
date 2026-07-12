"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { DataTable, type Column } from "@/components/Tables";
import { getClasses, getSubjects, create, remove } from "@/services/database";
import type { ClassRoom, Subject } from "@/lib/types";

// Standard Nigerian basic + secondary education levels, no A/B streams.
const DEFAULT_CLASSES: { name: string; level: string }[] = [
  { name: "Nursery 1", level: "Nursery" },
  { name: "Nursery 2", level: "Nursery" },
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

// A broad set covering common core + JSS + SS subjects across the Nigerian curriculum.
// Not every subject applies to every class, but this covers the full spread you'll need.
const DEFAULT_SUBJECTS: string[] = [
  "English Language",
  "Mathematics",
  "Basic Science",
  "Basic Technology",
  "Agricultural Science",
  "Social Studies",
  "Civic Education",
  "Christian Religious Studies",
  "Islamic Religious Studies",
  "Physical and Health Education",
  "Computer Studies / ICT",
  "French",
  "Home Economics",
  "Business Studies",
  "Fine Arts",
  "Music",
  "Physics",
  "Chemistry",
  "Biology",
  "Further Mathematics",
  "Economics",
  "Government",
  "Literature in English",
  "Geography",
  "Financial Accounting",
  "Commerce",
];

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [savingClass, setSavingClass] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadClasses = () => getClasses().then((d) => setClasses(d as ClassRoom[]));
  const loadSubjects = () => getSubjects().then((d) => setSubjects(d as Subject[]));

  useEffect(() => {
    loadClasses();
    loadSubjects();
  }, []);

  const handleSeedDefaults = async () => {
    if (
      !confirm(
        "This will add Nursery 1 through SS 3 as classes, plus the standard Nigerian curriculum subject list. Continue?"
      )
    )
      return;
    setSeeding(true);
    try {
      await Promise.all(DEFAULT_CLASSES.map((c) => create("classes", c)));
      await Promise.all(DEFAULT_SUBJECTS.map((name) => create("subjects", { name })));
      await Promise.all([loadClasses(), loadSubjects()]);
    } finally {
      setSeeding(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setSavingClass(true);
    try {
      await create("classes", { name: newClassName.trim(), level: newClassLevel.trim() });
      setNewClassName("");
      setNewClassLevel("");
      loadClasses();
    } finally {
      setSavingClass(false);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setSavingSubject(true);
    try {
      await create("subjects", { name: newSubjectName.trim() });
      setNewSubjectName("");
      loadSubjects();
    } finally {
      setSavingSubject(false);
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Remove this class? Students already in it will need to be reassigned.")) return;
    await remove("classes", id);
    loadClasses();
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Remove this subject?")) return;
    await remove("subjects", id);
    loadSubjects();
  };

  const classColumns: Column<ClassRoom>[] = [
    { header: "Class Name", accessor: "name" },
    { header: "Level", accessor: "level" },
    {
      header: "Actions",
      accessor: "id",
      render: (c) => (
        <button onClick={() => handleDeleteClass(c.id)} className="text-status-disabled hover:underline">
          Remove
        </button>
      ),
    },
  ];

  const subjectColumns: Column<Subject>[] = [
    { header: "Subject Name", accessor: "name" },
    {
      header: "Actions",
      accessor: "id",
      render: (s) => (
        <button onClick={() => handleDeleteSubject(s.id)} className="text-status-disabled hover:underline">
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Classes & Subjects</h1>
          <p className="text-sm text-gray-500">
            Classes need to exist here before you can assign students to them, take attendance, or enter results.
          </p>
        </div>
        {classes.length === 0 && subjects.length === 0 && (
          <Button onClick={handleSeedDefaults} disabled={seeding} variant="secondary">
            {seeding ? "Setting up..." : "Set up Nursery – SS3 defaults"}
          </Button>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Classes</h2>
        <form onSubmit={handleAddClass} className="bg-white rounded-card border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <TextInput
              label="Class Name"
              placeholder="e.g. JSS 1"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <TextInput
              label="Level"
              placeholder="e.g. Junior Secondary"
              value={newClassLevel}
              onChange={(e) => setNewClassLevel(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={savingClass} className="mb-4 sm:mb-0">
            {savingClass ? "Adding..." : "+ Add Class"}
          </Button>
        </form>
        <DataTable columns={classColumns} data={classes} emptyMessage="No classes yet — add one above." />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Subjects</h2>
        <form onSubmit={handleAddSubject} className="bg-white rounded-card border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <TextInput
              label="Subject Name"
              placeholder="e.g. Mathematics"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={savingSubject} className="mb-4 sm:mb-0">
            {savingSubject ? "Adding..." : "+ Add Subject"}
          </Button>
        </form>
        <DataTable columns={subjectColumns} data={subjects} emptyMessage="No subjects yet — add one above." />
      </section>
    </div>
  );
} 
