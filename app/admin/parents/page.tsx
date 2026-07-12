"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, StatusBadge, type Column } from "@/components/Tables";
import { Button } from "@/components/Buttons";
import { getAll, remove } from "@/services/database";

interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: "active" | "suspended" | "disabled";
}

export default function ParentsListPage() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getAll("parents")
      .then((data) => setParents(data as Parent[]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this parent record? This cannot be undone.")) return;
    await remove("parents", id);
    load();
  };

  const columns: Column<Parent>[] = [
    {
      header: "Name",
      accessor: "firstName",
      render: (p) => `${p.firstName} ${p.lastName}`,
    },
    { header: "Email", accessor: "email" },
    { header: "Phone", accessor: "phone", render: (p) => p.phone || "—" },
    {
      header: "Status",
      accessor: "status",
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      header: "Actions",
      accessor: "id",
      render: (p) => (
        <button onClick={() => handleDelete(p.id)} className="text-status-disabled hover:underline">
          Remove
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-gray-800">Parents</h1>
        <Link href="/admin/parents/new">
          <Button>+ Add Parent</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading parents...</p>
      ) : (
        <DataTable columns={columns} data={parents} emptyMessage="No parents found." />
      )}
    </div>
  );
}