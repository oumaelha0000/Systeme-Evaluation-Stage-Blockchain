"use client";

import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import toast from "react-hot-toast";

export default function CompanyPanel() {
  const { contract, account } = useWeb3();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  // Stable fetch function that always uses the latest `account` via useCallback
  const fetchTasks = useCallback(async () => {
    if (!account) return;
    try {
      const res = await fetch(`/api/internships/details?role=company&address=${account}`);
      if (res.ok) {
        const data = await res.json();
        setPendingTasks(data);
      }
    } catch (e) {
      console.error("Failed to fetch pending tasks", e);
    }
  }, [account]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || selectedTask?.onChainId == null) {
      toast.error("No internship selected or missing blockchain ID.");
      return;
    }

    setLoading(true);
    setTxHash("");

    try {
      toast.loading('Validating internship on the blockchain...', { id: 'company-validate' });
      const tx = await contract.validateInternshipByCompany(Number(selectedTask.onChainId));
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      toast.dismiss('company-validate');

      // Sync to Prisma: mark companyValidated = true — MUST succeed before we refetch
      const putRes = await fetch("/api/internships/details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onChainId: selectedTask.onChainId, companyValidated: true })
      });

      if (!putRes.ok) {
        console.error("CRM sync returned non-OK:", putRes.status);
        // Still proceed — the blockchain is the source of truth
      }

      await fetchTasks(); // Refetch only AFTER PUT completes
      setSelectedTask(null);
      toast.success('Internship successfully validated by Company! ✅');
    } catch (err: any) {
      toast.dismiss('company-validate');
      const msg = err?.reason || err?.message || "Transaction error";
      if (msg.includes("user rejected") || err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error(`Failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const pending = pendingTasks.filter(t => !t.companyValidated);
  const validated = pendingTasks.filter(t => t.companyValidated);

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Company HR Portal</h2>
      <p className="text-gray-600 mb-8 border-b border-gray-100 pb-6">
        As the designated Company representative, validate your assigned students' internships to authorize their final evaluation.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* TO-DO LIST */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Pending Validations</h3>
            <span className="bg-teal-100 text-teal-700 text-xs py-1 px-3 rounded-full font-bold">
              {pending.length}
            </span>
          </div>
          <div className="space-y-4">
            {pending.map(task => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`p-4 rounded-xl border cursor-pointer transition ${selectedTask?.id === task.id ? 'border-teal-500 bg-teal-50 shadow-md ring-1 ring-teal-500' : 'border-gray-200 bg-white hover:border-teal-300 shadow-sm'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono font-bold text-gray-500">
                    #{task.onChainId ?? task.id.slice(0, 6)}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">Awaiting validation</span>
                </div>
                <p className="font-semibold text-gray-900 mb-1">{task.student?.name || task.studentAddress.slice(0, 12) + "..."}</p>
                <p className="text-sm text-gray-500">{task.title}</p>
              </div>
            ))}
            {pending.length === 0 && (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                ✅ No pending student validations.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-12 mb-6 border-t pt-8">
            <h3 className="text-xl font-bold text-gray-900">Completed Validations</h3>
            <span className="bg-green-100 text-green-700 text-xs py-1 px-3 rounded-full font-bold">
              {validated.length}
            </span>
          </div>
          <div className="space-y-4">
            {validated.map((task) => (
              <div key={task.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 opacity-70 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-700">{task.student?.name || "Student"}</p>
                  <p className="text-xs font-mono text-gray-400 mt-1">{task.studentAddress}</p>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">✓ Validated</span>
              </div>
            ))}
            {validated.length === 0 && (
              <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                No completed validations yet.
              </div>
            )}
          </div>
        </div>

        {/* VALIDATION ACTION */}
        <div>
          <form onSubmit={handleValidate} className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Authorize Student</h3>
            <p className="text-sm text-gray-500">
              Select a student from your to-do list to sign their digital validation on the blockchain.
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm min-h-[80px] flex items-center justify-center">
              {selectedTask ? (
                <div className="w-full">
                  <p className="font-semibold text-gray-800 mb-1">{selectedTask.title}</p>
                  <p className="text-xs font-mono text-gray-500">Blockchain ID: #{selectedTask.onChainId}</p>
                  <p className="text-xs text-gray-500 mt-1 break-all">Student: {selectedTask.studentAddress}</p>
                </div>
              ) : (
                <p className="text-gray-400 italic text-center">Click an item on the left to select it...</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !selectedTask}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 flex justify-center items-center mt-6"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Authorizing...
                </>
              ) : "Sign Validation On-Chain"}
            </button>

            {txHash && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-500 font-mono break-all">Tx Hash: {txHash}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
