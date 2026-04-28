import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import API from "../utils/api";

export default function Profile() {
  const [user, setUser]           = useState(null);
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile]     = useState(false);
  const [savingPassword, setSavingPassword]   = useState(false);
  const navigate                  = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await API.get("/profile");
      setUser(res.data);
      setName(res.data.name);
      setEmail(res.data.email);
    } catch (_) {
      navigate("/");
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setSavingProfile(true);
    try {
      const res = await API.put("/profile", { name, email });

      // ✅ Update localStorage so navbar and dashboard reflect new name instantly
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      const updated = { ...stored, name: res.data.user.name, email: res.data.user.email };
      localStorage.setItem("user", JSON.stringify(updated));

      setUser(res.data.user);
      toast.success("Profile updated successfully!");

      // Force navbar re-render by dispatching storage event
      window.dispatchEvent(new Event("storage"));
    } catch (err) {
      toast.error(err.response?.data?.message || "Error updating profile");
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSavingPassword(true);
    try {
      await API.put("/profile/password", { currentPassword, newPassword });
      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error changing password");
    }
    setSavingPassword(false);
  };

  if (!user) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="skeleton w-64 h-8 rounded-xl" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="mb-8 animate-fade-up">
        <h2 className="page-title">Profile</h2>
        <p className="page-subtitle">Manage your account details</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── Avatar card ────────────────────────────────────────── */}
        <div className="card p-6 text-center animate-fade-up-1">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center text-3xl font-bold text-gray-950 font-display mx-auto mb-4">
            {user.name[0].toUpperCase()}
          </div>
          <h3 className="font-display font-bold text-xl text-white mb-1">{user.name}</h3>
          <p className="text-slate-500 text-sm mb-4">{user.email}</p>
          <div className="border-t border-slate-800 pt-4">
            <p className="text-xs text-slate-600">Member since</p>
            <p className="text-sm text-slate-400 font-medium mt-1">
              {new Date(user.createdAt).toLocaleDateString("en", {
                month: "long", year: "numeric"
              })}
            </p>
          </div>
        </div>

        {/* ── Edit forms ─────────────────────────────────────────── */}
        <div className="md:col-span-2 space-y-6 animate-fade-up-2">

          {/* Update profile */}
          <div className="card p-6">
            <h3 className="font-display font-semibold text-white mb-5">
              Personal Information
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="label">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field"
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="btn-primary"
              >
                {savingProfile ? <span className="spinner" /> : null}
                {savingProfile ? "Saving…" : "Save Changes"}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="card p-6">
            <h3 className="font-display font-semibold text-white mb-5">
              Change Password
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="label">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input-field"
                  placeholder="Min. 6 characters"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`input-field ${
                    confirmPassword && confirmPassword !== newPassword
                      ? "border-rose-500/50"
                      : confirmPassword && confirmPassword === newPassword
                      ? "border-emerald-500/50"
                      : ""
                  }`}
                  placeholder="••••••••"
                  required
                />
                {confirmPassword && confirmPassword !== newPassword && (
                  <p className="text-xs text-rose-400">Passwords don't match</p>
                )}
                {confirmPassword && confirmPassword === newPassword && (
                  <p className="text-xs text-emerald-400">✓ Passwords match</p>
                )}
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="btn-primary"
              >
                {savingPassword ? <span className="spinner" /> : null}
                {savingPassword ? "Changing…" : "Change Password"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </Layout>
  );
}