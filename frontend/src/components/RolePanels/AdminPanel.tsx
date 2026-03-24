"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { Users, Building2, GraduationCap, BarChart as BarChartIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminPanel() {
  const { contract } = useWeb3();
  const [student, setStudent] = useState("");
  const [company, setCompany] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [createdInternshipId, setCreatedInternshipId] = useState<number | null>(null);

  const [whitelistAddress, setWhitelistAddress] = useState("");
  const [loadingWhitelist, setLoadingWhitelist] = useState(false);

  // KPIs & Charts
  const [kpis, setKpis] = useState({ totalInternships: 0, whitelistedCompanies: 0, avgGrade: 0 });
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Off-Chain CRM Data
  const [users, setUsers] = useState<any[]>([]);
  
  // Stable refetch trigger — increments after successful transactions
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (e) {
        console.error("Failed to fetch users from Prisma", e);
      }
    }
    fetchUsers();
    async function fetchKPIs() {
      if (!contract) return;
      try {
        const createdFilter = contract.filters.InternshipCreated();
        const createdEvents = await contract.queryFilter(createdFilter, 0, "latest");
        
        const whitelistFilter = contract.filters.CompanyWhitelisted();
        const whitelistEvents = await contract.queryFilter(whitelistFilter, 0, "latest");
        
        const gradeFilter = contract.filters.GradeAssigned();
        const gradeEvents = await contract.queryFilter(gradeFilter, 0, "latest");
        
        let average = 0;
        const distribution = [
          { name: "0-20", count: 0 },
          { name: "21-40", count: 0 },
          { name: "41-60", count: 0 },
          { name: "61-80", count: 0 },
          { name: "81-100", count: 0 }
        ];

        if (gradeEvents.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const total = gradeEvents.reduce((acc, ev: any) => {
             const g = Number(ev.args[1]);
             if (g <= 20) distribution[0].count++;
             else if (g <= 40) distribution[1].count++;
             else if (g <= 60) distribution[2].count++;
             else if (g <= 80) distribution[3].count++;
             else distribution[4].count++;
             return acc + g;
          }, 0);
          average = Math.round(total / gradeEvents.length);
        }

        setChartData(distribution);
        setKpis({
          totalInternships: createdEvents.length,
          whitelistedCompanies: whitelistEvents.length,
          avgGrade: average
        });
      } catch (e) {
        console.error("Failed to fetch KPIs", e);
      }
    }
    fetchKPIs();

    if (contract) {
      contract.on("InternshipCreated", fetchKPIs);
      contract.on("CompanyWhitelisted", fetchKPIs);
      contract.on("GradeAssigned", fetchKPIs);
    }

    return () => {
      if (contract) {
        contract.off("InternshipCreated", fetchKPIs);
        contract.off("CompanyWhitelisted", fetchKPIs);
        contract.off("GradeAssigned", fetchKPIs);
      }
    };
  }, [contract, refetchTrigger]);

  const handleCreateInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;

    // Strip ALL whitespace (spaces, newlines, tabs) — copy-paste can introduce hidden chars
    const cleanStudent = student.replace(/\s+/g, '');
    const cleanCompany = company.replace(/\s+/g, '');
    const cleanSupervisor = supervisor.replace(/\s+/g, '');
    
    if (!ethers.isAddress(cleanStudent)) {
      toast.error("Invalid Student Address format.");
      return;
    }
    if (!ethers.isAddress(cleanCompany)) {
      toast.error("Invalid Company Address format.");
      return;
    }
    if (!ethers.isAddress(cleanSupervisor)) {
      toast.error("Invalid Supervisor Address format.");
      return;
    }

    setLoading(true);
    setTxHash("");
    
    try {
      const tx = await contract.createInternship(cleanStudent, cleanCompany, cleanSupervisor);
      toast.loading('Registering internship on the blockchain...', { id: 'create-internship' });
      const receipt = await tx.wait();
      toast.dismiss('create-internship');
      setTxHash(receipt.hash);

      let newId = null;
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.name === "InternshipCreated") {
            newId = Number(parsed.args[0]); 
            setCreatedInternshipId(newId);
          }
        } catch (e) {}
      }

      // Off-Chain Sync (Prisma CRM) — pass onChainId so panels can link back to the blockchain
      if (newId) {
        fetch("/api/internships/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            onChainId: newId,
            studentAddress: cleanStudent,
            companyAddress: cleanCompany,
            supervisorAddress: cleanSupervisor,
            title: `Internship #${newId}`,
            status: "Registered"
          })
        }).catch(e => console.error("Failed to sync CRM", e));
      }

      setStudent(""); setCompany(""); setSupervisor("");
      setRefetchTrigger(prev => prev + 1);
      toast.success(newId ? `Internship created! ID is #${newId}` : "Internship created successfully!");
    } catch (err: any) {
      toast.dismiss('create-internship');
      const msg = err?.reason || err?.message || "Unknown error";
      if (msg.includes("user rejected") || err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error(`Failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract) return;
    const cleanAddress = whitelistAddress.trim();
    if (!ethers.isAddress(cleanAddress)) {
      toast.error("Invalid Wallet Address format.");
      return;
    }

    setLoadingWhitelist(true);
    try {
      const tx = await contract.whitelistCompany(cleanAddress);
      toast.loading('Whitelisting company on blockchain...', { id: 'whitelist' });
      await tx.wait();
      toast.dismiss('whitelist');
      setWhitelistAddress("");
      setRefetchTrigger(prev => prev + 1);
      toast.success("Company address added to Whitelist (KYB completed).");
    } catch (err: any) {
      toast.dismiss('whitelist');
      const msg = err?.reason || err?.message || "Unknown error";
      if (msg.includes("user rejected") || err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error(`Failed: ${msg}`);
      }
    } finally {
      setLoadingWhitelist(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">University Administration</h2>
      <p className="text-gray-600 mb-8 border-b border-gray-100 pb-6">
        As an Admin, manage enterprise authorizations (KYB) and register tripartite internship agreements.
      </p>

      {/* KPI ANALYTICS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Internships</p>
            <h3 className="text-2xl font-bold text-gray-900">{kpis.totalInternships}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Approved Companies</p>
            <h3 className="text-2xl font-bold text-gray-900">{kpis.whitelistedCompanies}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Average Grade</p>
            <h3 className="text-2xl font-bold text-gray-900">{kpis.avgGrade > 0 ? `${kpis.avgGrade}/100` : "N/A"}</h3>
          </div>
        </div>
      </div>

      {/* RECHARTS DATA VIZ */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-12">
        <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
           <BarChartIcon className="text-gray-400" size={20} />
           <h3 className="text-lg font-semibold text-gray-800">Grade Distribution Analytics</h3>
        </div>
        
        <div className="h-72 w-full">
          {kpis.avgGrade > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'}}
                />
                <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 italic">
              Not enough data to generate analytics. Waiting for supervisors to assign grades.
            </div>
          )}
        </div>
      </div>

      {createdInternshipId && (
        <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200 shadow-sm text-center">
           <p className="font-semibold text-green-800 text-lg mb-1">Internship Successfully Created!</p>
           <p className="text-gray-600 mb-2">Share this Internship ID with the Company & Supervisor:</p>
           <span className="text-4xl font-mono font-bold text-green-600 block shadow-inner bg-green-100 py-2 rounded">#{createdInternshipId}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* CREATE INTERNSHIP FORM */}
        <form onSubmit={handleCreateInternship} className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">1. Register New Internship</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Student Address</label>
          <input
            type="text"
            required
            value={student}
            onChange={(e) => setStudent(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
            placeholder="0x..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company Address</label>
          <input
            type="text"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
            placeholder="0x..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Supervisor Address</label>
          <input
            type="text"
            required
            value={supervisor}
            onChange={(e) => setSupervisor(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-gray-900"
            placeholder="0x..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gray-900 hover:bg-black text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 flex justify-center items-center"
        >
          {loading ? "Processing..." : "Register Internship"}
        </button>

        {txHash && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-500 font-mono break-all">Tx Hash: {txHash}</p>
          </div>
        )}
      </form>

      {/* WHITELIST COMPANY FORM */}
      <form onSubmit={handleWhitelist} className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">2. Manage Company Whitelist (KYB)</h3>
          <p className="text-sm text-gray-500 mb-4">You must whitelist a company wallet before assigning it to an internship.</p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Wallet Address</label>
            <input
              type="text"
              required
              value={whitelistAddress}
              onChange={(e) => setWhitelistAddress(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-gray-900"
              placeholder="0x..."
            />
          </div>

          <button
            type="submit"
            disabled={loadingWhitelist}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {loadingWhitelist ? "Processing..." : "Authorize Company"}
          </button>
      </form>
      </div>

      {/* USER DIRECTORY (Hybrid CRM) */}
      <h3 className="text-xl font-bold text-gray-900 mb-6 mt-16 border-b border-gray-100 pb-4">
        University Directory (Hybrid CRM)
      </h3>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-12">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 font-semibold text-gray-700">Profile</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Role</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Wallet Address</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Department / Industry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'Company' ? 'bg-teal-100 text-teal-700' :
                      user.role === 'Supervisor' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-gray-600 block truncate max-w-[200px]">
                    {user.walletAddress}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {user.department || user.industry || "-"}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                    No users found in the CRM database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
