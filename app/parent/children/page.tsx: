"use client";

import { useEffect, useState } from "react";
import {
  getParentByAuthUid,
  getChildrenForParent,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";

interface ParentRecord {
  id: string;
}

interface ChildRecord {
  id: string;
  firstName: string;
  lastName: string;
  admissionNo: string;
  className?: string;
  classId: string;
  gender: string;
}

export default function ParentChildrenPage() {
  const { profile } = useAuth();

  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadChildren() {
      if (!profile?.uid) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data = await getParentByAuthUid(profile.uid);
        const parent = data as ParentRecord | null;

        if (!parent) {
          if (mounted) {
            setChildren([]);
            setLoading(false);
          }
          return;
        }

        const kids = await getChildrenForParent(parent.id);

        if (mounted) {
          setChildren(kids as ChildRecord[]);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load children:", err);

        if (mounted) {
          setError("Unable to load your children. Please try again.");
          setLoading(false);
        }
      }
    }

    loadChildren();

    return () => {
      mounted = false;
    };
  }, [profile?.uid]);

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">
            Loading your children...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-card border border-red-100 shadow-sm p-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          My Children
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          View the students linked to your parent account.
        </p>
      </div>

      {children.length === 0 ? (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-gray-500">
            No children linked to your account yet.
          </p>

          <p className="text-xs text-gray-400 mt-2">
            Contact the school administrator if you believe this is incorrect.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-white rounded-card border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">
                    {child.firstName} {child.lastName}
                  </p>

                  <p className="text-xs text-gray-500 mt-1">
                    Admission No: {child.admissionNo}
                  </p>
                </div>

                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  {child.gender}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">
                    Class
                  </p>

                  <p className="text-sm font-medium text-gray-700">
                    {child.className || child.classId || "Not assigned"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Admission Number
                  </p>

                  <p className="text-sm font-medium text-gray-700">
                    {child.admissionNo || "Not available"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}