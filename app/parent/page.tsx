"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InfoCard, ActionCard } from "@/components/Cards";
import { getParentByAuthUid, getChildrenForParent } from "@/services/database";
import { useAuth } from "@/lib/useAuth";
import { useSchoolSettings } from "@/lib/useSchoolSettings";

interface ParentRecord {
  id: string;
  firstName: string;
  lastName: string;
}

interface ChildRecord {
  id: string;
  firstName: string;
  lastName: string;
  className?: string;
  classId: string;
}

export default function ParentDashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const { session, term } = useSchoolSettings();
  const [parent, setParent] = useState<ParentRecord | null>(null);
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;
    getParentByAuthUid(profile.uid).then(async (data) => {
      const p = data as ParentRecord | null;
      setParent(p);
      if (!p) {
        setLoading(false);
        return;
      }
      const kids = await getChildrenForParent(p.id);
      setChildren(kids as ChildRecord[]);
      setLoading(false);
    });
  }, [profile?.uid]);

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>;

  if (!parent) {
    return (
      <p className="text-sm text-status-disabled">
        No parent record is linked to your account yet. Contact your administrator.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Welcome, {parent.firstName}
        </h1>
        <p className="text-sm text-gray-500">
          {session} &middot; {term}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          My Children
        </h2>
        {children.length === 0 ? (
          <p className="text-sm text-gray-400">
            No children linked to your account yet. Contact your administrator.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {children.map((c) => (
              <InfoCard key={c.id} title={`${c.firstName} ${c.lastName}`}>
                <p>{c.className || c.classId}</p>
              </InfoCard>
            ))}
          </div>
        )}
      </section>

      {children.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Quick Links
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <ActionCard label="My Children" icon="👪" onClick={() => router.push("/parent/children")} />
            <ActionCard label="Results" icon="📊" onClick={() => router.push("/parent/results")} />
            <ActionCard label="Fees" icon="💰" onClick={() => router.push("/parent/fees")} />
          </div>
        </section>
      )}
    </div>
  );
}