const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  const accounts = hre.config.networks.hardhat?.accounts;

  console.log("====================================");
  console.log("   HARDHAT LOCAL ACCOUNTS (20)      ");
  console.log("====================================\n");

  const { ethers } = hre;
  const mnemonic = "test test test test test test test test test test test junk";
  
  for (let i = 0; i < signers.length; i++) {
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, "", `m/44'/60'/0'/0/${i}`);
    console.log(`Account #${i}`);
    console.log(`  Address:     ${signers[i].address}`);
    console.log(`  Private Key: ${wallet.privateKey}`);
    console.log();
  }
}

main().catch(console.error);
