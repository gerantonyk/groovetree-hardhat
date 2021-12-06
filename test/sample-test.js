const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("MusicNFT", function () {
  let owner, recipient;
  let token;
  before(async () => {
    [owner, recipient] = await ethers.provider.listAccounts();
    const MusicNFT = await ethers.getContractFactory("MusicNFT");
    nft = await MusicNFT.deploy();
    await nft.deployed();
  });
  it("should create a new nft", async function () {
    nft.createSong("pipistrilo");
    assert.equal(initialSupply.toString(), balance.toString());
  });

});