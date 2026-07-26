"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InfoCard, ActionCard } from "@/components/Cards";
import { getTeacherByAuthUid, getClasses, getSubjects } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";
import type { ClassRoom, Subject } from "@/lib/types";

interface TeacherRecord {
  id: string;
  firstName: string;
  lastName: string;
  classIds?: string[];
  subjectIds?: string[];
  formClassId?: string | null;
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();
  const [teacher, setTeacher] = useState<TeacherRecord | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    Promise.all([getTeacherByAuthUid(profile.uid), getClasses(), getSubjects()]).then(
      ([teacherRecord, classList, subjectList]) => {
        setTeacher(teacherRecord as TeacherRecord | null);
        setClasses(classList as ClassRoom[]);
        setSubjects(subjectList as Subject[]);
        setLoading(false);
      }
    );
  }, [profile?.uid]);

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;

  if (!teacher) {
    return (
      <p className="text-sm text-status-disabled">
        No teacher record is linked to your account yet. Contact your administrator.
      </p>
    );
  }

  const myClasses = classes.filter((c) => teacher.classIds?.includes(c.id));
  const mySubjects = subjects.filter((s) => teacher.subjectIds?.includes(s.id));
  const formClass = classes.find((c) => c.id === teacher.formClassId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Welcome, {teacher.firstName}
        </h1>
        <p className="text-sm text-gray-500">
          {session} &middot; {term}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InfoCard title="My Classes">
          {myClasses.length === 0 ? (
            <p className="text-gray-400">No classes assigned yet.</p>
          ) : (
            myClasses.map((c) => <p key={c.id}>{c.name}</p>)
          )}
        </InfoCard>
        <InfoCard title="My Subjects">
          {mySubjects.length === 0 ? (
            <p className="text-gray-400">No subjects assigned yet.</p>
          ) : (
            mySubjects.map((s) => <p key={s.id}>{s.name}</p>)
          )}
        </InfoCard>
      </div>

      {formClass && (
        <p className="text-sm text-brand-dark bg-brand/5 rounded-lg px-3 py-2">
          You are the Form Master of <strong>{formClass.name}</strong> — you can take attendance for this class.
        </p>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          ⚡ Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {formClass && (
            <ActionCard label="Take Attendance" icon="📝" onClick={() => router.push("/teacher/attendance")} />
          )}
          <ActionCard label="Upload Results" icon="📄" onClick={() => router.push("/teacher/results")} />
          <ActionCard label="My Classes" icon="🏫" onClick={() => router.push("/teacher/classes")} />
        </div>
      </section>
    </div>
  );
}