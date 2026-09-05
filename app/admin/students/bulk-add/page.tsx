"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SelectInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getClasses,
  getStudentsByClass,
  createStudent,
  getClassCode,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { ClassRoom } from "@/lib/types";

type Gender = "male" | "female" | "unknown";

interface PreviewStudent {
  id: number;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  confidence: "high" | "medium" | "low";
}

const MALE_NAMES = new Set([
  "abdul",
  "abdullah",
  "abdullahi",
  "abubakar",
  "adamu",
  "ahmad",
  "ahmed",
  "ali",
  "aliyu",
  "amadu",
  "aminu",
  "anas",
  "bashir",
  "bello",
  "bilal",
  "danladi",
  "danjuma",
  "farouk",
  "garba",
  "haruna",
  "hassan",
  "husaini",
  "hussain",
  "ibrahim",
  "idris",
  "isa",
  "ismail",
  "jibril",
  "kabiru",
  "khalid",
  "lawal",
  "mohammed",
  "muhammad",
  "muhammed",
  "mustapha",
  "mustafa",
  "nasir",
  "nura",
  "nurudeen",
  "osman",
  "othman",
  "rabiu",
  "salihu",
  "sani",
  "shehu",
  "suleiman",
  "umar",
  "usman",
  "yusuf",
  "zakari",
  "zakariya",
  "zayyad",
]);

const FEMALE_NAMES = new Set([
  "aisha",
  "aisha",
  "aysha",
  "amina",
  "aminah",
  "amina",
  "asma",
  "asma'u",
  "asmaa",
  "balkisu",
  "bilkisu",
  "binta",
  "fatima",
  "fatimah",
  "fati",
  "hafsa",
  "hafsat",
  "halima",
  "hauwa",
  "hauwa'u",
  "hawwa",
  "jamila",
  "jamilah",
  "kadija",
  "khadija",
  "khadijah",
  "khadijat",
  "laraba",
  "ladi",
  "maryam",
  "maryama",
  "mariya",
  "mariam",
  "mubarakah",
  "nadia",
  "nafisa",
  "nana",
  "ramatu",
  "ramlat",
  "rahma",
  "rahmat",
  "rashida",
  "ruqayya",
  "ruqayyah",
  "sadiya",
  "safiya",
  "safiyyah",
  "salma",
  "saratu",
  "zainab",
  "zainaba",
  "zara",
  "zahra",
  "zahrat",
  "zulaiha",
  "zuleikha",
]);

/**
 * Normalizes a name so that common spelling/capitalization differences
 * do not affect gender detection.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.'’`]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Detects gender using the student's first name and, when necessary,
 * other names in the full name.
 *
 * We intentionally return "unknown" when the name is not confidently
 * recognized rather than making a potentially incorrect guess.
 */
function detectGender(fullName: string): {
  gender: Gender;
  confidence: "high" | "medium" | "low";
} {
  const normalized = normalizeName(fullName);
  const parts = normalized.split(" ").filter(Boolean);

  if (parts.length === 0) {
    return {
      gender: "unknown",
      confidence: "low",
    };
  }

  // First name gets the strongest priority.
  const firstName = parts[0];

  if (MALE_NAMES.has(firstName)) {
    return {
      gender: "male",
      confidence: "high",
    };
  }

  if (FEMALE_NAMES.has(firstName)) {
    return {
      gender: "female",
      confidence: "high",
    };
  }

  // If the first name is not recognized, inspect the remaining names.
  const remainingNames = parts.slice(1);

  const femaleMatch = remainingNames.some((name) =>
    FEMALE_NAMES.has(name)
  );

  const maleMatch = remainingNames.some((name) => MALE_NAMES.has(name));

  // Only use a secondary-name match when it is unambiguous.
  if (femaleMatch && !maleMatch) {
    return {
      gender: "female",
      confidence: "medium",
    };
  }

  if (maleMatch && !femaleMatch) {
    return {
      gender: "male",
      confidence: "medium",
    };
  }

  return {
    gender: "unknown",
    confidence: "low",
  };
}

// Splits "MUHAMMAD YAHAYA ABDULLAHI" into
// firstName="MUHAMMAD", lastName="YAHAYA ABDULLAHI".
function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);

  const firstName = parts[0] || fullName;
  const lastName = parts.slice(1).join(" ") || "—";

  return {
    firstName,
    lastName,
  };
}

