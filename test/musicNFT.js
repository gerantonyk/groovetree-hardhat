const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("MusicNFT", function () {
  let owner, user1, user2;
  let musicNFT;
  before(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    const MusicNFTFactory = await ethers.getContractFactory("MusicNFT");
    musicNFT = await MusicNFTFactory.deploy();
    await musicNFT.deployed(); //TODO: You can put a listener on the contract itself to listen to events: https://docs.ethers.io/v5/api/contract/example/#erc20-events
  });

  describe("CreateSong", function () {
    let tokenUri0, tokenUri1; //type: string
    let royalty0, royalty1  //type: BigInt
    let tokenId0, tokenId1; //type: BigInt
    before(async () => {
      //Create song0
      tokenUri0 = "https://gateway.ipfs.io/ipfs/tokenURI0";
      royalty0 = 0n; //Anything in JS that is passed to Solidity needs to be a BigNumber
      const transaction0 = await musicNFT.createSong(tokenUri0, royalty0);
      const receipt0 = await transaction0.wait();
      const event0 = receipt0.events.filter(event => event.event === 'TokenCreated')[0];
      tokenId0 = event0.args[0]; //TODO: Check if this event is emitted a second time if that adds to the args array 

      //Create song1
      tokenUri1 = "https://gateway.ipfs.io/ipfs/tokenURI1";
      royalty1 = 1n;
      const transaction1 = await musicNFT.connect(user1).createSong(tokenUri1, royalty1);
      const receipt1 = await transaction1.wait();
      const event1 = receipt1.events.filter(event => event.event === 'TokenCreated')[0];
      tokenId1 = event1.args[0];
    });

    it("the owner of tokenId0 should be owner", async function () {
      expect(await musicNFT.ownerOf(tokenId0)).to.equal(owner.address);
    });
    it("the tokenId0 should point to tokenUri0", async function () {
      expect(await musicNFT.tokenURI(tokenId0)).to.equal(tokenUri0);
    });
    it("the version of the tokenId0 should be 1", async function () {
      expect(await musicNFT.version(tokenId0)).to.equal(1n);
    });
    it("tokenId0 should be active", async function () {
      expect(await musicNFT.isActive(tokenId0)).to.equal(true);
    });
    it("the minter of tokenId0 should be set to owner", async function () {
      expect(await musicNFT.minter(tokenId0)).to.equal(owner.address);
    });
    it("the royalty of tokenId0 should be 0", async function () {
      expect(await musicNFT.royalty(tokenId0)).to.equal(royalty0);
    });

    describe("Creating another song with user1", function () {
      it("the minter of tokenId1 should be set to the user1", async function () {
        expect(await musicNFT.minter(tokenId1)).to.equal(user1.address);
      });
      it("the royalty of tokenId1 should be 1", async function () {
        expect(await musicNFT.royalty(tokenId1)).to.equal(royalty1);
      });
    });
  });

  describe("CreateNewV", function () {
    it("should x,y,z", async function () {
      //TODO: implement me 
    });
  });
});