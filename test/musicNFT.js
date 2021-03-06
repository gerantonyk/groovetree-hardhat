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
    let tokenUri1, tokenUri2; //type: string
    let royalty1, royalty2  //type: BigInt
    let tokenId1, tokenId2; //type: BigInt
    before(async () => {
      //Create song0
      tokenUri1 = "https://gateway.ipfs.io/ipfs/tokenUri1";
      royalty1 = 0n; //Anything in JS that is passed to Solidity needs to be a BigNumber
      const transaction1 = await musicNFT.createSong(tokenUri1, royalty1);
      const receipt1 = await transaction1.wait();
      const event1 = receipt1.events.filter(event => event.event === 'TokenCreated')[0];
      tokenId1 = event1.args[0];
      console.log("Token minted with ID: " + tokenId1)

      //Create song1
      tokenUri2 = "https://gateway.ipfs.io/ipfs/tokenUri2";
      royalty2 = 1n;
      const transaction2 = await musicNFT.connect(user1).createSong(tokenUri2, royalty2);
      const receipt2 = await transaction2.wait();
      const event2 = receipt2.events.filter(event => event.event === 'TokenCreated')[0];
      tokenId2 = event2.args[0];
      console.log("Token minted with ID: " + tokenId2)
    });

    it("the owner of tokenId1 should be owner", async function () {
      expect(await musicNFT.ownerOf(tokenId1)).to.equal(owner.address);
    });
    it("the tokenId1 should point to tokenUri1", async function () {
      expect(await musicNFT.tokenURI(tokenId1)).to.equal(tokenUri1);
    });
    it("the version of the tokenId1 should be 1", async function () {
      expect(await musicNFT.version(tokenId1)).to.equal(1n);
    });
    it("tokenId1 should be active", async function () {
      expect(await musicNFT.isActive(tokenId1)).to.equal(true);
    });
    it("the minter of tokenId1 should be set to owner", async function () {
      expect(await musicNFT.minter(tokenId1)).to.equal(owner.address);
    });
    it("the royalty of tokenId1 should be 0", async function () {
      expect(await musicNFT.royalty(tokenId1)).to.equal(royalty1);
    });

    describe("Creating another song with user1", function () {
      it("the minter of tokenId2 should be set to the user1", async function () {
        expect(await musicNFT.minter(tokenId2)).to.equal(user1.address);
      });
      it("the royalty of tokenId2 should be 1", async function () {
        expect(await musicNFT.royalty(tokenId2)).to.equal(royalty2);
      });
    });
  });

  describe("CreateNewV", function () {
    const parentId = 1n;
    let tokenId3;
    it("creating a new version with a parentId that doesn't exist should revert", async function () {
      const wrongParentId = 0n; //Token ID count starts at 1. So this id will never exist
      await expect(musicNFT.createNewV(wrongParentId, "testURI", 0n)).to.be.reverted; //The await needs to happen outside the expect()
    });
    it("creating a new version should make the parentId not active", async function () {
      const transaction = await musicNFT.createNewV(parentId, "testURI", 0n);
      const receipt = await transaction.wait();
      const event = receipt.events.filter(event => event.event === "NewVersionCreated")[0];
      tokenId3 = event.args[0];
      console.log("Token minted with ID: " + tokenId3)
      expect(await musicNFT.isActive(parentId)).to.equal(false);
    });
    it("creating a new version should have a version that is 1 greater than parentId", async function () {
      expect(await musicNFT.version(parentId)).to.equal(1n);
      expect(await musicNFT.version(tokenId3)).to.equal(2n);
    });
    it("after new version is made, the tokenId of the new version should be used to find the token's parent", async function () {
      expect(await musicNFT.parent(tokenId3)).to.equal(parentId)
    });
    it("creating a new version with a parentId that is not active should fail with clear error message", async function () {
      //Create a song using parent1 which was already used
      const parentId = 1n;
      await expect(musicNFT.createNewV(parentId, "testURI", 0n)).to.be.revertedWith("parentId must be active to create a new version");
    });
  });
});