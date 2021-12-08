// contracts/GameItem.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MusicNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Market is Ownable {

    struct Offer {
        address bidder;
        uint amount;
    }

    address constant zeroAddress = address(0);
    MusicNFT public NFT;
    mapping(uint=>address) public seller;
    mapping(uint=>uint) public price;
    mapping(uint=>bool) public onSale;
    mapping(uint=>Offer[]) public offers;

    event TokenListed(uint256 indexed index, address owner,uint price);
    event OfferMade (uint256 indexed index, address bidder,uint price) ;

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

    function makeOffer(uint tokendId ) payable external {
        //add that if the offer is higher than the price, it should do a buyNFT intead
        Offer memory offer = Offer(msg.sender,msg.value);
        offers[tokendId].push(offer);
        emit OfferMade(tokendId,msg.sender,msg.value);
    }

    function cancelSale(uint tokendId) external {
        require(msg.sender == seller[tokendId]);
        Offer[] storage tokenOffers = offers[tokendId];
        uint len = tokenOffers.length;
        for(uint i;i<len;i++) {
           payable(tokenOffers[i].bidder).transfer(tokenOffers[i].amount);
        }
        NFT.transferFrom(address(this),seller[tokendId], tokendId);

    }

    //withdraw offer

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
