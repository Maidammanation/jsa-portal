"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { getClasses, getStudentsByClass, createStudent, getClassCode } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { ClassRoom } from "@/lib/types";

export default function BulkAddStudentsPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [classId, setClassId] = useState("");
  const [defaultGender, setDefaultGender] = useState("male");
  const [namesText, setNamesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ added: number; className: string } | null>(null);

  useEffect(() => {
    getClasses()
      .then((data) => setClasses(data as ClassRoom[]))
      .catch(() => setClasses([]));
  }, []);

  // Splits "MUHAMMAD YAHAYA ABDULLAHI" into firstName="MUHAMMAD", lastName="YAHAYA ABDULLAHI".
  const splitName = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] || fullName;
    const lastName = parts.slice(1).join(" ") || "—";
    return { firstName, lastName };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const selectedClass = classes.find((c) => c.id === classId);
    if (!selectedClass) {
      setError("Please select a class.");
      return;
    }

    const names = namesText
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    if (names.length === 0) {
      setError("Please paste at least one name.");
      return;
    }

    setSaving(true);
    try {
      // Compute the starting sequence number once, then increment locally for
      // each student — calling generateAdmissionNumber() in a loop would
      // re-query Firestore every time and risk duplicate numbers.
      const existing = await getStudentsByClass(classId);
      const code = getClassCode(selectedClass.name);
      let seq = existing.length + 1;

      for (const fullName of names) {
        const { firstName, lastName } = splitName(fullName);
        const admissionNo = `JSA/${code}/${String(seq).padStart(4, "0")}`;
        await createStudent({
          admissionNo,
          firstName,
          lastName,
          classId,
          className: selectedClass.name,
          gender: defaultGender,
          status: "active",
          createdBy: profile?.name || profile?.email || "admin",
        });
        seq++;
      }

      setResult({ added: names.length, className: selectedClass.name });
      setNamesText("");
      router.refresh();
    } catch (err) {
setError(err instanceof Error ? err.message : "Could not add students.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Bulk Add Students</h1>
        <p className="text-sm text-gray-500">
          Paste one full name per line for a single class. Admission numbers are generated
          automatically. You can edit each student afterward to fix gender, add a date of
          birth, or link a parent.
        </p>
      </div>

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">{error}</p>
      )}
      {result && (
        <p className="text-sm text-status-active bg-status-active/10 rounded-lg px-3 py-2">
          Added {result.added} student(s) to {result.className}.
        </p>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <SelectInput
            label="Class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={[
              { label: "Select a class", value: "" },
              ...classes.map((c) => ({ label: c.name, value: c.id })),
            ]}
            required
          />
          <SelectInput
            label="Default Gender for this batch"
            value={defaultGender}
            onChange={(e) => setDefaultGender(e.target.value)}
            options={[
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Names (one per line)
          </label>
          <textarea
            value={namesText}
            onChange={(e) => setNamesText(e.target.value)}
            rows={12}
            placeholder={"ALIYU MURTALA\nALIYU IBRAHIM\nFATIMA SA'IDU\n..."}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
          <p className="text-xs text-gray-500 mt-1">
            {namesText.split("\n").filter((n) => n.trim()).length} name(s) ready to add
          </p>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Adding..." : "Add All Students"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/students")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}