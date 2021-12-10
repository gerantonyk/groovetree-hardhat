const hre = require("hardhat");

/**
 * Run: 
 * npx hardhat run --network <your-network> scripts/deploy.js
 */
async function main() {
  const MusicNFT = await hre.ethers.getContractFactory("MusicNFT");
  const nft = await MusicNFT.deploy();

  await nft.deployed();

  console.log("MusicNFT deployed to:", nft.address);

  const Market = await hre.ethers.getContractFactory("Market");
  const market = await Market.deploy();

  await market.deployed();

  console.log("Market deployed to:", market.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
  