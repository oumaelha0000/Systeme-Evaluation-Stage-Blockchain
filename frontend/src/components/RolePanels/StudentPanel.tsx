"use client";

import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import toast from "react-hot-toast";
import Stepper from "@/components/Stepper";

export default function StudentPanel() {
  const { contract, account } = useWeb3();
  const [internshipId, setInternshipId] = useState<number | null>(null);
  const [internshipDetails, setInternshipDetails] = useState<any>(null);
  const [ipfsHash, setIpfsHash] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    async function fetchInternship() {
      if (!contract || !account) return;
      try {
        const id = await contract.studentToInternship(account);
        if (Number(id) > 0) {
          setInternshipId(Number(id));
          const details = await contract.getInternship(id);
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
        }
      } catch (err) {
        console.error("Failed to load internship", err);
      }
    }
    fetchInternship();

    if (!contract || !internshipId) return;

    const handleEvent = (id: any) => {
      if (Number(id) === internshipId) {
        fetchInternship();
      }
    };

    contract.on("CompanyValidated", handleEvent);
    contract.on("ReportValidated", handleEvent);
    contract.on("GradeAssigned", handleEvent);

    return () => {
      contract.off("CompanyValidated", handleEvent);
      contract.off("ReportValidated", handleEvent);
      contract.off("GradeAssigned", handleEvent);
    };

  }, [contract, account, txHash, internshipId]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !internshipId || !file) return;

    setLoadingSubmit(true);
    setTxHash("");
    
    try {
      // Step 1: Upload to IPFS
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Failed to upload file");
      }

      const data = await res.json();
      const uploadedHash = data.ipfsHash;
      setIpfsHash(uploadedHash);
      setUploadingFile(false);

      // Step 2: Record on blockchain (MetaMask popup here)
      toast.loading('Securing report hash on blockchain...', { id: 'submit-report' });
      const tx = await contract.submitReport(internshipId, uploadedHash);
      const receipt = await tx.wait();
      toast.dismiss('submit-report');
      setTxHash(receipt.hash);
      
      // Step 3: Update Prisma CRM Status to trigger Supervisor's Review Kanban
      await fetch("/api/internships/details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onChainId: internshipId, status: "InReview" })
      }).catch(e => console.error(e));

      setFile(null);
      toast.success(`Report saved immutably with hash ${uploadedHash.substring(0, 8)}...`);
    } catch (err: any) {
      toast.dismiss('submit-report');
      const msg = err?.reason || err?.message || "Transaction error";
      if (msg.includes("user rejected") || err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        toast.error("Transaction cancelled by user.");
      } else {
        toast.error(`Failed: ${msg}`);
      }
    } finally {
      setLoadingSubmit(false);
      setUploadingFile(false);
    }
  };

  const steps: any[] = [
    {
      id: 1,
      label: "Registered",
      description: "Internship created on blockchain",
      status: "complete",
    },
    {
      id: 2,
      label: "Report Uploaded",
      description: internshipDetails?.reportIPFSHash ? "PDF secured on IPFS" : "Awaiting student upload",
      status: internshipDetails?.reportIPFSHash ? "complete" : "current",
    },
    {
      id: 3,
      label: "Company Validation",
      description: internshipDetails?.companyValidated ? "Approved by company" : "Pending company review",
      status: internshipDetails?.companyValidated ? "complete" : (internshipDetails?.reportIPFSHash ? "current" : "upcoming"),
    },
    {
      id: 4,
      label: "Academic Review",
      description: internshipDetails?.isGraded ? `Graded: ${internshipDetails.grade}/100` : "Pending supervisor grading",
      status: internshipDetails?.isGraded ? "complete" : (internshipDetails?.reportValidated ? "current" : "upcoming"),
    },
    {
      id: 5,
      label: "NFT Minted",
      description: (internshipDetails?.companyValidated && internshipDetails?.reportValidated && internshipDetails?.isGraded) ? "Diploma secured in wallet" : "Locked",
      status: (internshipDetails?.companyValidated && internshipDetails?.reportValidated && internshipDetails?.isGraded) ? "complete" : "upcoming",
    }
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Intern Portal</h2>

      {internshipId ? (
        <div className="space-y-10">
          {/* Status Tracker Stepper */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-8">
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-100 pb-4 mb-2">Internship Progress</h3>
            <Stepper steps={steps} />
          </div>

          {/* Submission and NFT Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-gray-100 pt-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Submit Report</h3>
              <p className="text-sm text-gray-500 mb-6">Upload your PDF report to secure it immutably on IPFS. The hash will be automatically generated and saved on the blockchain.</p>
              
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <input
                  type="file"
                  required
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={internshipDetails?.reportValidated} // Disabled if already validated
                />

                <button
                  type="submit"
                  disabled={loadingSubmit || !file || internshipDetails?.reportValidated}
                  className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingSubmit ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      {uploadingFile ? "Uploading to IPFS..." : "Recording on-chain..."}
                    </>
                  ) : "Upload & Save On-Chain"}
                </button>
              </form>
              
              {internshipDetails?.reportIPFSHash && (
                <div className="mt-4 text-sm text-gray-600">
                  Current Hash: <span className="font-mono bg-gray-100 px-2 py-1 rounded break-all">{internshipDetails.reportIPFSHash}</span>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 rounded-2xl p-[2px] shadow-2xl relative overflow-hidden group">
               {internshipDetails?.companyValidated && internshipDetails?.reportValidated && internshipDetails?.isGraded ? (
                 <div className="bg-white rounded-[14px] p-6 h-full flex flex-col relative text-gray-900">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400 opacity-10 rounded-full -mr-24 -mt-24 blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600 opacity-5 rounded-full -ml-24 -mb-24 blur-3xl pointer-events-none"></div>

                    {/* Certificate Header */}
                    <div className="text-center border-b-2 border-indigo-100 pb-4 mb-6">
                      <div className="flex justify-center mb-3">
                         <div className="bg-indigo-50 p-3 rounded-full border border-indigo-100 shadow-inner">
                            <svg className="w-10 h-10 text-indigo-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd"></path></svg>
                         </div>
                      </div>
                      <h3 className="text-sm font-bold tracking-widest text-indigo-900 uppercase">Certificate of Completion</h3>
                      <p className="text-xs text-gray-500 mt-1">Decentralized Internship Evaluation System</p>
                    </div>

                    {/* Certificate Body */}
                    <div className="flex-grow text-center flex flex-col justify-center">
                       <p className="italic text-gray-600 mb-2">This NFT certifies that the wallet</p>
                       <p className="font-mono bg-gray-100 border border-gray-200 py-2 px-3 rounded-lg text-sm text-gray-800 break-all mb-4 shadow-sm">
                          {account}
                       </p>
                       <p className="text-gray-700 leading-relaxed mb-6">
                          has successfully completed the tripartite requirements involving the <span className="font-semibold">Company Validation</span> and <span className="font-semibold">Academic Review</span>.
                       </p>
                    </div>

                    {/* Certificate Footer */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between shadow-sm">
                       <div>
                         <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Blockchain Verification</p>
                         <p className="font-mono text-indigo-700 font-bold">Token ID: #{internshipId}</p>
                       </div>
                       <a 
                         href={`https://ipfs.io/ipfs/${internshipDetails.reportIPFSHash.startsWith('QmMockHash') ? 'QmRA3NWM82ZGynMbYzAgYTSXCVM14Wx1RZ8fKP42G6gjgj' : internshipDetails.reportIPFSHash}`} 
                         target="_blank" 
                         rel="noreferrer"
                         className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm font-medium transition shadow-md hover:shadow-lg"
                       >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                         View Evidence
                       </a>
                    </div>
                 </div>
               ) : (
                 <div className="bg-gradient-to-br from-indigo-900 to-purple-800 rounded-2xl p-8 text-white flex flex-col items-center justify-center text-center shadow-lg h-full">
                  <svg className="w-16 h-16 text-indigo-400/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h3 className="text-xl font-medium mb-2 opacity-80">Certificate Locked</h3>
                  <p className="text-indigo-200 text-sm opacity-80">Complete both Company and Supervisor validations to mint your NFT diploma.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
           <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
           <h3 className="text-lg font-medium text-gray-900">No Internship Found</h3>
           <p className="text-gray-500">Your connected wallet address is not currently assigned to any active internship. Contact your University Admin.</p>
        </div>
      )}

      {txHash && (
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg max-w-xl">
          <p className="text-xs text-gray-500 font-mono break-all">Tx Hash: {txHash}</p>
        </div>
      )}
    </div>
  );
}
