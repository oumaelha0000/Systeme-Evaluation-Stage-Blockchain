"use client";

import { useWeb3 } from "@/contexts/Web3Context";

export default function ConnectWallet() {
  const { account, connectWallet, error } = useWeb3();

  return (
    <div className="flex flex-col items-center">
      {!account ? (
        <button
          onClick={connectWallet}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-mono border border-green-300 shadow-sm">
          Connected: {account.slice(0, 6)}...{account.slice(-4)}
        </div>
      )}
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  );
}
