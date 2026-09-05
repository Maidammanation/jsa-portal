"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { createLoginAccount } from "@/services/authentication";
import { generateTempPassword } from "@/lib/generatePassword";
import { getAll } from "@/services/database";
import { useAuth } from "@/lib/useAuth";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "super-admin";
  status: "active" | "suspended" | "disabled";
}

export default function TeamPage() {
  const { profile } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(
    generateTempPassword()
  );

  // Edit form
  const [editing, setEditing] = useState<TeamMember | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<
    "admin" | "super-admin"
  >("super-admin");
  const [editStatus, setEditStatus] = useState<
    "active" | "suspended" | "disabled"
  >("active");
  const [editPassword, setEditPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(
    null
  );

  const [error, setError] = useState("");

  const [success, setSuccess] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      const data = await getAll("users");

      const all = data as TeamMember[];

      setMembers(
        all.filter(
          (u) =>
            u.role === "admin" ||
            u.role === "super-admin"
        )
      );
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setError("");
    setSuccess(null);

    if (!name.trim() || !email.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    setSaving(true);

    try {
      await createLoginAccount({
        email: email.trim(),
        password,
        name: name.trim(),
        role: "super-admin",
      });

      setSuccess({
        email: email.trim(),
        password,
      });

      setName("");
      setEmail("");
      setPassword(generateTempPassword());

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create account."
      );
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (member: TeamMember) => {
    setError("");
    setSuccess(null);

    setEditing(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditRole(member.role);
    setEditStatus(member.status || "active");
    setEditPassword("");
  };

  const closeEdit = () => {
    if (saving) return;

    setEditing(null);
    setEditName("");
    setEditEmail("");
    setEditPassword("");
  };

  const handleUpdate = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!editing) return;

    setError("");
    setSuccess(null);

    if (!editName.trim() || !editEmail.trim()) {
      setError("Name and email are required.");
      return;
    }

    if (
      editPassword.trim() &&
      editPassword.trim().length < 8
    ) {
      setError(
        "New password must be at least 8 characters."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/manage-account",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid: editing.id,
            name: editName.trim(),
            email: editEmail.trim(),
            role: editRole,
            status: editStatus,
            password: editPassword.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not update account."
        );
      }

      setEditing(null);
      setEditPassword("");

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update account."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    member: TeamMember
  ) => {
    if (member.id === profile?.uid) {
      setError("You cannot delete your own account.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${member.name}'s account?\n\nThis will remove their login access and team profile. This action cannot be undone.`
    );

    if (!confirmed) return;

    setError("");
    setSuccess(null);
    setDeleting(member.id);

    try {
      const response = await fetch(
        "/api/admin/manage-account",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid: member.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not delete account."
        );
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not delete account."
      );
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Team
        </h1>

        <p className="text-sm text-gray-500">
          Manage Directors and Administrators who have
          access to the JSA Portal.
        </p>
      </div>

      {error && (
        <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {success && (
        <div className="bg-status-active/10 rounded-card p-4 space-y-1">
          <p className="text-sm text-status-active font-medium">
            Director account created.
          </p>

          <p className="text-sm font-mono bg-white rounded px-3 py-2 border border-gray-200">
            Email: {success.email}
            <br />
            Temporary password: {success.password}
          </p>
        </div>
      )}

      {/* ADD DIRECTOR */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Add a Director
        </h2>

        <form
          onSubmit={handleCreate}
          className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-3"
        >
          <TextInput
            label="Full Name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            required
          />

          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            required
          />

          <TextInput
            label="Temporary Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            required
          />

          <button
            type="button"
            onClick={() =>
              setPassword(generateTempPassword())
            }
            className="text-xs text-brand hover:underline"
          >
            Generate new password
          </button>

          <Button
            type="submit"
            disabled={saving}
            className="mt-2"
          >
            {saving
              ? "Creating..."
              : "Create Director Account"}
          </Button>
        </form>
      </section>

      {/* CURRENT TEAM */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Current Team
        </h2>

        {loading ? (
          <p className="text-sm text-gray-400">
            Loading...
          </p>
        ) : (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm divide-y divide-gray-100">
            {members.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">
                No team members found.
              </p>
            ) : (
              members.map((m) => (
                <div
                  key={m.id}
                  className="px-4 py-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {m.name}{" "}
                        {m.id === profile?.uid && (
                          <span className="text-gray-400 font-normal">
                            (you)
                          </span>
                        )}
                      </p>

                      <p className="text-xs text-gray-500 mt-1 break-all">
                        {m.email}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                          {m.role === "super-admin"
                            ? "Director"
                            : "Admin"}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
                            m.status === "active"
                              ? "bg-green-50 text-green-700"
                              : m.status ===
                                "suspended"
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {m.status || "active"}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => openEdit(m)}
                      >
                        Edit
                      </Button>

                      <button
                        type="button"
                        disabled={
                          deleting === m.id ||
                          m.id === profile?.uid
                        }
                        onClick={() =>
                          handleDelete(m)
                        }
                        className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deleting === m.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-card shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">
                Edit Team Member
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Update this user's account information.
              </p>
            </div>

            <form
              onSubmit={handleUpdate}
              className="p-6 space-y-4"
            >
              <TextInput
                label="Full Name"
                value={editName}
                onChange={(e) =>
                  setEditName(e.target.value)
                }
                required
              />

              <TextInput
                label="Email"
                type="email"
                value={editEmail}
                onChange={(e) =>
                  setEditEmail(e.target.value)
                }
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>

                <select
                  value={editRole}
                  onChange={(e) =>
                    setEditRole(
                      e.target.value as
                        | "admin"
                        | "super-admin"
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  <option value="super-admin">
                    Director
                  </option>

                  <option value="admin">
                    Administrator
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Status
                </label>

                <select
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(
                      e.target.value as
                        | "active"
                        | "suspended"
                        | "disabled"
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="suspended">
                    Suspended
                  </option>

                  <option value="disabled">
                    Disabled
                  </option>
                </select>
              </div>

              <TextInput
                label="New Password (optional)"
                type="password"
                value={editPassword}
                onChange={(e) =>
                  setEditPassword(e.target.value)
                }
                placeholder="Leave empty to keep current password"
              />

              <p className="text-xs text-gray-500">
                If you enter a new password, the team
                member will be required to change it when
                they next sign in.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeEdit}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}