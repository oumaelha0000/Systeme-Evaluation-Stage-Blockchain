const hre = require("hardhat");

async function main() {
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const InternshipSystem = await hre.ethers.getContractAt("InternshipSystem", contractAddress);
  
  const [admin, company, supervisor] = await hre.ethers.getSigners();
  
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const COMPANY_ROLE = hre.ethers.id("COMPANY_ROLE");
  const SUPERVISOR_ROLE = hre.ethers.id("SUPERVISOR_ROLE");
  
  console.log("Checking roles for address:", contractAddress);
  console.log("- Admin (Acct 0):", await InternshipSystem.hasRole(DEFAULT_ADMIN_ROLE, admin.address), admin.address);
  console.log("- Company (Acct 1):", await InternshipSystem.hasRole(COMPANY_ROLE, company.address), company.address);
  console.log("- Supervisor (Acct 2):", await InternshipSystem.hasRole(SUPERVISOR_ROLE, supervisor.address), supervisor.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
