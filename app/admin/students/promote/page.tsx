"use client";

import { useEffect, useState } from "react";
import { SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { getClasses, getStudentsByClass, promoteStudents } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { ClassRoom } from "@/lib/types";

export default function PromoteStudentsPage() {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [fromClassId, setFromClassId] = useState("");
  const [toClassId, setToClassId] = useState("");
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getClasses()
      .then((data) => setClasses(data as ClassRoom[]))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!fromClassId) {
      setStudentCount(null);
      return;
    }
    getStudentsByClass(fromClassId).then((students) => setStudentCount(students.length));
  }, [fromClassId]);

  const handlePromote = async () => {
    if (!fromClassId || !toClassId) return;
    if (fromClassId === toClassId) {
      setResult("Source and destination classes must be different.");
      return;
    }
    const fromName = classes.find((c) => c.id === fromClassId)?.name || fromClassId;
    const toName = classes.find((c) => c.id === toClassId)?.name || toClassId;
    if (!confirm(`Move all students from ${fromName} to ${toName}?`)) return;

    setSaving(true);
    try {
      const count = await promoteStudents(fromClassId, toClassId, profile?.name || "admin");
      setResult(`${count} student(s) promoted from ${fromName} to ${toName}.`);
      setStudentCount(0);
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Promotion failed.");
    } finally {
      setSaving(false);
    }
  };

  const classOptions = [
    { label: "Select a class", value: "" },
    ...classes.map((c) => ({ label: c.name, value: c.id })),
  ];

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">Promote Students</h1>
      <p className="text-sm text-gray-500">
        Move every student in one class up to the next class at the end of a session.
      </p>

      <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-2">
        <SelectInput
          label="From Class"
          value={fromClassId}
          onChange={(e) => setFromClassId(e.target.value)}
          options={classOptions}
        />
        {studentCount !== null && (
          <p className="text-xs text-gray-500">{studentCount} student(s) currently in this class.</p>
        )}
        <SelectInput
          label="To Class"
          value={toClassId}
          onChange={(e) => setToClassId(e.target.value)}
          options={classOptions}
        />

        {result && <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">{result}</p>}

        <Button onClick={handlePromote} disabled={saving || !fromClassId || !toClassId} className="mt-2">
          {saving ? "Promoting..." : "Promote Students"}
        </Button>
      </div>
    </div>
  );
}
