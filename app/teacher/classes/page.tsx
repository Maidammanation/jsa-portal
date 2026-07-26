"use client";

import { useEffect, useState } from "react";
import { SelectInput } from "@/components/Forms";
import { DataTable, type Column } from "@/components/Tables";
import { getTeacherByAuthUid, getClasses, getStudentsByClass } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import type { ClassRoom, Student } from "@/lib/types";

interface TeacherRecord {
  id: string;
  classIds?: string[];
  formClassId?: string | null;
}

export default function TeacherClassesPage() {
  const { profile } = useAuth();
  const [teacher, setTeacher] = useState<TeacherRecord | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    Promise.all([getTeacherByAuthUid(profile.uid), getClasses()]).then(([teacherRecord, classList]) => {
      setTeacher(teacherRecord as TeacherRecord | null);
      setClasses(classList as ClassRoom[]);
      setLoading(false);
    });
  }, [profile?.uid]);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    getStudentsByClass(classId).then((d) => setStudents(d as Student[]));
  }, [classId]);

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;

  const myClasses = classes.filter((c) => teacher?.classIds?.includes(c.id));

  const columns: Column<Student>[] = [
    { header: "Admission No.", accessor: "admissionNo" },
    { header: "Name", accessor: "firstName", render: (s) => `${s.firstName} ${s.lastName}` },
    { header: "Gender", accessor: "gender" },
  ];

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">My Classes</h1>

      {myClasses.length === 0 ? (
        <p className="text-sm text-status-disabled">
          No classes assigned yet. Contact your administrator.
        </p>
      ) : (
        <>
          <div className="max-w-xs">
            <SelectInput
              label="Class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={[
                { label: "Select a class", value: "" },
                ...myClasses.map((c) => ({ label: c.name, value: c.id })),
              ]}
            />
          </div>

          {classId && (
            <DataTable columns={columns} data={students} emptyMessage="No students found in this class." />
          )}
        </>
      )}
    </div>
  );
}