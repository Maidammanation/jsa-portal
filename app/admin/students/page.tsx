"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DataTable, StatusBadge, type Column } from "@/components/Tables";
import { Button } from "@/components/Buttons";
import { TextInput } from "@/components/Forms";
import { getStudents, deleteStudent } from "@/services/database";
import type { Student } from "@/lib/types";

export default function StudentsListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getStudents()
      .then((data) => setStudents(data as Student[]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) =>
      `${s.firstName} ${s.lastName} ${s.admissionNo}`.toLowerCase().includes(term)
    );
  }, [search, students]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this student record? This cannot be undone.")) return;
    await deleteStudent(id);
    load();
  };

  const columns: Column<Student>[] = [
    { header: "Admission No.", accessor: "admissionNo" },
    {
      header: "Name",
      accessor: "firstName",
      render: (s) => `${s.firstName} ${s.lastName}`,
    },
    { header: "Class", accessor: "className", render: (s) => s.className || s.classId },
    { header: "Gender", accessor: "gender" },
    {
      header: "Status",
      accessor: "status",
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      header: "Actions",
      accessor: "id",
      render: (s) => (
        <div className="flex gap-3">
          <Link href={`/admin/students/${s.id}/edit`} className="text-brand hover:underline">
            Edit
          </Link>
          <button onClick={() => handleDelete(s.id)} className="text-status-disabled hover:underline">
            Remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-800">Students</h1>
        <Link href="/admin/students/new">
          <Button>+ Add Student</Button>
        </Link>
      </div>

      <div className="max-w-sm">
        <TextInput
          label="Search"
          placeholder="Search by name or admission no."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading students...</p>
      ) : (
        <DataTable columns={columns} data={filtered} emptyMessage="No students found." />
      )}
    </div>
  );
}
