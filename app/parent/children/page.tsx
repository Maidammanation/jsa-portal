"use client";

import { useEffect, useState } from "react";
import {
  getParentByAuthUid,
  getChildrenForParent,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";

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

  useEffect(() => {
    if (!profile?.uid) return;

    const loadChildren = async () => {
      try {
        const parent = await getParentByAuthUid(profile.uid);

        if (!parent) {
          setChildren([]);
          return;
        }

        // IMPORTANT:
        // Look up students using the authenticated parent's UID.
        const kids = await getChildrenForParent(profile.uid);

        setChildren(kids as ChildRecord[]);
      } catch (error) {
        console.error("Failed to load children:", error);
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, [profile?.uid]);

  if (loading) {
    return (
      <p className="text-sm text-gray-400">
        Loading...
      </p>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          My Children
        </h1>

        <p className="text-sm text-gray-500">
          Children linked to your parent account.
        </p>
      </div>

      {children.length === 0 ? (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm p-6">
          <p className="text-sm text-status-disabled">
            No children linked to your account yet.
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Contact your school administrator if your child should be linked
            to this account.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {children.map((child) => (
            <div
              key={child.id}
              className="bg-white rounded-card border border-gray-100 shadow-sm p-5 space-y-2"
            >
              <div>
                <p className="font-semibold text-gray-800">
                  {child.firstName} {child.lastName}
                </p>

                <p className="text-xs text-gray-400">
                  Student
                </p>
              </div>

              <div className="text-sm space-y-1">
                <p>
                  <span className="text-gray-500">
                    Admission No:
                  </span>{" "}
                  {child.admissionNo}
                </p>

                <p>
                  <span className="text-gray-500">
                    Class:
                  </span>{" "}
                  {child.className || child.classId}
                </p>

                <p>
                  <span className="text-gray-500">
                    Gender:
                  </span>{" "}
                  {child.gender}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}