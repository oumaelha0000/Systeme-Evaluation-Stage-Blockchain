const hre = require("hardhat");

async function main() {
  await hre.run("compile");
  const failures = await hre.run("test");
  process.exitCode = failures;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
