"use client";

import { useEffect, useState } from "react";
import { TextInput } from "@/components/Forms";
import { Button } from "@/components/Buttons";
import { createLoginAccount } from "@/services/authentication";
import { generateTempPassword } from "@/lib/generatePassword";
import { getAll } from "@/services/database";
import { useAuth } from "@/lib/useAuth";

type TeamRole = "admin" | "super-admin";
type TeamStatus = "active" | "suspended" | "disabled";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
}

interface SuccessCredentials {
  email: string;
  password: string;
  role: TeamRole;
}

const roleLabel = (role: TeamRole) =>
  role === "super-admin" ? "Super Admin" : "Administrator";

const statusLabel = (status: TeamStatus) => {
  if (status === "active") return "Active";
  if (status === "suspended") return "Suspended";
  return "Disabled";
};

export default function TeamPage() {
  const { profile } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [createRole, setCreateRole] =
    useState<TeamRole>("admin");
  const [password, setPassword] = useState(
    generateTempPassword()
  );

  // Edit form
  const [editing, setEditing] =
    useState<TeamMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] =
    useState<TeamRole>("admin");
  const [editStatus, setEditStatus] =
    useState<TeamStatus>("active");
  const [editPassword, setEditPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const [success, setSuccess] =
    useState<SuccessCredentials | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getAll("users");

      const all = data as TeamMember[];

      setMembers(
        all.filter(
          (user) =>
            user.role === "admin" ||
            user.role === "super-admin"
        )
      );
    } catch {
      setMembers([]);
      setError("Could not load team members.");
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
      setError(
        "Please enter the full name and email address."
      );
      return;
    }

    if (password.trim().length < 8) {
      setError(
        "Temporary password must be at least 8 characters."
      );
      return;
    }

    if (createRole === "super-admin") {
      const confirmed = window.confirm(
        "You are creating a Super Admin account.\n\n" +
          "Super Admin has full control of the JSA Portal, including team management and administrative access.\n\n" +
          "Only create this role for a trusted senior administrator.\n\n" +
          "Continue?"
      );

      if (!confirmed) return;
    }

    setSaving(true);

    try {
      await createLoginAccount({
        email: email.trim(),
        password: password.trim(),
        name: name.trim(),
        role: createRole,
      });

      setSuccess({
        email: email.trim(),
        password: password.trim(),
        role: createRole,
      });

      setName("");
      setEmail("");
      setCreateRole("admin");
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
    setEditRole("admin");
    setEditStatus("active");
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

    // Protect the currently signed-in Super Admin
    // from accidentally changing their own role/status.
    const isSelf = editing.id === profile?.uid;

    if (
      isSelf &&
      (editRole !== "super-admin" ||
        editStatus !== "active")
    ) {
      setError(
        "You cannot change your own Super Admin role or deactivate your own account."
      );
      return;
    }

    if (
      !isSelf &&
      editing.role === "super-admin" &&
      editRole === "admin"
    ) {
      const confirmed = window.confirm(
        "You are removing Super Admin privileges from this account.\n\nContinue?"
      );

      if (!confirmed) return;
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
            role: isSelf
              ? "super-admin"
              : editRole,
            status: isSelf
              ? "active"
              : editStatus,
            password:
              editPassword.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Could not update account."
        );
      }

      closeEdit();
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
      setError(
        "You cannot delete your own account."
      );
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${member.name}'s account?\n\n` +
        "This will remove their login access and team profile.\n\n" +
        "This action cannot be undone."
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
    <div className="max-w-5xl space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800">
          Team Management
        </h1>

        <p className="text-sm text-gray-500 mt-1">
          Manage Super Administrators and
          Administrators who have access to the JSA
          Portal.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div className="bg-status-active/10 rounded-card p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-status-active">
              {roleLabel(success.role)} account created
              successfully.
            </p>

            <p className="text-xs text-gray-600 mt-1">
              Save these temporary login credentials
              securely and provide them to the new team
              member.
            </p>
          </div>

          <div className="text-sm font-mono bg-white rounded-lg px-4 py-3 border border-gray-200">
            <div>
              Role:{" "}
              <strong>
                {roleLabel(success.role)}
              </strong>
            </div>

            <div className="mt-1 break-all">
              Email: {success.email}
            </div>

            <div className="mt-1">
              Temporary password:{" "}
              {success.password}
            </div>
          </div>
        </div>
      )}

      {/* SECURITY NOTICE */}
      <div className="rounded-card border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex gap-3">
          <div className="text-yellow-700 text-lg">
            ⚠
          </div>

          <div>
            <p className="text-sm font-semibold text-yellow-800">
              Team security
            </p>

            <p className="text-xs text-yellow-700 mt-1 leading-5">
              Super Admin accounts have the highest
              level of access. Use the Administrator
              role whenever full Super Admin privileges
              are not required.
            </p>
          </div>
        </div>
      </div>

      {/* CREATE TEAM MEMBER */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Add Team Member
        </h2>

        <form
          onSubmit={handleCreate}
          className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-4"
        >
          <TextInput
            label="Full Name"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            placeholder="Enter full name"
            required
          />

          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="Enter login email"
            required
          />

          {/* ROLE */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Role
            </label>

            <select
              value={createRole}
              onChange={(e) =>
                setCreateRole(
                  e.target.value as TeamRole
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <option value="admin">
                Administrator
              </option>

              <option value="super-admin">
                Super Admin
              </option>
            </select>

            <p className="text-xs text-gray-500 mt-1.5">
              Administrator: normal administrative
              access. Super Admin: full portal and team
              management access.
            </p>
          </div>

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
              : "Create Team Account"}
          </Button>
        </form>
      </section>

      {/* CURRENT TEAM */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Current Team
          </h2>

          <span className="text-xs text-gray-400">
            {members.length}{" "}
            {members.length === 1
              ? "member"
              : "members"}
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm px-4 py-8 text-sm text-gray-400 text-center">
            Loading team members...
          </div>
        ) : (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm divide-y divide-gray-100">
            {members.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">
                No team members found.
              </p>
            ) : (
              members.map((member) => {
                const isSelf =
                  member.id === profile?.uid;

                return (
                  <div
                    key={member.id}
                    className="px-4 py-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-gray-800">
                            {member.name}
                          </p>

                          {isSelf && (
                            <span className="inline-flex rounded-full bg-brand/10 text-brand px-2 py-0.5 text-xs font-medium">
                              You
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 mt-1 break-all">
                          {member.email}
                        </p>

                        <div className="flex flex-wrap gap-2 mt-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              member.role ===
                              "super-admin"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {roleLabel(
                              member.role
                            )}
                          </span>

                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs ${
                              member.status ===
                              "active"
                                ? "bg-green-50 text-green-700"
                                : member.status ===
                                  "suspended"
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {statusLabel(
                              member.status ||
                                "active"
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            openEdit(member)
                          }
                        >
                          Edit
                        </Button>

                        <button
                          type="button"
                          disabled={
                            deleting === member.id ||
                            isSelf
                          }
                          onClick={() =>
                            handleDelete(member)
                          }
                          className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deleting === member.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* EDIT MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-card shadow-xl max-h-[90vh] overflow-y-auto">
            {/* MODAL HEADER */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">
                    Edit Team Member
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Update account information,
                    permissions, or status.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={saving}
                  className="text-gray-400 hover:text-gray-700 text-xl leading-none disabled:opacity-50"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* MODAL FORM */}
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

              {/* ROLE */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>

                <select
                  value={editRole}
                  disabled={
                    editing.id === profile?.uid
                  }
                  onChange={(e) =>
                    setEditRole(
                      e.target.value as TeamRole
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  <option value="admin">
                    Administrator
                  </option>

                  <option value="super-admin">
                    Super Admin
                  </option>
                </select>

                {editing.id === profile?.uid && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Your own Super Admin role cannot
                    be removed from this screen.
                  </p>
                )}
              </div>

              {/* STATUS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Status
                </label>

                <select
                  value={editStatus}
                  disabled={
                    editing.id === profile?.uid
                  }
                  onChange={(e) =>
                    setEditStatus(
                      e.target.value as TeamStatus
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:bg-gray-100 disabled:text-gray-500"
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

                {editing.id === profile?.uid && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Your own account cannot be
                    suspended or disabled.
                  </p>
                )}
              </div>

              {/* PASSWORD */}
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
                Enter a new password only if you need
                to reset this team member's login
                password. Minimum 8 characters.
              </p>

              {/* ACTIONS */}
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