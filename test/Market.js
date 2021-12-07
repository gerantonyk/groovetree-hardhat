const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("Market", function () {
  let MarketOwner, address1, address2, nft,nft2, market;
  let MusicNFT, Market;
  beforeEach(async () => {
    [MarketOwner,address1] = await ethers.getSigners();

    MusicNFT = await ethers.getContractFactory("MusicNFT");
    nft = await MusicNFT.deploy();
    await nft.deployed();

    console.log("NFT deployed to:", nft.address);

    console.log
    Market = await ethers.getContractFactory("Market");
    market = await Market.deploy(nft.address);
    await market.deployed();

    console.log("Market deployed to:", market.address);
  });

  it("should create a new market with the nft address", async function () {
    // console.log( await market.NFT())
    assert.equal(await market.NFT(), nft.address);
  });

  describe("changeNFTAddress", function() {
    before(async () => {
      nft2 = await MusicNFT.deploy();
      await nft2.deployed();
      console.log("NFT2 deployed to:", nft2.address);
    })
    it("shouldn't change NFT address if the caller is not the owner", async function(){
      await expect(market.connect(address1).changeNFTAddress(nft2.address)).to.be.reverted
    })

    it("should change the address of the nft contract in the market", async function(){
      await market.changeNFTAddress(nft2.address)
      assert.equal(await market.NFT(),nft2.address)
    })
  })

  describe("listToken", function() {

  })


});