const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const InternshipSystem = await hre.ethers.getContractFactory("InternshipSystem");
  console.log("Deploying InternshipSystem to active network...");
  
  const internshipSystem = await InternshipSystem.deploy();
  await internshipSystem.waitForDeployment();
  
  const address = await internshipSystem.getAddress();
  console.log(`\nInternshipSystem successfully deployed to: ${address}\n`);

  // Seeding the contract with initial state
  const COMPANY_ROLE = hre.ethers.id("COMPANY_ROLE");
  const SUPERVISOR_ROLE = hre.ethers.id("SUPERVISOR_ROLE");
  
  const signers = await hre.ethers.getSigners();
  const companyAddress = signers[1].address; // Account 2 in MetaMask
  const supervisorAddress = signers[2].address; // Account 3 in MetaMask
  const studentAddress = signers[3].address; // Account 4 in MetaMask

  console.log("Setting up RBAC Roles...");
  let tx = await internshipSystem.grantRole(COMPANY_ROLE, companyAddress);
  await tx.wait();
  console.log(`Granted COMPANY_ROLE to ${companyAddress}`);

  tx = await internshipSystem.grantRole(SUPERVISOR_ROLE, supervisorAddress);
  await tx.wait();
  console.log(`Granted SUPERVISOR_ROLE to ${supervisorAddress}`);

  console.log("\nCreating initial internship for testing...");
  tx = await internshipSystem.createInternship(studentAddress, companyAddress, supervisorAddress);
  await tx.wait();
  console.log("Internship created! The system is fully seeded and ready.\n");
  
  // Read and update the Web3Context.tsx file to point to this new address, ensuring hot-reload
  const contextPath = path.join(__dirname, "frontend", "src", "contexts", "Web3Context.tsx");
  if (fs.existsSync(contextPath)) {
    let content = fs.readFileSync(contextPath, "utf8");
    content = content.replace(/const CONTRACT_ADDRESS = process\.env\.NEXT_PUBLIC_CONTRACT_ADDRESS \|\| "0x[a-fA-F0-9]{40}";/, `const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "${address}";`);
    fs.writeFileSync(contextPath, content);
    console.log("Updated Web3Context.tsx with new contract address.");
  }
}

main().catch((error) => {
  console.error("Error during deploy and seed:", error);
  process.exitCode = 1;
});
