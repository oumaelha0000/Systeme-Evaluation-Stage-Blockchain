"use client";

import { useState } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Search, ShieldCheck, AlertTriangle, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

export default function VerifyPage() {
  const { contract } = useWeb3();
  const [tokenId, setTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null); // null = not searched, false = invalid, object = valid

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract || !tokenId) return;

    setLoading(true);
    setResult(null);

    try {
      // Because we restricted getInternship() for privacy,
      // Public Verifiers use the standard ERC721 NFT functions!
      // If the NFT hasn't been minted (not fully validated), ownerOf will revert.
      const owner = await contract.ownerOf(tokenId);
      const uri = await contract.tokenURI(tokenId);
      
      setResult({
        owner,
        uri,
        isValid: true
      });
      toast.success("Certificate Cryptographically Verified!");

    } catch (err: any) {
      console.error(err);
      setResult({ isValid: false });
      toast.error("Invalid or Pending Certificate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <ShieldCheck className="mx-auto h-16 w-16 text-indigo-600 mb-4" />
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            Public Certificate Verification
          </h1>
          <p className="text-lg text-gray-500">
            Verify the cryptographic authenticity of a student's internship diploma directly on the blockchain.
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-gray-100">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label htmlFor="tokenId" className="block text-sm font-medium text-gray-700 mb-2">
                Internship Token ID
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  min="1"
                  name="tokenId"
                  id="tokenId"
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 py-4 sm:text-lg border-gray-300 rounded-xl bg-gray-50 border outline-none transition-shadow text-gray-900"
                  placeholder="Enter Token ID (e.g. 1)"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !tokenId}
                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying with Blockchain nodes..." : "Verify Authenticity"}
              </button>
            </div>
          </form>

          {/* RESULTS AREA */}
          {result && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {result.isValid ? (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 md:p-8 shadow-inner relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                     <ShieldCheck className="w-48 h-48 text-green-600 -mr-10 -mt-10" />
                   </div>
                   
                   <div className="relative z-10 flex items-center gap-4 mb-6">
                     <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-200 text-green-600">
                       <ShieldCheck className="w-6 h-6" />
                     </div>
                     <div>
                       <h3 className="text-xl font-bold text-green-800">100% Authentic</h3>
                       <p className="text-green-600 text-sm font-medium">Verified by Smart Contract</p>
                     </div>
                   </div>

                   <div className="bg-white/60 backdrop-blur-sm rounded-xl p-5 border border-green-100 space-y-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Student Wallet Address (Owner)</p>
                        <p className="font-mono text-gray-900 break-all bg-white p-2 border border-gray-100 rounded">{result.owner}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">IPFS Immutable Record</p>
                        <a 
                          href={`https://ipfs.io/ipfs/${result.uri.startsWith('QmMockHash') ? 'QmRA3NWM82ZGynMbYzAgYTSXCVM14Wx1RZ8fKP42G6gjgj' : result.uri}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 font-mono text-indigo-600 hover:text-indigo-800 bg-white p-2 border border-indigo-100 rounded break-all transition-colors"
                        >
                          {result.uri}
                          <ExternalLink className="w-4 h-4 flex-shrink-0" />
                        </a>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                   <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                   <h3 className="text-lg font-bold text-red-800 mb-1">Invalid Certificate</h3>
                   <p className="text-red-600 text-sm">No minted NFT exists for this Token ID on the blockchain. This internship is either incomplete, fake, or the ID is incorrect.</p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center bg-gray-100 py-3 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Connected to <strong>Hardhat Local Network</strong> (Chain ID: 31337)
          </p>
        </div>
      </div>
    </div>
  );
}
