"use client";

import { useEffect, useState } from "react";
import { getRecentActivity } from "@/services/database";

interface ActivityEntry {
  id: string;
  action: string;
  actor: string;
  details?: string;
}

export default function ActivityLogPage() {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentActivity(100)
      .then((items) => setActivity(items as ActivityEntry[]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Activity Log</h1>
        <p className="text-sm text-gray-500">
          A full audit trail of actions taken across the portal — students added, results
          uploaded, attendance submitted, fees recorded, and more.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="bg-white rounded-card border border-gray-100 shadow-sm divide-y divide-gray-100">
          {activity.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No activity recorded yet.</p>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-800 font-medium">{item.action}</span>
                  <span className="text-gray-400">{item.actor}</span>
                </div>
                {item.details && <p className="text-gray-500 mt-0.5">{item.details}</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}