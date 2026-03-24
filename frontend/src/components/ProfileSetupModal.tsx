"use client";

import { useState } from "react";
import toast from "react-hot-toast";

interface ProfileSetupModalProps {
  account: string;
  role: string;
  onComplete: () => void;
}

export default function ProfileSetupModal({ account, role, onComplete }: ProfileSetupModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: account,
          role,
          name: name.trim(),
          email: email.trim(),
          department: department.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to save profile");
      toast.success("Profile saved! Welcome 🎉");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel: Record<string, string> = {
    ADMIN: "University Administrator",
    COMPANY: "Company / HR Representative",
    SUPERVISOR: "Academic Supervisor",
    STUDENT: "Intern / Student",
  };

  const fieldLabel = ["ADMIN", "SUPERVISOR", "STUDENT"].includes(role) ? "Department" : "Industry / Sector";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
          <h2 className="text-xl font-bold mb-1">Complete Your Profile 👋</h2>
          <p className="text-indigo-100 text-sm">
            Welcome! You have been registered as <b>{roleLabel[role] || role}</b>. 
            Finish setting up your profile to access the dashboard.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* Wallet (read-only) */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Wallet Address
            </label>
            <div className="font-mono text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-500 break-all">
              {account}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Jean Dupont"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jean.dupont@university.edu"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {fieldLabel} <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder={fieldLabel === "Department" ? "e.g. Computer Science" : "e.g. Software Engineering"}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition disabled:opacity-50 mt-2"
          >
            {loading ? "Saving..." : "Save Profile & Enter Dashboard →"}
          </button>
        </form>
      </div>
    </div>
  );
}
