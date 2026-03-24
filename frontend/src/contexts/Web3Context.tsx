"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ethers, BrowserProvider, Contract } from "ethers";
import InternshipSystemArtifact from "../lib/InternshipSystem.json"; // We will copy this later

// Read contract address from env or replace it here
const CONTRACT_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"; // Default Hardhat local network address

interface Web3ContextType {
  provider: BrowserProvider | null;
  signer: ethers.Signer | null;
  account: string | null;
  contract: Contract | null;
  connectWallet: () => Promise<void>;
  error: string | null;
  chainId: number | null;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const connectWallet = async () => {
    try {
      if (typeof (window as any).ethereum === "undefined") {
        setError("Please install MetaMask to use this application.");
        return;
      }

      const tempProvider = new ethers.BrowserProvider((window as any).ethereum);
      setProvider(tempProvider);

      const accounts = await tempProvider.send("eth_requestAccounts", []);
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const tempSigner = await tempProvider.getSigner();
        setSigner(tempSigner);

        const tempContract = new ethers.Contract(
          CONTRACT_ADDRESS,
          InternshipSystemArtifact.abi,
          tempSigner
        );
        setContract(tempContract);
        
        const network = await tempProvider.getNetwork();
        setChainId(Number(network.chainId));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect wallet");
    }
  };

  useEffect(() => {
    // Silent auto-connect check on page load if wallet was previously authorized
    const checkConnection = async () => {
      if (typeof (window as any).ethereum !== "undefined") {
        try {
          const tempProvider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await tempProvider.send("eth_accounts", []);
          if (accounts.length > 0) {
            connectWallet(); // Session exists, auto-reconnect!
          }
        } catch (e) {
          console.error("Auto-connect failed", e);
        }
      }
    };
    
    checkConnection();

    if (typeof (window as any).ethereum !== "undefined") {
      (window as any).ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          connectWallet(); // Re-initialize signer/contract
        } else {
          setAccount(null);
          setSigner(null);
          setContract(null);
        }
      });

      (window as any).ethereum.on("chainChanged", (chainIdHex: string) => {
        setChainId(Number(chainIdHex));
        window.location.reload();
      });
    }

    return () => {
      if (typeof (window as any).ethereum !== "undefined") {
        (window as any).ethereum.removeAllListeners("accountsChanged");
        (window as any).ethereum.removeAllListeners("chainChanged");
      }
    };
  }, []);

  return (
    <Web3Context.Provider
      value={{
        provider,
        signer,
        account,
        contract,
        connectWallet,
        error,
        chainId,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
};
