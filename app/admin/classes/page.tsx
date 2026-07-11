"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { DataTable, type Column } from "@/components/Tables";
import { getClasses, getSubjects, create, remove } from "@/services/database";
import type { ClassRoom, Subject } from "@/lib/types";

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [newClassLevel, setNewClassLevel] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [savingClass, setSavingClass] = useState(false);
  const [savingSubject, setSavingSubject] = useState(false);

  const loadClasses = () => getClasses().then((d) => setClasses(d as ClassRoom[]));
  const loadSubjects = () => getSubjects().then((d) => setSubjects(d as Subject[]));

  useEffect(() => {
    loadClasses();
    loadSubjects();
  }, []);

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
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Classes & Subjects</h1>
        <p className="text-sm text-gray-500">
          Classes need to exist here before you can assign students to them, take attendance, or enter results.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Classes</h2>
        <form onSubmit={handleAddClass} className="bg-white rounded-card border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <TextInput
              label="Class Name"
              placeholder="e.g. JSS 1A"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <TextInput
              label="Level"
              placeholder="e.g. JSS 1"
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
