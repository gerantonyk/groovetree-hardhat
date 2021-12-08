const { expect, assert } = require("chai");
const { parseEther } = require("ethers/lib/utils");
const { ethers } = require("hardhat");


async function  revertEVM(snapshot) {
  const result= await network.provider.request({
    method: 'evm_revert',
    params: [snapshot],
  });
  // console.log(result)
  const newSnapshot = await network.provider.request({
    method: 'evm_snapshot',
    params: [],
  });

  return newSnapshot
}

describe("Market", function () {
  let marketOwner, address1, address2,address3, nft,nft2, market;
  let MusicNFT, Market,snapshot;
  let tokenUri,royalty,tokenId;
  before(async () => {
    [marketOwner,address1,address2,address3] = await ethers.getSigners();

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
    royalty = '15'; 
    const tx = await nft.createSong(tokenUri, royalty);
    const receipt = await tx.wait();
    const event = receipt.events.find(event => event.event === 'TokenCreated');
    tokenId = event.args[0].toNumber();

    snapshot = await network.provider.request({
      method: 'evm_snapshot',
      params: [],
    });
  });


  it("should create a new market with the nft address", async function () {
    // console.log( await market.NFT())
    assert.equal(await market.NFT(), nft.address);
  });

  describe("listToken", function() {
    beforeEach(async function() {
      snapshot = await revertEVM(snapshot)
    })

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
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      const price = await market.price(tokenId)
      assert.equal(price.toString(),parseEther('2'))
    })

    it("token seller should be the original owner",async function() {
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      const seller = await market.seller(tokenId)
      assert.equal(seller.toString(),marketOwner.address)
    })
    
    it("token should be on sale",async function() {
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      const onSale = await market.onSale(tokenId)
      assert.equal(onSale,true)
    })
  })

  describe("makeOffer", function() {
    it("Should register the first offer with 1 ether",async function() {
      await market.connect(address1).makeOffer(tokenId,{value:parseEther('1')})
      const offers = await market.offers(tokenId,0)
      assert.equal(offers.amount.toString(),parseEther('1'))
    })

    it("Should register the first offer from the bidder",async function() {
      const offers = await market.offers(tokenId,0)
      assert.equal(offers.bidder.toString(),address1.address)
    })

    it("Should register a second offer from a different bidder",async function() {
      await market.connect(address2).makeOffer(tokenId,{value:parseEther('1.5')})
      const offers = await market.offers(tokenId,1)
      assert.equal(offers.bidder.toString(),address2.address)
    })
  })

  describe("cancelSale", function() {
    beforeEach(async function (){
      snapshot = await revertEVM(snapshot)
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      await market.connect(address1).makeOffer(tokenId,{value:parseEther('1')})
      await market.connect(address2).makeOffer(tokenId,{value:parseEther('2')})
      await market.connect(address3).makeOffer(tokenId,{value:parseEther('1.5')})
    })
    it("only the seller should be able to cancel the sale", async function() {
      await expect(market.connect(address1).cancelSale(tokenId)).to.be.reverted
    })
    it("should return the funds to the bidders", async function() {
      let balanceBefore1 = await ethers.provider.getBalance(address1.address)
      let balanceBefore2 = await ethers.provider.getBalance(address2.address)
      let balanceBefore3 = await ethers.provider.getBalance(address3.address)
      await market.cancelSale(tokenId)
      let balanceAfter1 = await ethers.provider.getBalance(address1.address)
      let balanceAfter2 = await ethers.provider.getBalance(address2.address)
      let balanceAfter3 = await ethers.provider.getBalance(address3.address)

      assert.isAbove(balanceAfter1,balanceBefore1)
      assert.isAbove(balanceAfter2,balanceBefore2)
      assert.isAbove(balanceAfter3,balanceBefore3)
    })

    it("offers should be an empty array", async function() {
      await market.cancelSale(tokenId)
      offers = await market.getOffers(tokenId)
      assert.equal(offers.length,0)
    })

    it("Seller should have the token back", async function() {
      await market.cancelSale(tokenId)
      const owner = await nft.ownerOf(tokenId)
      assert.equal(owner.toString(),marketOwner.address)
    })

    
    it("tokenId should not be on sale after the cancel", async function() {
      await market.cancelSale(tokenId)
      const onSale = await market.onSale(tokenId)
      assert.equal(onSale,false)
      const seller = await market.seller(tokenId)
      assert.equal(seller.toString(),'0x'+'0'.repeat(40))
      const price = await market.price(tokenId)
      assert.equal(price.toString(),'0')
    })
  })

  describe("withdrawOffer", function() {
    beforeEach(async function (){
      snapshot = await revertEVM(snapshot)
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      await market.connect(address1).makeOffer(tokenId,{value:parseEther('1')})
      await market.connect(address2).makeOffer(tokenId,{value:parseEther('2')})
    })
    
    it("shouldn't do anything if the caller is not a bidder", async function() {
      let balanceBefore1 = await ethers.provider.getBalance(address1.address)
      let balanceBefore2 = await ethers.provider.getBalance(address2.address)
      let balanceBefore3 = await ethers.provider.getBalance(address3.address)
      market.connect(address3).withdrawOffer(tokenId)
      let balanceAfter1 = await ethers.provider.getBalance(address1.address)
      let balanceAfter2 = await ethers.provider.getBalance(address2.address)
      let balanceAfter3 = await ethers.provider.getBalance(address3.address)

      assert.equal(balanceAfter1.toString(),balanceBefore1.toString())
      assert.equal(balanceAfter2.toString(),balanceBefore2.toString())
      assert.equal(balanceAfter3.toString(),balanceBefore3.toString())
    })
    it("should return the offer to the bidder", async function(){
      let balanceBefore1 = await ethers.provider.getBalance(address1.address)
      await market.connect(address1).withdrawOffer(tokenId)
      let balanceAfter1 = await ethers.provider.getBalance(address1.address)
      assert.isAbove(balanceAfter1,balanceBefore1)
    })
    
    it("should have one less offer", async function(){
      offersBefore = await market.getOffers(tokenId)
      await market.connect(address1).withdrawOffer(tokenId)
      offersAfter = await market.getOffers(tokenId)
      assert.equal(offersBefore.length-1,offersAfter.length)
    })
  })

  describe("changeMaxOffers", function() {
    it("shouldn't change max number of offers if the caller is not the owner", async function(){
      await expect(market.connect(address1).changeMaxOffers('24')).to.be.reverted
    })

    it("should change the max number of offers in the market", async function(){
      await market.changeMaxOffers('25')
      assert.equal(await market.maxOffers(),'25')
    })
  })

  describe("changeMarketFee", function() {
    it("shouldn't change market fee if the caller is not the owner", async function(){
      await expect(market.connect(address1).changeMarketFee('11')).to.be.reverted
    })

    it("should change the market fee", async function(){
      await market.changeMarketFee('8')
      assert.equal(await market.marketFee(),'8')
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