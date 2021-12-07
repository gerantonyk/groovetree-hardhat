const { expect, assert } = require("chai");
const { parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

describe("Market", function () {
  let marketOwner, address1, address2, nft,nft2, market;
  let MusicNFT, Market;
  let tokenUri,royalty,tokenId;
  before(async () => {
    [marketOwner,address1] = await ethers.getSigners();

    MusicNFT = await ethers.getContractFactory("MusicNFT");
    nft = await MusicNFT.deploy();
    await nft.deployed();

    console.log("NFT deployed to:", nft.address);

    console.log
    Market = await ethers.getContractFactory("Market");
    market = await Market.deploy(nft.address);
    await market.deployed();

    console.log("Market deployed to:", market.address);

    tokenUri ="https://gateway.ipfs.io/ipfs/tokenURI0";
    royalty = '15'; //Anything in JS that is passed to Solidity needs to be a BigNumber
    const tx = await nft.createSong(tokenUri, royalty);
    const receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === 'TokenCreated');
    tokenId = event.args[0].toNumber();
  });

  it("should create a new market with the nft address", async function () {
    // console.log( await market.NFT())
    assert.equal(await market.NFT(), nft.address);
  });

  describe("listToken", function() {

    it("shouldn't list a token without approval",async function() {
      await expect(market.listToken(tokenId,parseEther('2'))).to.be.reverted
    })

    it("should list a token with approval",async function() {
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      const owner = await nft.ownerOf(tokenId)
      assert.equal(owner.toString(),market.address)
    })

    it("token price should be equal to 2 ethers",async function() {
      const price = await market.price(tokenId)
      assert.equal(price.toString(),parseEther('2'))
    })

    it("token seller should be the original owner",async function() {
      const seller = await market.seller(tokenId)
      assert.equal(seller.toString(),marketOwner.address)
    })
    
    it("token should be on sale",async function() {
      const onSale = await market.onSale(tokenId)
      assert.equal(onSale,true)
    })
  })

  describe("changeNFTAddress", function() {
    before(async () => {
      nft2 = await MusicNFT.deploy();
      await nft2.deployed();
    })
    it("shouldn't change NFT address if the caller is not the owner", async function(){
      await expect(market.connect(address1).changeNFTAddress(nft2.address)).to.be.reverted
    })

    it("should change the address of the nft contract in the market", async function(){
      await market.changeNFTAddress(nft2.address)
      assert.equal(await market.NFT(),nft2.address)
    })
  })




});