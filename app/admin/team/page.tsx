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
  role: string;
  status: string;
}

export default function TeamPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generateTempPassword());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ email: string; password: string } | null>(null);

  const load = () => {
    setLoading(true);
    getAll("users")
      .then((data) => {
        const all = data as TeamMember[];
        setMembers(all.filter((u) => u.role === "admin" || u.role === "super-admin"));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(null);
    if (!name || !email) {
      setError("Please fill in all fields.");
      return;
    }
    setSaving(true);
    try {
      await createLoginAccount({
        email,
        password,
        name,
        role: "super-admin",
      });
      setSuccess({ email, password });
      setName("");
      setEmail("");
      setPassword(generateTempPassword());
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Team</h1>
        <p className="text-sm text-gray-500">
          Directors (super-admins) have full access to everything. Only existing admins can
          create new director accounts here.
        </p>
      </div>

      <section className="space-y-3"><h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Add a Director
        </h2>

        {error && (
          <p className="text-sm text-status-disabled bg-status-disabled/10 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <div className="bg-status-active/10 rounded-card p-4 space-y-1">
            <p className="text-sm text-status-active font-medium">Director account created.</p>
            <p className="text-sm font-mono bg-white rounded px-3 py-2 border border-gray-200">
              Email: {success.email}
              <br />
              Temporary password: {success.password}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-card border border-gray-100 shadow-sm p-6 space-y-2">
          <TextInput label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <TextInput
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextInput
            label="Temporary Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setPassword(generateTempPassword())}
            className="text-xs text-brand hover:underline"
          >
            Generate new password
          </button>
          <Button type="submit" disabled={saving} className="mt-2">
            {saving ? "Creating..." : "Create Director Account"}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Current Team
        </h2>
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="bg-white rounded-card border border-gray-100 shadow-sm divide-y divide-gray-100">
            {members.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No team members found.</p>
            ) : (
              members.map((m) => (
                <div key={m.id} className="flex justify-between px-4 py-3 text-sm">
                  <span className="text-gray-700">
                    {m.name} {m.id === profile?.uid && <span className="text-gray-400">(you)</span>}
                  </span>
                  <span className="text-gray-500">
                    {m.role === "super-admin" ? "Director" : "Admin"} &middot; {m.email}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}