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

    address constant zeroAddress = address(0);
    MusicNFT public NFT;
    mapping(uint=>address) public seller;
    mapping(uint=>uint) public price;
    mapping(uint=>bool) public onSale;
    mapping(uint=>offer[]) public offers;
    event TokenListed(uint256 indexed index, address owner,uint price);

    constructor(address NFTAddress) {
        NFT = MusicNFT(NFTAddress);
    }

    function changeNFTAddress(address NFTAddress) external onlyOwner{
        NFT = MusicNFT(NFTAddress);
    }

    function listToken(uint tokendId, uint _price) external {
        NFT.transferFrom(msg.sender, address(this), tokendId);
        seller[tokendId] = msg.sender;
        price[tokendId] = _price;
        onSale[tokendId] = true;
        emit TokenListed(tokendId,msg.sender,_price);
     }

    function cancelSale(uint tokendId) external {
        require(msg.sender == seller[tokendId]);
        //go tourgh the offers and return the money
        //offers[tokendId]
        //return the token to the original owner

    }

    function makeOffer(uint tokendId, uint _amount ) external {
        //add the offer to the array
    }

    function buyNFT(uint tokendId) external payable {
        require(msg.value==price[tokendId]);
        require(onSale[tokendId]);
        // if (NFT.version(tokendId)==1){

        // }
        //add the logic for the transfer trougth the royalties
        //go tourgh the offers and return the money
    }

    function acceptOffer(uint tokendId, address bidderAddress) external{
        require(msg.sender == seller[tokendId]);
        //transfer the token to the bidder
        //transfer eth from the bidder's offer
        //offers[tokendId]
        //go tourgh the offers and return the money to the rest
    }
}


/* flow:
buyer makes an offer;
owner accepts the offer and approves;
buyer can transfer to himself the v1 o create a v2 linked to the previos token;
if he creates a v2 v1 is burnt;
*/
