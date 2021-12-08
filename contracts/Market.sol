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
    //delete keywork
    //address constant zeroAddress = address(0);
    
    MusicNFT public NFT;
    mapping(uint=>address) public seller;
    mapping(uint=>uint) public price;
    mapping(uint=>bool) public onSale;
    mapping(uint=>Offer[]) public offers;
    uint8 public marketFee = 10;//%
    uint8 public maxOffers = 20;//%

    event TokenListed(uint256 indexed index, address owner,uint price);
    event OfferMade (uint256 indexed index, address bidder,uint price);

    constructor(address NFTAddress) {
        NFT = MusicNFT(NFTAddress);
    }

    function changeNFTAddress(address NFTAddress) external onlyOwner{
        NFT = MusicNFT(NFTAddress);
    }

    function changeMaxOffers(uint8 _maxOffers) external onlyOwner{
        maxOffers = _maxOffers;
    }

    function changeMarketFee(uint8 _marketFee) external onlyOwner{
        marketFee = _marketFee;
    }

    function listToken(uint tokenId, uint _price) external {
        NFT.transferFrom(msg.sender, address(this), tokenId);
        seller[tokenId] = msg.sender;
        price[tokenId] = _price;
        onSale[tokenId] = true;
        emit TokenListed(tokenId,msg.sender,_price);
    }

    function makeOffer(uint tokenId ) payable external {
        //add that if the offer is higher than the price, it should do a buyNFT intead
        require(msg.value>0);
        Offer memory offer = Offer(msg.sender,msg.value);
        offers[tokenId].push(offer);
        emit OfferMade(tokenId,msg.sender,msg.value);
    }

    function cancelSale(uint tokenId) external {
        require(msg.sender == seller[tokenId]);
        Offer[] storage tokenOffers = offers[tokenId];
        uint len = tokenOffers.length;
        require(len>=maxOffers);
        for(uint i;i<len;i++) {
            if (tokenOffers[i].bidder>address(0)) {
                payable(tokenOffers[i].bidder).transfer(tokenOffers[i].amount);
                delete tokenOffers[i];
            }
        }
        NFT.transferFrom(address(this),seller[tokenId], tokenId);
    }

    function withdrawOffer(uint tokenId) external {
        Offer[] storage tokenOffers = offers[tokenId];
        uint len = tokenOffers.length;
        for(uint i;i<len;i++) {
            if (tokenOffers[i].bidder==msg.sender) {
                payable(tokenOffers[i].bidder).transfer(tokenOffers[i].amount);
                delete tokenOffers[i];
                return;
            }
        }
    }
    

    function buyNFT(uint tokenId) external payable {
        require(msg.value==price[tokenId]);
        require(onSale[tokenId]);
        _payRoyalties(tokenId,  price[tokenId]);
        NFT.transferFrom(address(this),msg.sender, tokenId);
    }

    function _payRoyalties(uint tokenId, uint _price) private  {
        uint priceWithoutFee = _price*(1 - marketFee/100);
        uint childToken = tokenId;
        uint royaltyAmount;
        uint rest = priceWithoutFee ;
        while(NFT.parent(childToken)>0) {
            childToken = NFT.parent(childToken);
            royaltyAmount = priceWithoutFee*NFT.royalty(childToken)/100;
            rest = rest - royaltyAmount;
            payable(NFT.minter(childToken)).transfer(royaltyAmount);
        }
        //check if the seller is equal to the minter
        //if the seller is not the minter, the minter should take their royalties
        //if the seller is the minter the rest is going to be transfer to them
        if(NFT.minter(tokenId)!=seller[tokenId]) {
            royaltyAmount = priceWithoutFee*NFT.royalty(tokenId)/100;
            rest = rest - royaltyAmount;
            payable(NFT.minter(tokenId)).transfer(royaltyAmount);
        }
        payable(seller[tokenId]).transfer(rest);
    }

    function acceptOffer(uint tokenId, address bidderAddress) external{
        require(msg.sender == seller[tokenId]);
        require(onSale[tokenId]);
        Offer[] storage tokenOffers = offers[tokenId];
        uint len = tokenOffers.length;
        bool offerExist;
        for(uint i;i<len;i++) {
            if (tokenOffers[i].bidder==bidderAddress) {
                offerExist = true;
                _payRoyalties(tokenId, tokenOffers[i].amount);
                NFT.transferFrom(address(this),bidderAddress, tokenId);
            } else if(tokenOffers[i].bidder>address(0)) {
                payable(tokenOffers[i].bidder).transfer(tokenOffers[i].amount);
            }
            delete tokenOffers[i];
        }
        require(offerExist); 
    }
}


/* flow:
buyer makes an offer;
owner accepts the offer and approves;
buyer can transfer to himself the v1 o create a v2 linked to the previos token;
if he creates a v2 v1 is burnt;
*/
