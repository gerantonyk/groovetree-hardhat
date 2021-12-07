// contracts/GameItem.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
//import "./MultiSig.sol";

contract MusicNFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter public _tokenIds;
    mapping (uint=>bool) public isActive;
    mapping (uint=>uint) public version;
    mapping (uint=>uint) public parent;
    mapping (uint=>address) public minter;
    mapping (uint=>uint) public royalty;
    uint8 topRoyalty=20;
    uint8 maxVersion=5;
    
    event TokenCreated(uint256 indexed index, address owner, string tokenU);
    constructor() ERC721("Music", "MSC") {}

    function createSong(string memory tokenURI, uint8 _royalty)
        public
        returns (uint256)
    {
        require(_royalty<=topRoyalty);
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);

        version[newItemId] = 1;
        isActive[newItemId] = true;
        minter[newItemId] = msg.sender; //Should we be using _msgSender() everywhere? 
        royalty[newItemId] = _royalty;
        emit TokenCreated(newItemId, msg.sender, tokenURI);
        return newItemId; //Other smart contracts can get this 
    }

    function createNewV(uint parentId, string memory tokenURI,uint8 _royalty) 
        external 
        returns (uint256)
    {
        require(_isApprovedOrOwner(_msgSender(), parentId), "ERC721: CreateNewV caller is not owner nor approved"); 
        uint newTokenId = createSong(tokenURI, _royalty);
        isActive[parentId] = false; 
        parent[newTokenId] = parentId;
        version[newTokenId] = version[parentId]+1;
        require(version[newTokenId]<=maxVersion);
        return newTokenId;
    }

    function transferFrom(address from, address to, uint256 tokenId) 
        public 
        virtual 
        override 
    {
        require(isActive[tokenId] == true);
        super.transferFrom(from, to, tokenId);
    }
        
    // function transfer(address to, uint256 tokenId) 
    //     public 
    //     virtual 
    //     override 
    // {
    //     require(isActive[tokenId] == true);
    //     super.transfer(to, tokenId);
    // }        
}


/* flow:
buyer makes an offer;
owner accepts the offer and approves;
buyer can transfer to himself the v1 o create a v2 linked to the previos token;
if he creates a v2 v1 is burnt;
*/
