"use client";

import { useEffect, useMemo, useState } from "react";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import {
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from "@/services/database";
import { useAuth } from "@/lib/useAuth";

interface Announcement {
  id: string;
  title: string;
  body: string;
  postedBy: string;
  createdAt?: unknown;
}

function formatDate(value: unknown): string {
  if (!value) {
    return "";
  }

  try {
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (
        value as {
          toDate?: () => Date;
        }
      ).toDate === "function"
    ) {
      return (
        value as {
          toDate: () => Date;
        }
      )
        .toDate()
        .toLocaleString("en-NG", {
          dateStyle: "medium",
          timeStyle: "short",
        });
    }

    if (typeof value === "string") {
      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleString("en-NG", {
          dateStyle: "medium",
          timeStyle: "short",
        });
      }
    }

    if (value instanceof Date) {
      return value.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
  } catch {
    return "";
  }

  return "";
}

export default function AnnouncementsPage() {
  const { profile } = useAuth();

  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAnnouncements = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getAnnouncements(50);

      setAnnouncements(
        data as Announcement[]
      );
    } catch {
      setAnnouncements([]);
      setError(
        "Could not load announcements. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  const filteredAnnouncements = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return announcements;
    }

    return announcements.filter(
      (announcement) =>
        announcement.title
          .toLowerCase()
          .includes(value) ||
        announcement.body
          .toLowerCase()
          .includes(value) ||
        announcement.postedBy
          .toLowerCase()
          .includes(value)
    );
  }, [announcements, search]);

  const handlePost = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle) {
      setError(
        "Please enter an announcement title."
      );
      return;
    }

    if (!cleanBody) {
      setError(
        "Please enter the announcement message."
      );
      return;
    }

    if (cleanTitle.length > 120) {
      setError(
        "The title cannot be longer than 120 characters."
      );
      return;
    }

    if (cleanBody.length > 2000) {
      setError(
        "The message cannot be longer than 2,000 characters."
      );
      return;
    }

    setSaving(true);

    try {
      const actor =
        profile?.name ||
        profile?.email ||
        "Admin";

      await createAnnouncement(
        cleanTitle,
        cleanBody,
        actor
      );

      setTitle("");
      setBody("");

      setMessage(
        "Announcement posted successfully."
      );

      await loadAnnouncements();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not post the announcement."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    id: string
  ) => {
    const announcement =
      announcements.find(
        (item) => item.id === id
      );

    if (!announcement) {
      return;
    }

    const confirmed = window.confirm(
      `Remove "${announcement.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);
    setMessage("");
    setError("");

    try {
      await deleteAnnouncement(id);

      setMessage(
        "Announcement removed successfully."
      );

      await loadAnnouncements();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove the announcement."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const clearForm = () => {
    setTitle("");
    setBody("");
    setMessage("");
    setError("");
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            Announcements
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Publish important notices and updates
            for the Jidda Standard Academy community.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-gray-100 bg-white px-4 py-2 shadow-sm">
            <p className="text-xs text-gray-400">
              Total
            </p>

            <p className="text-lg font-semibold text-gray-800">
              {announcements.length}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMessage("");
              setError("");
              void loadAnnouncements();
            }}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="rounded-lg border border-status-active/20 bg-status-active/5 px-4 py-3">
          <p className="text-sm text-status-active">
            {message}
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-status-disabled/20 bg-status-disabled/5 px-4 py-3">
          <p className="text-sm text-status-disabled">
            {error}
          </p>
        </div>
      )}

      {/* Create announcement */}
      <section className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">
            Create Announcement
          </h2>

          <p className="text-xs text-gray-400 mt-1">
            Share an important message with the
            school community.
          </p>
        </div>

        <form
          onSubmit={handlePost}
          className="p-5 space-y-4"
        >
          <TextInput
            label="Announcement Title"
            value={title}
            maxLength={120}
            placeholder="e.g. School Resumption Notice"
            onChange={(event) => {
              setTitle(event.target.value);
              setMessage("");
              setError("");
            }}
            required
          />

          <div>
            <label
              htmlFor="announcement-message"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Message
            </label>

            <textarea
              id="announcement-message"
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
                setMessage("");
                setError("");
              }}
              maxLength={2000}
              rows={6}
              required
              placeholder="Write the announcement here..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand resize-y"
            />

            <div className="flex justify-end mt-1">
              <span
                className={`text-xs ${
                  body.length > 1900
                    ? "text-status-disabled"
                    : "text-gray-400"
                }`}
              >
                {body.length}/2000
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div>
              <p className="text-xs text-gray-400">
                Posting as
              </p>

              <p className="text-sm font-medium text-gray-700 mt-0.5">
                {profile?.name ||
                  profile?.email ||
                  "Administrator"}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={clearForm}
                disabled={
                  saving ||
                  (!title && !body)
                }
              >
                Clear
              </Button>

              <Button
                type="submit"
                disabled={
                  saving ||
                  !title.trim() ||
                  !body.trim()
                }
              >
                {saving
                  ? "Posting..."
                  : "Post Announcement"}
              </Button>
            </div>
          </div>
        </form>
      </section>

      {/* Announcement list */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Posted Announcements
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Recent school notices and updates.
            </p>
          </div>

          {announcements.length > 0 && (
            <div className="w-full sm:w-72">
              <TextInput
                label="Search"
                placeholder="Search announcements..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center">
              ...
            </div>

            <p className="text-sm text-gray-500 mt-3">
              Loading announcements...
            </p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center text-lg">
              !
            </div>

            <h3 className="text-sm font-semibold text-gray-700 mt-4">
              No announcements yet
            </h3>

            <p className="text-xs text-gray-400 mt-1">
              Your published announcements will
              appear here.
            </p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm p-8 text-center">
            <p className="text-sm font-medium text-gray-700">
              No matching announcements
            </p>

            <p className="text-xs text-gray-400 mt-1">
              Try a different search term.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map(
              (announcement, index) => {
                const postedDate =
                  formatDate(
                    announcement.createdAt
                  );

                return (
                  <article
                    key={announcement.id}
                    className="bg-white rounded-card border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand/10 text-brand-dark flex items-center justify-center font-semibold text-sm shrink-0">
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                              <h3 className="text-base font-semibold text-gray-800 break-words">
                                {announcement.title}
                              </h3>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                <span className="text-xs text-gray-400">
                                  Posted by{" "}
                                  {announcement.postedBy ||
                                    "Administrator"}
                                </span>

                                {postedDate && (
                                  <>
                                    <span className="hidden sm:inline text-gray-200">
                                      •
                                    </span>

                                    <span className="text-xs text-gray-400">
                                      {postedDate}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDelete(
                                  announcement.id
                                )
                              }
                              disabled={
                                deletingId ===
                                announcement.id
                              }
                              className="text-xs font-medium text-status-disabled hover:underline disabled:opacity-50 disabled:no-underline shrink-0"
                            >
                              {deletingId ===
                              announcement.id
                                ? "Removing..."
                                : "Remove"}
                            </button>
                          </div>

                          <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-6">
                              {announcement.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}