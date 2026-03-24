const hre = require("hardhat");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const [admin, account1, company, supervisor] = await hre.ethers.getSigners();
  
  // 1. Get Contract Instances
  const Contract = await hre.ethers.getContractFactory("InternshipSystem");
  // Get deployed contract address from hardhat config or recent deploy
  const address = require("../frontend/src/contexts/Web3Context").DEFAULT_CONTRACT;
  const contract = Contract.attach(address);

  console.log("Adding Account 1 to Student Panel...");
  console.log("Using Account 1:", account1.address);
  
  // 2. Create Internship On-Chain mapping account1 -> company -> supervisor
  try {
     const tx = await contract.createInternship(
       account1.address, 
       company.address, 
       supervisor.address,
       "Security Audit Framework", // Title
       "Analysis of Zero-Knowledge Proofs in modern systems" // Description
     );
     await tx.wait();
     console.log("✅ On-Chain: Internship Created for Account 1.");
  } catch(e) {
     if(e.message.includes("Student already has an internship")) {
         console.log("Account 1 already has an active internship on-chain.");
     } else {
         console.error("Tx Error", e.message);
     }
  }

  // 3. Add to off-chain Prisma
  const prisma = new PrismaClient({datasourceUrl: "file:./dev.db"});
  try {
    // Add User
    await prisma.user.upsert({
      where: { walletAddress: account1.address.toLowerCase() },
      update: {},
      create: {
        walletAddress: account1.address.toLowerCase(),
        role: "STUDENT",
        name: "Test Student (Account 1)",
        email: "student1@university.edu"
      }
    });

    // Add Internship Details for Kanban
    const onchainID = await contract.studentToInternship(account1.address);
    if(Number(onchainID) > 0) {
      await prisma.internshipDetails.upsert({
         where: { id: Number(onchainID) },
         update: {},
         create: {
           id: Number(onchainID),
           studentAddress: account1.address.toLowerCase(),
           companyAddress: company.address.toLowerCase(),
           supervisorAddress: supervisor.address.toLowerCase(),
           title: "Security Audit Framework",
           description: "Testing",
           status: "Registered"
         }
      });
      console.log(`✅ Off-Chain (Kanban): Internship #${onchainID} registered for Account 1.`);
    }
  } catch (e) {
    console.error("Prisma error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
