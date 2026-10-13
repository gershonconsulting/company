"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, UserPlus, Trash2, KeyRound, ShieldCheck, AlertCircle, CheckCircle } from "lucide-react";

interface Me   { email: string; name: string; role: "admin" | "agent"; }
interface User { email: string; name: string; role: "admin" | "agent"; createdAt: string; updatedAt: string; }

const input = "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]";
const btn   = "flex items-center gap-2 bg-[color:var(--brand)] hover:bg-[color:var(--brand-dark)] disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-sm";

function Note({ ok, text }: { ok: boolean; text: string }) {
  if (!text) return null;
  return (
    <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 border ${ok ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"}`}>
      {ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {text}
    </div>
  );
}

export default function TeamAccess() {
  const [me, setMe]       = useState<Me | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm]   = useState({ email: "", name: "", role: "agent", password: "" });
  const [msg, setMsg]     = useState({ ok: true, text: "" });
  const [pw, setPw]       = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState({ ok: true, text: "" });
  const [busy, setBusy]   = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/auth/me", { cache: "no-store" });
    if (!r.ok) return;
    const m = (await r.json()) as Me;
    setMe(m);
    if (m.role === "admin") {
      const u = await fetch("/api/auth/users", { cache: "no-store" }).then((x) => x.json()) as { users?: User[] };
      setUsers(u.users ?? []);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg({ ok: true, text: "" });
    const r = await fetch("/api/auth/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const j = await r.json() as { error?: string; users?: User[] };
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: j.error ?? "Could not save." }); return; }
    setUsers(j.users ?? []);
    setMsg({ ok: true, text: `Saved ${form.email}. Share the password with them privately.` });
    setForm({ email: "", name: "", role: "agent", password: "" });
  }

  async function remove(email: string) {
    setBusy(true);
    const r = await fetch("/api/auth/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await r.json() as { error?: string; users?: User[] };
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: j.error ?? "Could not remove." }); return; }
    setUsers(j.users ?? []); setMsg({ ok: true, text: `Removed ${email} — they are signed out.` });
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setPwMsg({ ok: true, text: "" });
    const r = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pw) });
    const j = await r.json() as { error?: string };
    setBusy(false);
    if (!r.ok) { setPwMsg({ ok: false, text: j.error ?? "Could not change password." }); return; }
    setPw({ current: "", next: "" }); setPwMsg({ ok: true, text: "Password changed. Other sessions are signed out." });
  }

  if (!me) return null;

  return (
    <section className="mt-10 flex flex-col gap-6">
      <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
        <ShieldCheck size={18} className="text-[color:var(--brand)]" /> Access &amp; security
      </h2>

      {/* My password */}
      <form onSubmit={changePw} className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><KeyRound size={15} /> Change my password</h3>
        <p className="text-xs text-gray-500">Signed in as <strong>{me.email}</strong> ({me.role}). At least 10 characters, letters and numbers.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input type="password" autoComplete="current-password" placeholder="Current password" className={input}
            value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <input type="password" autoComplete="new-password" placeholder="New password" className={input}
            value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
        </div>
        <Note {...pwMsg} />
        <div><button disabled={busy || !pw.current || !pw.next} className={btn}><KeyRound size={15} /> Change password</button></div>
      </form>

      {/* Team (admins) */}
      {me.role === "admin" && (
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Users size={15} /> Team access</h3>
          <p className="text-xs text-gray-500">
            Everyone signs in with their own email and password. <strong>Agents</strong> see every page; only <strong>admins</strong> can change settings and manage the team.
            Removing someone or resetting their password signs them out immediately.
          </p>
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase text-gray-500 border-b border-gray-200">
              <tr><th className="text-left py-2">Email</th><th className="text-left py-2">Name</th><th className="text-left py-2">Role</th><th /></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.email}>
                  <td className="py-2 pr-3 font-medium text-gray-800">{u.email}</td>
                  <td className="py-2 pr-3 text-gray-600">{u.name}</td>
                  <td className="py-2 pr-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>{u.role}</span></td>
                  <td className="py-2 text-right">
                    {u.email !== me.email && (
                      <button type="button" onClick={() => remove(u.email)} disabled={busy}
                        className="text-red-600 hover:text-red-800 inline-flex items-center gap-1 text-xs font-bold"><Trash2 size={13} /> Remove</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-start">
            <input type="email" placeholder="email@gershonconsulting.com" className={input} required
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input type="text" placeholder="Name" className={input}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className={input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="agent">Sales agent</option>
              <option value="admin">Admin</option>
            </select>
            <input type="password" autoComplete="new-password" placeholder="Password (blank = keep)" className={input}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button disabled={busy || !form.email} className={btn}><UserPlus size={15} /> Add / update</button>
          </form>
          <Note {...msg} />
        </div>
      )}
    </section>
  );
}
