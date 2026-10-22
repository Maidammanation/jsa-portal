
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type AssignedClass = {
  id: string;
  name: string;
};

export default function AddStudentPage() {
  const [classRoom, setClassRoom] = useState<AssignedClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    name: string;
    admissionNo: string;
  } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [attendsArabic, setAttendsArabic] = useState(false);

  useEffect(() => {
    async function loadClass() {
      try {
        const response = await fetch("/api/teacher/attendance-permissions", {
          cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok || !data.isFormMaster || !data.formMasterClassId) {
          throw new Error("Your Form Master class assignment could not be verified.");
        }

        const classesResponse = await fetch("/api/teacher/attendance-permissions", {
          cache: "no-store"
        });

        if (!classesResponse.ok) {
          throw new Error("Could not load your assigned class.");
        }

        // The secure registration API verifies the class again before saving.
        // This page uses the assigned class ID as the initial class display.
        setClassRoom({
          id: data.formMasterClassId,
          name: data.formMasterClassName || "Your assigned class"
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load your class.");
      } finally {
        setLoading(false);
      }
    }

    void loadClass();
  }, []);

  async function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError("Enter the student's first name and last name.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/teacher/create-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          gender,
          dateOfBirth,
          attendsArabic
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not register the student.");
      }

      setSuccess({
        name: `${data.student.firstName} ${data.student.lastName}`,
        admissionNo: data.student.admissionNo
      });

      setFirstName("");
      setLastName("");
      setGender("male");
      setDateOfBirth("");
      setAttendsArabic(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not register the student.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="p-6">Checking your Form Master assignment...</main>;
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Register Student</h1>
        <p className="mt-1 text-sm text-gray-600">
          Students registered here will be placed in your assigned class.
        </p>
        <Link href="/teacher" className="mt-3 inline-block text-sm font-medium text-brand underline">
          Back to Teacher Dashboard
        </Link>
      </div>

      {classRoom && (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Form Master class</p>
          <p className="mt-1 font-semibold text-gray-900">{classRoom.name}</p>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <section className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="font-semibold text-green-800">Student registered successfully!</p>
          <p className="mt-1 text-green-800">{success.name}</p>
          <p className="text-sm text-green-800">
            Admission number: <strong>{success.admissionNo}</strong>
          </p>
          <Link href="/teacher/results" className="mt-3 inline-block font-semibold text-green-900 underline">
            Go to Results
          </Link>
        </section>
      )}

      <form onSubmit={submitStudent} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium">First name *</label>
          <input id="firstName" required value={firstName} onChange={e => setFirstName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3" />
        </div>

        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium">Last name *</label>
          <input id="lastName" required value={lastName} onChange={e => setLastName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3" />
        </div>

        <div>
          <label htmlFor="gender" className="mb-1 block text-sm font-medium">Gender *</label>
          <select id="gender" value={gender} onChange={e => setGender(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3">
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label htmlFor="dateOfBirth" className="mb-1 block text-sm font-medium">Date of birth</label>
          <input id="dateOfBirth" type="date" value={dateOfBirth}
            onChange={e => setDateOfBirth(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3" />
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
          <input type="checkbox" checked={attendsArabic}
            onChange={e => setAttendsArabic(e.target.checked)} className="mt-1" />
          <span className="text-sm">
            <strong className="block">Student attends Arabic Section</strong>
            <span className="text-gray-500">
              Select if the student should receive Arabic subjects and the Arabic report-card section.
            </span>
          </span>
        </label>

        <button type="submit" disabled={saving || !classRoom}
          className="rounded-lg bg-brand px-5 py-3 font-semibold text-white disabled:opacity-50">
          {saving ? "Registering..." : "Register Student"}
        </button>

        <p className="text-sm text-gray-600">
          Already registered your students? <Link href="/teacher/results" className="font-semibold underline">Enter results here</Link>.
        </p>
      </form>
    </main>
  );
}
