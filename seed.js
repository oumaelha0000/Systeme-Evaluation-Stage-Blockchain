// Removed dotenv
const { ethers } = require("ethers");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545/");
  const signer = await provider.getSigner(0); // Account 0 (Admin)
  
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const abi = require("./frontend/src/lib/InternshipSystem.json").abi;
  const contract = new ethers.Contract(contractAddress, abi, signer);

  // Assign roles
  const COMPANY_ROLE = ethers.id("COMPANY_ROLE");
  const SUPERVISOR_ROLE = ethers.id("SUPERVISOR_ROLE");
  
  const accounts = await provider.listAccounts();
  const companyAddress = accounts[1].address;
  const supervisorAddress = accounts[2].address;
  const studentAddress = accounts[3].address;

  console.log("Setting up roles...");
  let tx = await contract.grantRole(COMPANY_ROLE, companyAddress);
  await tx.wait();
  console.log(`Granted COMPANY_ROLE to ${companyAddress}`);

  tx = await contract.grantRole(SUPERVISOR_ROLE, supervisorAddress);
  await tx.wait();
  console.log(`Granted SUPERVISOR_ROLE to ${supervisorAddress}`);

  // Create internship
  console.log("Creating internship...");
  tx = await contract.createInternship(studentAddress, companyAddress, supervisorAddress);
  await tx.wait();
  console.log(`Internship created for Student ${studentAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
