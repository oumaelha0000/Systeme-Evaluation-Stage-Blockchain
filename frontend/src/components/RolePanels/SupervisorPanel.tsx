"use client";

import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import toast from "react-hot-toast";
import Stepper from "@/components/Stepper";

export default function SupervisorPanel() {
  const { contract, account } = useWeb3();
  const [internshipId, setInternshipId] = useState("");   // Prisma UUID (for display)
  const [onChainId, setOnChainId] = useState<number | null>(null); // Blockchain integer (for contract calls)
  const [internshipDetails, setInternshipDetails] = useState<any>(null);
  const [grade, setGrade] = useState("");
  const [loadingValidation, setLoadingValidation] = useState(false);
  const [loadingGrade, setLoadingGrade] = useState(false);
  const [txHash, setTxHash] = useState("");
  
  // Kanban Data
  const [assignedInternships, setAssignedInternships] = useState<any[]>([]);

  // Stable fetch function that always uses the latest `account` via useCallback
  const fetchAssigned = useCallback(async () => {
    if (!account) return;
    try {
      const res = await fetch(`/api/internships/details?role=supervisor&address=${account}`);
      if (res.ok) {
        const data = await res.json();
        setAssignedInternships(data);
      }
    } catch (e) {
      console.error("Failed to fetch Kanban details", e);
    }
  }, [account]);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  // Fetch internship details when ID is entered
  useEffect(() => {
    async function fetchDetails() {
      if (!contract || !internshipId) {
        setInternshipDetails(null);
        return;
      }
      try {
        const details = await contract.getInternship(internshipId);
        if (details[0] !== "0x0000000000000000000000000000000000000000") {
          setInternshipDetails({
             student: details[0],
             company: details[1],
             supervisor: details[2],
             companyValidated: details[3],
             reportValidated: details[4],
             grade: details[5],
             reportIPFSHash: details[6],
             isGraded: details[7],
          });
        } else {
          setInternshipDetails(null);
        }
      } catch (err) {
        setInternshipDetails(null);
      }
    }
    fetchDetails();

    if (!contract || !internshipId) return;

    const handleEvent = (id: any) => {
      if (Number(id) === Number(internshipId)) {
        fetchDetails();
      }
    };

    contract.on("ReportSubmitted", handleEvent);
    contract.on("CompanyValidated", handleEvent);

    return () => {
      contract.off("ReportSubmitted", handleEvent);
      contract.off("CompanyValidated", handleEvent);
    };

  }, [internshipId, contract, txHash]);

  const handleValidateReport = async () => {
    if (!contract || onChainId == null) {
      toast.error("Please select an internship from the Kanban board first.");
      return;
    }

    setLoadingValidation(true);
    setTxHash("");
    
    try {
      const tx = await contract.validateReport(onChainId);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      
      // Update Prisma CRM Status to InReview — MUST succeed before we refetch
      const putRes = await fetch("/api/internships/details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onChainId, status: "InReview" })
      });
      if (!putRes.ok) console.error("CRM sync returned non-OK:", putRes.status);
      
      await fetchAssigned(); // Instantly refresh Kanban UI
      toast.success('Report validated! If the company also validated, the NFT is minted.');
    } catch (err: any) {
      const msg = err?.reason || err?.message || "Unknown error";
      if (msg.includes("user rejected") || err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error(`Validation failed: ${msg}`);
      }
    } finally {
      setLoadingValidation(false);
    }
  };

  const handleAssignGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !internshipId || !grade) return;

    setLoadingGrade(true);
    setTxHash("");
    
    try {
      const tx = await contract.assignGrade(onChainId, Number(grade));
      toast.loading('Publishing grade to blockchain...', { id: 'grade' });
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      toast.dismiss('grade');
      
      // Update Prisma CRM Status to Completed — MUST succeed before we refetch
      const putRes = await fetch("/api/internships/details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onChainId, status: "Completed" })
      });
      if (!putRes.ok) console.error("CRM sync returned non-OK:", putRes.status);
      
      await fetchAssigned(); // Instantly refresh Kanban UI
      toast.success(`Grade of ${grade} assigned! Internship Completed.`);
    } catch (err: any) {
      toast.dismiss('grade');
      const msg = err?.reason || err?.message || "Unknown error";
      if (msg.includes("user rejected") || err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error(`Failed: ${msg}`);
      }
    } finally {
      setLoadingGrade(false);
    }
  };

  const steps: any[] = [
    {
      id: 1,
      label: "Registered",
      description: "Internship assigned correctly",
      status: "complete",
    },
    {
      id: 2,
      label: "Report Uploaded",
      description: internshipDetails?.reportIPFSHash ? "Student submitted report" : "Waiting for student",
      status: internshipDetails?.reportIPFSHash ? "complete" : "current",
    },
    {
      id: 3,
      label: "Validate Report",
      description: internshipDetails?.reportValidated ? "Approved by you" : "Awaiting your validation",
      status: internshipDetails?.reportValidated ? "complete" : (internshipDetails?.reportIPFSHash ? "current" : "upcoming"),
    },
    {
      id: 4,
      label: "Final Grading",
      description: Number(internshipDetails?.grade) > 0 ? `Grade published: ${internshipDetails.grade}/100` : "Pending grade assignment",
      status: Number(internshipDetails?.grade) > 0 ? "complete" : (internshipDetails?.reportValidated ? "current" : "upcoming"),
    }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Academic Supervisor Dashboard</h2>
      <p className="text-gray-600 mb-8 border-b border-gray-100 pb-6">
        As the Academic Supervisor, you must review the IPFS report submitted by the student, validate its compliance, and assign the final evaluation grade.
      </p>

      {/* Kanban Board Layout */}
      <h3 className="text-xl font-bold text-gray-900 mb-6 mt-8">Your Assigned Internships (Kanban)</h3>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {/* TO DO (Registered / Awaiting Report) */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-inner h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
            <h4 className="font-semibold text-gray-700">Awaiting Reports</h4>
            <span className="bg-gray-200 text-gray-600 text-xs py-1 px-3 rounded-full font-bold">
              {assignedInternships.filter(i => i.status === "Registered").length}
            </span>
          </div>
          <div className="space-y-4">
            {assignedInternships.filter(i => i.status === "Registered").map(internship => (
              <div key={internship.id} onClick={() => { setInternshipId(internship.id); setOnChainId(internship.onChainId); }} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:border-indigo-400 cursor-pointer transition">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono font-bold text-indigo-600">#{internship.onChainId ?? '?'}</span>
                  <span className="text-[10px] text-gray-400">Click to Select</span>
                </div>
                <p className="font-medium text-gray-900">{internship.title}</p>
                <p className="text-xs text-gray-500 mt-2 line-clamp-1">Student: {internship.student?.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* IN REVIEW (Report Uploaded, Needs Validation & Grading) */}
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 shadow-inner h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 border-b border-orange-200 pb-2">
            <h4 className="font-semibold text-orange-800">Needs Review & Grading</h4>
            <span className="bg-orange-200 text-orange-800 text-xs py-1 px-3 rounded-full font-bold">
              {assignedInternships.filter(i => i.status === "InReview").length}
            </span>
          </div>
          <div className="space-y-4">
            {assignedInternships.filter(i => i.status === "InReview").map(internship => (
              <div key={internship.id} onClick={() => { setInternshipId(internship.id); setOnChainId(internship.onChainId); }} className="bg-white p-4 rounded-lg shadow-sm border border-orange-200 hover:border-orange-400 cursor-pointer transition">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono font-bold text-orange-600">#{internship.onChainId ?? '?'}</span>
                  <span className="text-[10px] text-orange-400">Click to Select</span>
                </div>
                <p className="font-medium text-gray-900">{internship.title}</p>
                <p className="text-xs text-gray-500 mt-2 line-clamp-1">Student: {internship.student?.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* COMPLETED (Graded) */}
        <div className="bg-green-50 rounded-xl p-4 border border-green-200 shadow-inner h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4 border-b border-green-200 pb-2">
            <h4 className="font-semibold text-green-800">Completed</h4>
            <span className="bg-green-200 text-green-800 text-xs py-1 px-3 rounded-full font-bold">
              {assignedInternships.filter(i => i.status === "Completed").length}
            </span>
          </div>
          <div className="space-y-4">
            {assignedInternships.filter(i => i.status === "Completed").map(internship => (
              <div key={internship.id} onClick={() => { setInternshipId(internship.id); setOnChainId(internship.onChainId); }} className="bg-white opacity-60 p-4 rounded-lg shadow-sm border border-green-200 cursor-pointer transition hover:opacity-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono font-bold text-green-600">#{internship.onChainId ?? '?'}</span>
                  <span className="text-[10px] text-green-500">Done</span>
                </div>
                <p className="font-medium text-gray-900">{internship.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {internshipDetails && (
        <div className="mb-10 bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-8">
           <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-4 mb-2">Evaluation Progress</h3>
           <Stepper steps={steps} />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Validation Section */}
        <div className="space-y-6">
           <h3 className="text-lg font-semibold text-gray-800">1. Validate Report</h3>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Internship ID</label>
            <input
              type="number"
              min="1"
              value={internshipId}
              onChange={(e) => setInternshipId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="e.g. 1"
            />
          </div>

          {internshipDetails && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
              <p className="mb-2"><span className="font-semibold text-gray-700">Student:</span> <span className="font-mono text-xs">{internshipDetails.student}</span></p>
              
              <div className="mb-4 p-3 bg-white border border-gray-200 rounded shadow-sm">
                <span className="font-semibold text-gray-700 block mb-1">Student's Report: </span> 
                {internshipDetails.reportIPFSHash ? (
                  <a 
                     href={`https://ipfs.io/ipfs/${internshipDetails.reportIPFSHash.startsWith('QmMockHash') ? 'QmRA3NWM82ZGynMbYzAgYTSXCVM14Wx1RZ8fKP42G6gjgj' : internshipDetails.reportIPFSHash}`} 
                     target="_blank" rel="noreferrer" 
                     className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Read PDF on IPFS
                  </a>
                ) : (
                  <span className="text-gray-500 italic">Not uploaded yet.</span>
                )}
              </div>
              
              <p><span className="font-semibold text-gray-700">Your Validation Status:</span> {internshipDetails.reportValidated ? '✅ Approved' : '⏳ Pending Action'}</p>
            </div>
          )}

          <button
            onClick={handleValidateReport}
            disabled={loadingValidation || !onChainId}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {loadingValidation ? "Processing..." : "Validate Report Hash"}
          </button>
        </div>

        {/* Grade Section */}
        <form onSubmit={handleAssignGrade} className="space-y-6 border-t pt-8 md:border-t-0 md:pt-0 md:border-l md:pl-12 border-gray-100">
           <h3 className="text-lg font-semibold text-gray-800">2. Assign Final Grade</h3>
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Final Grade (0-100)</label>
            <input
              type="number"
              required
              min="0"
              max="100"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="e.g. 95"
            />
          </div>

            <button
              type="submit"
              disabled={loadingGrade || !onChainId || !grade}
              className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 flex justify-center items-center"
            >
              {loadingGrade ? "Processing..." : "Publish Grade"}
            </button>
        </form>
      </div>

      {txHash && (
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg max-w-xl">
          <p className="text-xs text-gray-500 font-mono break-all">Tx Hash: {txHash}</p>
        </div>
      )}
    </div>
  );
}
