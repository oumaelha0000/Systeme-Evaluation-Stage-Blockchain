"use client";

import ConnectWallet from "@/components/ConnectWallet";
import Link from "next/link";
import { useWeb3 } from "@/contexts/Web3Context";

export default function Home() {
  const { account } = useWeb3();

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-gray-50 text-gray-900">
      <main className="flex flex-col gap-8 row-start-2 items-center text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-900 tracking-tight">
          Internship Evaluation System
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl">
          A decentralized platform ensuring immutability, traceability, and transparency for university internship validations. Companies and Supervisors can validate reports, assigning final grades completely on-chain, and ultimately reward students with dynamic NFT Certificates.
        </p>

        <div className="mt-8 flex flex-col gap-4 items-center">
          <ConnectWallet />
          
          {account && (
            <Link
              href="/dashboard"
              className="mt-4 px-8 py-3 bg-indigo-600 text-white rounded-full font-semibold shadow hover:bg-indigo-700 transition"
            >
              Go to Dashboard
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
