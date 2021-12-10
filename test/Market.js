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
  let marketOwner, address1, address2,address3,address4, nft,nft2, market;
  let MusicNFT, Market,snapshot;
  let tokenUri,royalty,tokenId;
  before(async () => {
    [marketOwner,address1,address2,address3,address4] = await ethers.getSigners();

    MusicNFT = await ethers.getContractFactory("MusicNFT");
    nft = await MusicNFT.deploy();
    await nft.deployed();

    console.log("NFT deployed to:", nft.address);


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
    beforeEach(async function (){
      snapshot = await revertEVM(snapshot)
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
    })

    it("Shouldn't allow the same bidder to offer two times",async function() {
      await market.connect(address1).makeOffer(tokenId,{value:parseEther('1')})
      await expect(market.connect(address1).makeOffer(tokenId,{value:parseEther('1')})).to.be.reverted
    })

    it("Should register the first offer with 1 ether",async function() {
      await market.connect(address1).makeOffer(tokenId,{value:parseEther('1')})
      const offers = await market.offers(tokenId,0)
      assert.equal(offers.amount.toString(),parseEther('1'))
    })

    it("Should register the first offer from the bidder",async function() {
      await market.connect(address1).makeOffer(tokenId,{value:parseEther('1')})
      const offers = await market.offers(tokenId,0)
      assert.equal(offers.bidder.toString(),address1.address)
    })

    it("Should register a second offer from a different bidder",async function() {
      await market.connect(address1).makeOffer(tokenId,{value:parseEther('1')})
      await market.connect(address2).makeOffer(tokenId,{value:parseEther('1.5')})
      const offers = await market.offers(tokenId,1)
      assert.equal(offers.bidder.toString(),address2.address)
    })

    it("Should buy directly when the offer is higher than the price",async function() {
      await market.connect(address2).makeOffer(tokenId,{value:parseEther('2')})
      const owner = await nft.ownerOf(tokenId)
      assert.equal(owner.toString(),address2.address)
    })
  })

  describe("cancelSale", function() {
    beforeEach(async function (){
      snapshot = await revertEVM(snapshot)
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      await market.connect(address1).makeOffer(tokenId,{value:parseEther('1')})
      await market.connect(address2).makeOffer(tokenId,{value:parseEther('1.8')})
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
      await market.connect(address2).makeOffer(tokenId,{value:parseEther('1.5')})
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
    it("should return the offer to the bidders", async function(){
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

  describe("buyNFT", function() {
    beforeEach(async () => {
        snapshot = await revertEVM(snapshot)
    })
    it("shouldn't buy the nft if amount provided is less than the price", async function(){
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      await expect(market.connect(address1).buyNFT(tokenId,{value:parseEther('1')})).to.be.reverted
    })
    it("should transfer the nft if the price higher than the price", async function(){
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      await market.connect(address1).buyNFT(tokenId,{value:parseEther('2')})
      const owner = await nft.ownerOf(tokenId)
      assert.equal(owner.toString(),address1.address)
    })

    it("should transfer the price amount to the seller", async function(){
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))

      let balanceBefore1 = await ethers.provider.getBalance(marketOwner.address)
      await market.connect(address1).buyNFT(tokenId,{value:parseEther('2')})
      let balanceAfter1 = await ethers.provider.getBalance(marketOwner.address)
      let earnings = balanceAfter1.sub(balanceBefore1)
      let marketFee = await market.marketFee()
      let expectedEarnings = parseEther('2').sub(parseEther('2').mul(marketFee).div(100))
      assert.equal(earnings.toString(),expectedEarnings.toString())
    })

    it("should pay to the market the proper fee", async function(){
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      await market.connect(address1).buyNFT(tokenId,{value:parseEther('2')})
      let funds = await market.ownerFunds()
      let marketFee = await market.marketFee()
      let expectedEarnings = parseEther('2').mul(marketFee).div(100)
      assert.equal(funds.toString(),expectedEarnings.toString())
    })

    it("should return the offer to the bidders", async function(){
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      await market.connect(address3).makeOffer(tokenId,{value:parseEther('1')})
      await market.connect(address2).makeOffer(tokenId,{value:parseEther('1.8')})
      let balanceBefore2 = await ethers.provider.getBalance(address2.address)
      await market.connect(address1).buyNFT(tokenId,{value:parseEther('2')})
      let balanceAfter2 = await ethers.provider.getBalance(address2.address)
      assert.isAbove(balanceAfter2,balanceBefore2)
    })

    it("should pay to the minter royalty fee if the seller is not the minter", async function(){
      await nft.transferFrom(marketOwner.address, address3.address, tokenId);
      await nft.connect(address3).approve(market.address, tokenId);
      await market.connect(address3).listToken(tokenId,parseEther('2'))
      
      let balanceBefore1 = await ethers.provider.getBalance(marketOwner.address)
      
      await market.connect(address1).buyNFT(tokenId,{value:parseEther('2')})

      let balanceAfter1 = await ethers.provider.getBalance(marketOwner.address)
      let earnings = balanceAfter1.sub(balanceBefore1)

      let marketFee = await market.marketFee()
      let rest = parseEther('2').sub(parseEther('2').mul(marketFee).div(100))
      let expectedEarnings = rest.mul(royalty).div(100)
      assert.equal(earnings.toString(),expectedEarnings.toString())
    })

    it("should pay to the seller the price less royalty fee less marketfee if the seller is not the minter", async function(){
      await nft.transferFrom(marketOwner.address, address3.address, tokenId);
      await nft.connect(address3).approve(market.address, tokenId);
      await market.connect(address3).listToken(tokenId,parseEther('2'))
      
      let balanceBefore1 = await ethers.provider.getBalance(address3.address)
      
      await market.connect(address1).buyNFT(tokenId,{value:parseEther('2')})

      let balanceAfter1 = await ethers.provider.getBalance(address3.address)
      let earnings = balanceAfter1.sub(balanceBefore1)
      let marketFee = await market.marketFee()
      let rest = parseEther('2').sub(parseEther('2').mul(marketFee).div(100))
      let expectedEarnings = rest.mul(royalty).div(100)
      assert.equal(earnings.toString(),rest.sub(expectedEarnings))
    })   
    
    it("should pay to the minter of the v1 the royalty fee", async function(){
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      await market.connect(address3).buyNFT(tokenId,{value:parseEther('2')})
      const transaction = await nft.connect(address3).createNewV(tokenId, "testURI", '10');
      const receipt = await transaction.wait();
      const event = receipt.events.find(event => event.event === "NewVersionCreated");
      const tokenId2 = event.args[0];
      await nft.connect(address3).approve(market.address, tokenId2);
      await market.connect(address3).listToken(tokenId2,parseEther('2'))

      let balanceBefore1 = await ethers.provider.getBalance(address3.address)
      
      await market.connect(address1).buyNFT(tokenId2,{value:parseEther('2')})

      let balanceAfter1 = await ethers.provider.getBalance(address3.address)
      let earnings = balanceAfter1.sub(balanceBefore1)
      let marketFee = await market.marketFee()
      let rest = parseEther('2').sub(parseEther('2').mul(marketFee).div(100))
      let expectedEarnings = rest.mul(royalty).div(100)
      assert.equal(earnings.toString(),rest.sub(expectedEarnings).toString())
    })
   
    it("should pay to the minter of the v1 the royalty fee", async function(){
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))

      await market.connect(address1).buyNFT(tokenId,{value:parseEther('2')})
      const transaction1 = await nft.connect(address1).createNewV(tokenId, "testURI", '10');
      const receipt1 = await transaction1.wait();
      const event1 = receipt1.events.find(event => event.event === "NewVersionCreated");
      const tokenId1 = event1.args[0];
      await nft.connect(address1).approve(market.address, tokenId1);
      await market.connect(address1).listToken(tokenId1,parseEther('2'))

      await market.connect(address2).buyNFT(tokenId1,{value:parseEther('2')})
      const transaction2 = await nft.connect(address2).createNewV(tokenId1, "testURI", '5');
      const receipt2 = await transaction2.wait();
      const event2 = receipt2.events.find(event => event.event === "NewVersionCreated");
      const tokenId2 = event2.args[0];
      await nft.connect(address2).approve(market.address, tokenId2);
      await market.connect(address2).listToken(tokenId2,parseEther('2'))

      let balanceBeforeo = await ethers.provider.getBalance(marketOwner.address)
      let balanceBefore1 = await ethers.provider.getBalance(address1.address)
      let balanceBefore2 = await ethers.provider.getBalance(address2.address)
      
      await market.connect(address3).buyNFT(tokenId2,{value:parseEther('2')})

      let balanceAftero = await ethers.provider.getBalance(marketOwner.address)
      let balanceAfter1 = await ethers.provider.getBalance(address1.address)
      let balanceAfter2 = await ethers.provider.getBalance(address2.address)
      
      assert.isAbove(balanceAftero,balanceBeforeo)
      assert.isAbove(balanceAfter1,balanceBefore1)
      assert.isAbove(balanceAfter2,balanceBefore2)
    })

    it("tokenId should not be on sale after being sold", async function() {
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))

      await market.connect(address1).buyNFT(tokenId,{value:parseEther('2')})
      const onSale = await market.onSale(tokenId)
      assert.equal(onSale,false)
      const seller = await market.seller(tokenId)
      assert.equal(seller.toString(),'0x'+'0'.repeat(40))
      const price = await market.price(tokenId)
      assert.equal(price.toString(),'0')
    })
  })

  describe("acceptOffer", function() {
    beforeEach(async function (){
      snapshot = await revertEVM(snapshot)
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      await market.connect(address1).makeOffer(tokenId,{value:parseEther('1')})
      await market.connect(address2).makeOffer(tokenId,{value:parseEther('1.5')})
      await market.connect(address3).makeOffer(tokenId,{value:parseEther('1.5')})
    })

    it("only the seller should be able to accept offers", async function(){
      await expect(market.connect(address3).acceptOffer(tokenId, address3.address)).to.be.reverted
    })

    it("should transfer the token to the bidder when an offer is accepted", async function(){
      await market.acceptOffer(tokenId, address3.address)
      const owner = await nft.ownerOf(tokenId)
      assert.equal(owner.toString(),address3.address)   
    })

    it("should pay to the seller the offer amount", async function(){
      let balanceBeforeo = await ethers.provider.getBalance(marketOwner.address)
      let tx = await market.acceptOffer(tokenId, address3.address)
      const receipt = await tx.wait()
      let balanceAftero = await ethers.provider.getBalance(marketOwner.address)
      let earnings = balanceAftero.sub(balanceBeforeo)
      let total = earnings.add(tx.gasPrice.mul(receipt.gasUsed))
      let marketFee = await market.marketFee()
      let expectedEarnings = parseEther('1.5').sub(parseEther('1.5').mul(marketFee).div(100))
      assert.equal(total.toString(),expectedEarnings.toString())
    })

    it("should pay to the market the proper fee", async function(){
      await market.acceptOffer(tokenId, address3.address)
      let funds = await market.ownerFunds()
      let marketFee = await market.marketFee()
      let expectedEarnings = parseEther('1.5').mul(marketFee).div(100)
      assert.equal(funds.toString(),expectedEarnings.toString())
    })
    it("should return the offer to the bidders", async function(){
      let balanceBefore2 = await ethers.provider.getBalance(address2.address)
      await market.acceptOffer(tokenId, address3.address)
      let balanceAfter2 = await ethers.provider.getBalance(address2.address)
      assert.isAbove(balanceAfter2,balanceBefore2)
    })
    it("shouldn't return the offer to the accepted bidder", async function(){
      let balanceBefore3 = await ethers.provider.getBalance(address3.address)
      await market.acceptOffer(tokenId, address3.address)
      let balanceAfter3 = await ethers.provider.getBalance(address3.address)
      assert.equal(balanceAfter3.toString(),balanceBefore3.toString())
    })    

    it("the offers array should be empty", async function(){
      await market.acceptOffer(tokenId, address3.address)
      offers = await market.getOffers(tokenId)
      assert.equal(offers.length,0)
    })    
  })

  describe("withdrawFunds", function() {
    beforeEach(async function (){
      snapshot = await revertEVM(snapshot)
      await nft.approve(market.address, tokenId);
      await market.listToken(tokenId,parseEther('2'))
      await market.connect(address1).buyNFT(tokenId,{value:parseEther('20')})
    })
    it("only the owner should be able to retrieve funds", async function(){
      await expect(market.connect(address3).withdrawFunds(parseEther('5'))).to.be.reverted
    })   
    it("shouldn't be able to withdraw more than the funds in the smart contract", async function(){
      await expect(market.connect(address3).withdrawFunds(parseEther('25'))).to.be.reverted
    })  
    it("should transfer the funds", async function(){
      let balanceBeforeo = await ethers.provider.getBalance(marketOwner.address)
      let tx = await market.withdrawFunds(parseEther('0.1'))
      let receipt = await tx.wait()
      let balanceAftero = await ethers.provider.getBalance(marketOwner.address)
      let totalAfter = balanceAftero.add(tx.gasPrice.mul(receipt.gasUsed))
      let totalBefore = balanceBeforeo.add(parseEther('0.1'))

      assert.equal(totalAfter.toString(),totalBefore.toString())
    })   
    
    it("should update the funds tracker in the smart contract", async function(){
      let balanceBeforeo = await market.ownerFunds()
      let tx = await market.withdrawFunds(parseEther('0.1'))
      let balanceAftero = await market.ownerFunds()
      assert.isBelow(balanceAftero,balanceBeforeo)
    })
  })
});