export default function BulkAddStudentsPage() {
  const router = useRouter();
  const { profile } = useAuth();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [classId, setClassId] = useState("");
  const [namesText, setNamesText] = useState("");

  const [preview, setPreview] = useState<PreviewStudent[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [result, setResult] = useState<{
    added: number;
    className: string;
  } | null>(null);

  useEffect(() => {
    getClasses()
      .then((data) => setClasses(data as ClassRoom[]))
      .catch(() => setClasses([]));
  }, []);

  const namesCount = useMemo(() => {
    return namesText
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean).length;
  }, [namesText]);

  const unknownCount = useMemo(() => {
    return preview.filter((student) => student.gender === "unknown").length;
  }, [preview]);

  const maleCount = useMemo(() => {
    return preview.filter((student) => student.gender === "male").length;
  }, [preview]);

  const femaleCount = useMemo(() => {
    return preview.filter((student) => student.gender === "female").length;
  }, [preview]);

  /**
   * Creates the student preview.
   */
  const handleGeneratePreview = () => {
    setError("");
    setResult(null);

    const selectedClass = classes.find((c) => c.id === classId);

    if (!selectedClass) {
      setError("Please select a class.");
      return;
    }

    const names = namesText
      .split("\n")
      .map((name) => name.trim())
      .filter(Boolean);

    if (names.length === 0) {
      setError("Please paste at least one student name.");
      return;
    }

    const generatedPreview: PreviewStudent[] = names.map(
      (fullName, index) => {
        const { firstName, lastName } = splitName(fullName);
        const detected = detectGender(fullName);

        return {
          id: index,
          fullName,
          firstName,
          lastName,
          gender: detected.gender,
          confidence: detected.confidence,
        };
      }
    );

    setPreview(generatedPreview);
    setShowPreview(true);
  };

  /**
   * Allows the administrator to manually correct a student's gender.
   */
  const updateGender = (id: number, gender: Gender) => {
    setPreview((current) =>
      current.map((student) =>
        student.id === id
          ? {
              ...student,
              gender,
              confidence: "high",
            }
          : student
      )
    );
  };

  /**
   * Adds all students after the preview has been checked.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setResult(null);

    const selectedClass = classes.find((c) => c.id === classId);

    if (!selectedClass) {
      setError("Please select a class.");
      return;
    }

    if (preview.length === 0) {
      setError("Please generate a student preview first.");
      return;
    }

    const studentsNeedingReview = preview.filter(
      (student) => student.gender === "unknown"
    );

    if (studentsNeedingReview.length > 0) {
      setError(
        `Please select Male or Female for all ${studentsNeedingReview.length} student(s) marked "Needs Review" before adding them.`
      );
      return;
    }

    setSaving(true);

    try {
      /*
       * Compute the starting admission sequence once.
       * This prevents repeatedly querying Firestore and avoids duplicate
       * admission numbers within the same batch.
       */
      const existing = await getStudentsByClass(classId);

      const code = getClassCode(selectedClass.name);

      let seq = existing.length + 1;

      for (const student of preview) {
        const admissionNo = `JSA/${code}/${String(seq).padStart(4, "0")}`;

        await createStudent({
          admissionNo,
          firstName: student.firstName,
          lastName: student.lastName,
          classId,
          className: selectedClass.name,
          gender: student.gender,
          status: "active",
          createdBy:
            profile?.name ||
            profile?.email ||
            "admin",
        });

        seq++;
      }

      setResult({
        added: preview.length,
        className: selectedClass.name,
      });

      setNamesText("");
      setPreview([]);
      setShowPreview(false);

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not add students."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Bulk Add Students
        </h1>

        <p className="text-sm text-gray-500">
          Paste one full name per line. The system will automatically detect
          gender from the student's name and show you a preview before adding
          them.
        </p>
      </div>

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <p className="text-sm text-status-active bg-status-active/10 rounded-lg px-3 py-2">
          Added {result.added} student(s) to {result.className}.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-5"
      >
        <SelectInput
          label="Class"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setShowPreview(false);
            setPreview([]);
          }}
          options={[
            {
              label: "Select a class",
              value: "",
            },
            ...classes.map((c) => ({
              label: c.name,
              value: c.id,
            })),
          ]}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Student Names
          </label>

          <textarea
            value={namesText}
            onChange={(e) => {
              setNamesText(e.target.value);
              setShowPreview(false);
              setPreview([]);
              setResult(null);
              setError("");
            }}
            rows={12}
            placeholder={
              "ALIYU MURTALA\nALIYU IBRAHIM\nFATIMA SA'IDU\nAISHA ABDULLAHI\nMUHAMMAD SANI"
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />

          <p className="text-xs text-gray-500 mt-1">
            {namesCount} name(s) ready for preview
          </p>
        </div>

        {!showPreview && (
          <Button
            type="button"
            onClick={handleGeneratePreview}
            disabled={!classId || namesCount === 0}
          >
            Detect Gender & Preview
          </Button>
        )}

        {showPreview && preview.length > 0 && (
          <div className="space-y-4">
            <div className="border-t border-gray-100 pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Student Preview
                  </h2>

                  <p className="text-sm text-gray-500">
                    Review the detected gender before importing.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                    Male: {maleCount}
                  </span>

                  <span className="rounded-full bg-pink-50 px-3 py-1 text-pink-700">
                    Female: {femaleCount}
                  </span>

                  {unknownCount > 0 && (
                    <span className="rounded-full bg-yellow-50 px-3 py-1 text-yellow-700">
                      Needs Review: {unknownCount}
                    </span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        #
                      </th>

                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Student Name
                      </th>

                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Detected Gender
                      </th>

                      <th className="text-left px-4 py-3 font-medium text-gray-600">
                        Confidence
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {preview.map((student, index) => (
                      <tr key={student.id}>
                        <td className="px-4 py-3 text-gray-500">
                          {index + 1}
                        </td>

                        <td className="px-4 py-3 font-medium text-gray-800">
                          {student.fullName}
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={student.gender}
                            onChange={(e) =>
                              updateGender(
                                student.id,
                                e.target.value as Gender
                              )
                            }
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                          >
                            <option value="unknown">
                              Needs Review
                            </option>

                            <option value="male">
                              Male
                            </option>

                            <option value="female">
                              Female
                            </option>
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          {student.gender === "unknown" ? (
                            <span className="inline-flex rounded-full bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700">
                              Review required
                            </span>
                          ) : student.confidence === "high" ? (
                            <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                              High
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                              Medium
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-xs text-gray-600">
                  <strong>Important:</strong> Gender detection is based on
                  recognized names and is not guaranteed to be correct.
                  Please review the preview before importing.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Adding Students..."
                  : `Add ${preview.length} Student${
                      preview.length === 1 ? "" : "s"
                    }`}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowPreview(false);
                  setPreview([]);
                }}
                disabled={saving}
              >
                Edit Names
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  router.push("/admin/students")
                }
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}