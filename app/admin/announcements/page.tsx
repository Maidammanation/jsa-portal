"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from "@/services/database";
import { useAuth } from "@/lib/useAuth";

interface Announcement {
  id: string;
  title: string;
  body: string;
  postedBy: string;
}

export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getAnnouncements()
      .then((data) => setAnnouncements(data as Announcement[]))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await createAnnouncement(title.trim(), body.trim(), profile?.name || profile?.email || "admin");
      setTitle("");
      setBody("");
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this announcement?")) return;
    await deleteAnnouncement(id);
    load();
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Announcements</h1>

      <form onSubmit={handlePost} className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-3">
        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Posting..." : "Post Announcement"}
        </Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Posted Announcements</h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-gray-400">No announcements posted yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="bg-white rounded-card border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-gray-800">{a.title}</h3>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-xs text-status-disabled hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.body}</p>
                <p className="text-xs text-gray-400 mt-2">Posted by {a.postedBy}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}