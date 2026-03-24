const hre = require("hardhat");

async function main() {
  const [admin, company, supervisor] = await hre.ethers.getSigners();
  
  const InternshipSystem = await hre.ethers.getContractFactory("InternshipSystem");
  
  console.log("Deploying InternshipSystem...");
  const internshipSystem = await InternshipSystem.deploy();
  await internshipSystem.waitForDeployment();

  const address = await internshipSystem.getAddress();
  console.log(`InternshipSystem deployed to: ${address}`);
  
  console.log("Setting up roles & Company Whitelist...");
  const tx = await internshipSystem.whitelistCompany(company.address);
  await tx.wait();
  console.log(`- Company ${company.address} whitelisted for KYB.`);

  const COMPANY_ROLE = await internshipSystem.COMPANY_ROLE();
  const SUPERVISOR_ROLE = await internshipSystem.SUPERVISOR_ROLE();
  
  await internshipSystem.grantRole(COMPANY_ROLE, company.address);
  await internshipSystem.grantRole(SUPERVISOR_ROLE, supervisor.address);
  
  console.log("Security Setup Complete. Ready for Production test.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
