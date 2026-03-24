const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const InternshipSystem = await hre.ethers.getContractFactory("InternshipSystem");
  
  console.log("Deploying Contract to Active Node...");
  const contract = await InternshipSystem.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log("Deployed to:", address);

  // Seed data
  const signers = await hre.ethers.getSigners();
  const companyAddress = signers[1].address;
  const supervisorAddress = signers[2].address;
  const studentAddress = signers[3].address;

  console.log("Seeding Roles and Data...");
  await (await contract.grantRole(hre.ethers.id("COMPANY_ROLE"), companyAddress)).wait();
  await (await contract.grantRole(hre.ethers.id("SUPERVISOR_ROLE"), supervisorAddress)).wait();
  await (await contract.createInternship(studentAddress, companyAddress, supervisorAddress)).wait();
  
  console.log("Seeded successfully!");

  // Overwrite Web3Context to forcibly ignore NEXT_PUBLIC_CONTRACT_ADDRESS Env var
  const contextPath = path.join(__dirname, "frontend", "src", "contexts", "Web3Context.tsx");
  if (fs.existsSync(contextPath)) {
    let content = fs.readFileSync(contextPath, "utf8");
    content = content.replace(
      /const CONTRACT_ADDRESS = [^;]+;/,
      `const CONTRACT_ADDRESS = "${address}";`
    );
    fs.writeFileSync(contextPath, content);
    console.log("Web3Context actively updated to hardcode address:", address);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
