const hre = require("hardhat");

async function main() {
  const [admin] = await hre.ethers.getSigners();
  
  // Use Hardhat's wrapper instead of pure ethers to ensure the Web3 provider correctly routes the Signer tx
  const contract = await hre.ethers.getContractAt("InternshipSystem", "0x5FbDB2315678afecb367f032d93F642f64180aa3", admin);

  const studentAddr = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  const companyAddr = "0x3C44CdDdB6a900fa2b585DD299e03d12FA4293BC";
  const supervisorAddr = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  console.log("Creating internship on-chain for Student:", studentAddr);
  
  try {
     const tx = await contract.createInternship(
       studentAddr, 
       companyAddr, 
       supervisorAddr,
       "Brave Test Internship", 
       "Testing the dashboard from Brave"
     );
     await tx.wait();
     
     const id = await contract.studentToInternship(studentAddr);
     console.log("✅ On-Chain: Internship Created for Account! ID:", id.toString());
  } catch(e) {
     if(e.message && e.message.includes("Student already has an internship")) {
         console.log("Account already has an active internship on-chain.");
     } else {
         console.error("Tx Error", e.message.slice(0, 500));
     }
  }
}

main().catch(console.error);
