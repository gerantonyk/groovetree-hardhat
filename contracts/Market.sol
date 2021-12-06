// contracts/GameItem.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MusicNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Market is Ownable {

    struct offer {
        address bidder;
        uint amount;
    }

    MusicNFT private NFT;
    mapping(uint=>address) public seller;
    mapping(uint=>uint) public price;
    mapping(uint=>bool) public onSale;
    mapping(uint=>offer[]) public offers;
    event TokenListed(uint256 indexed index, address owner,uint price);

    constructor(address _NFTAddress) {
        NFT = MusicNFT(_NFTAddress);
    }

    function changeNFTAddress(address _NFTAddress) external onlyOwner{
        NFT = MusicNFT(_NFTAddress);
    }

    function listToken(uint _tokenId, uint _price) external {
        NFT.transferFrom(msg.sender, address(this), _tokenId);
        seller[_tokenId] = msg.sender;
        price[_tokenId] = _price;
        onSale[_tokenId] = true;
        emit TokenListed(_tokenId,msg.sender,_price);
     }

    function cancelSale(uint _tokenId) external {
        require(msg.sender == seller[_tokenId]);
        //go tourgh the offers and return the money
        //offers[_tokenId]
        //return the token to the original owner

    }

    function makeOffer(uint _tokenId, uint _amount ) external {
        //add the offer to the array
    }

    function buyNFT(uint _tokenId) external payable {
        require(msg.value==price[_tokenId]);
        require(onSale[_tokenId]);
        // if (NFT.version(_tokenId)==1){

        // }
        //add the logic for the transfer trougth the royalties
        //go tourgh the offers and return the money
    }

    function acceptOffer(uint _tokenId, address bidderAddress) external{
        require(msg.sender == seller[_tokenId]);
        //transfer the token to the bidder
        //transfer eth from the bidder's offer
        //offers[_tokenId]
        //go tourgh the offers and return the money to the rest
    }
}


/* flow:
buyer makes an offer;
owner accepts the offer and approves;
buyer can transfer to himself the v1 o create a v2 linked to the previos token;
if he creates a v2 v1 is burnt;
*/
