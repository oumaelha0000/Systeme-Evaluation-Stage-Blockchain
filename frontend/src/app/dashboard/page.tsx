"use client";

import { useWeb3 } from "@/contexts/Web3Context";
import { useEffect, useState } from "react";
import AdminPanel from "@/components/RolePanels/AdminPanel";
import CompanyPanel from "@/components/RolePanels/CompanyPanel";
import SupervisorPanel from "@/components/RolePanels/SupervisorPanel";
import StudentPanel from "@/components/RolePanels/StudentPanel";
import ProfileSetupModal from "@/components/ProfileSetupModal";
import Link from "next/link";
import { ethers } from "ethers";

export default function Dashboard() {
  const { account, contract, chainId } = useWeb3();
  const [role, setRole] = useState<"ADMIN" | "COMPANY" | "SUPERVISOR" | "STUDENT" | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const switchNetwork = async () => {
    setIsSwitching(true);
    try {
      if (!(window as any).ethereum) throw new Error("No crypto wallet found");
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x7a69" }], // 31337 in hex
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x7a69",
                chainName: "Hardhat Local",
                rpcUrls: ["http://127.0.0.1:8545"],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add network", addError);
        }
      } else {
        console.error("Failed to switch network", switchError);
      }
    } finally {
      setIsSwitching(false);
    }
  };

  useEffect(() => {
    async function fetchRole() {
      if (!account || !contract) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const DEFAULT_ADMIN_ROLE = ethers.zeroPadValue("0x00", 32);
        const COMPANY_ROLE = ethers.id("COMPANY_ROLE");
        const SUPERVISOR_ROLE = ethers.id("SUPERVISOR_ROLE");

        const isAdmin = await contract.hasRole(DEFAULT_ADMIN_ROLE, account);
        if (isAdmin) {
          setRole("ADMIN");
          return;
        }

        const isCompany = await contract.hasRole(COMPANY_ROLE, account);
        if (isCompany) {
          setRole("COMPANY");
          return;
        }

        const isSupervisor = await contract.hasRole(SUPERVISOR_ROLE, account);
        if (isSupervisor) {
          setRole("SUPERVISOR");
          return;
        }

        // If not any of the above, we assume they are a Student checking their internship
        const hasInternship = await contract.studentToInternship(account);
        if (Number(hasInternship) > 0) {
          setRole("STUDENT");
          return;
        }

        setRole(null);
      } catch (err) {
        // contract call failed (likely because contract not deployed or network mismatch)
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    if (process.env.NEXT_PUBLIC_MOCK_ROLE) {
      setRole(process.env.NEXT_PUBLIC_MOCK_ROLE as any);
      setLoading(false);
      return;
    }

    fetchRole();
  }, [account, contract]);

  // After role is known, check if the user has completed their profile
  useEffect(() => {
    async function checkProfile() {
      if (!account || !role) return;
      try {
        const res = await fetch(`/api/users/profile?address=${account}`);
        const user = await res.json();
        if (!user || !user.name) {
          setShowProfileSetup(true);
        }
      } catch (e) {
        console.error("Profile check failed", e);
      }
    }
    checkProfile();
  }, [account, role]);

  if (!account && !process.env.NEXT_PUBLIC_MOCK_ROLE) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-gray-50">
        <div className="text-center p-12 bg-white rounded-xl shadow-lg border border-gray-100 max-w-lg">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Please connect your wallet</h2>
          <p className="text-gray-500 mb-8">You need to connect your Web3 wallet to access the dashboard.</p>
          <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Go back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (chainId !== 31337 && !process.env.NEXT_PUBLIC_MOCK_ROLE) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-gray-50">
        <div className="text-center p-12 bg-white rounded-xl shadow-lg border border-red-100 max-w-lg">
          <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Wrong Network!</h2>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Your MetaMask is connected to <b>Chain ID {chainId}</b> instead of the Hardhat Local node. Because of this, it cannot find the Smart Contract.
          </p>
          <div className="text-left bg-gray-100 p-4 rounded-lg text-sm mb-8">
            <p className="font-semibold mb-2">Smart Fix:</p>
            <p className="text-gray-700 mb-4">Click the button below to have MetaMask automatically add and switch to the correct local network.</p>
            <button 
              onClick={switchNetwork}
              disabled={isSwitching}
              className="w-full px-4 py-3 bg-indigo-600 font-semibold text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:bg-indigo-400"
            >
              {isSwitching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Switching...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Switch to Hardhat Network
                </>
              )}
            </button>
          </div>
          <Link href="/" className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition w-full block">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Profile Setup Modal — shown on first login if name is empty */}
      {showProfileSetup && account && role && (
        <ProfileSetupModal
          account={account}
          role={role}
          onComplete={() => setShowProfileSetup(false)}
        />
      )}
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-blue-900 hidden sm:block">
            Internship Evaluator
          </Link>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-full uppercase tracking-wider">
            {role || "Unregistered"} Dashboard
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1 rounded-md border border-gray-200">
            {account?.slice(0, 6)}...{account?.slice(-4)}
          </span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-8 pt-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {role === "ADMIN" && <AdminPanel />}
            {role === "COMPANY" && <CompanyPanel />}
            {role === "SUPERVISOR" && <SupervisorPanel />}
            {role === "STUDENT" && <StudentPanel />}
            
            {!role && (
              <div className="text-center py-16">
                <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900">Access Denied</h3>
                <p className="mt-2 text-gray-500 max-w-sm mx-auto">
                  Your address {account} does not have any authorized roles assigned to it or is not linked to any active internship.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
