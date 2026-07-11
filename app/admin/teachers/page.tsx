"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, StatusBadge, type Column } from "@/components/Tables";
import { Button } from "@/components/Buttons";
import { getAll, remove } from "@/services/database";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  subject?: string;
  status: "active" | "suspended" | "disabled";
}

export default function TeachersListPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getAll("teachers")
      .then((data) => setTeachers(data as Teacher[]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this teacher record? This cannot be undone.")) return;
    await remove("teachers", id);
    load();
  };

  const columns: Column<Teacher>[] = [
    {
      header: "Name",
      accessor: "firstName",
      render: (t) => `${t.firstName} ${t.lastName}`,
    },
    { header: "Email", accessor: "email" },
    { header: "Subject", accessor: "subject", render: (t) => t.subject || "—" },
    {
      header: "Status",
      accessor: "status",
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      header: "Actions",
      accessor: "id",
      render: (t) => (
        <button onClick={() => handleDelete(t.id)} className="text-status-disabled hover:underline">
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-800">Teachers</h1>
        <Link href="/admin/teachers/new">
          <Button>+ Add Teacher</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading teachers...</p>
      ) : (
        <DataTable columns={columns} data={teachers} emptyMessage="No teachers found." />
      )}
    </div>
  );
}
