const hre = require("hardhat");

async function main() {
  const MusicNFT = await hre.ethers.getContractFactory("MusicNFT");
  const nft = await MusicNFT.deploy();
  await nft.deployed();
  console.log("MusicNFT deployed to:", nft.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
