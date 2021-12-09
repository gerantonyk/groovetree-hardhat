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
    uint public ownerFunds;
    uint8 public marketFee = 10;//%
    uint8 public maxOffers = 20;//%

    event TokenListed(uint256 indexed index, address owner,uint price);
    event OfferMade (uint256 indexed index, address bidder,uint price);
    event SaleCanceled(uint indexed index);
    event FundsReturned(uint256 indexed index, address bidder,uint price);
    constructor(address NFTAddress) {
        NFT = MusicNFT(NFTAddress);
    }

    function withdrawFunds(uint amount) external onlyOwner {
        require(ownerFunds>=amount,'amount has to be lower than funds');
        ownerFunds -= amount;
        payable(msg.sender).transfer(amount);
    }

    function getOffers(uint tokenId) public view returns(Offer[] memory) {
        return offers[tokenId];
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
        //we should validate that there is only one offer
        //add that if the offer is higher than the price, it should do a buyNFT intead
        bool bidderExist;
        for(uint i=0; i<offers[tokenId].length;i++){
            if (offers[tokenId][i].bidder==msg.sender){
                bidderExist=true;
                break;
            }
        }
        require(bidderExist==false,'bidder alredy exist, withdraw offer first');
        require(getOffers(tokenId).length<maxOffers,'max offers reached');
        if (msg.value>=price[tokenId]){
            buyNFT(tokenId);
            return ;
        }
        require(msg.value>0,"offer should be more than 0");
        Offer memory offer = Offer(msg.sender,msg.value);
        offers[tokenId].push(offer);
        emit OfferMade(tokenId,msg.sender,msg.value);
    }

    function cancelSale(uint tokenId) external {//Sin probar
        require(msg.sender == seller[tokenId], 'only the seller can cancel the sale');
        require(onSale[tokenId], 'the token is not on sale');
        _returnFunds(tokenId);
        seller[tokenId] = zeroAddress;
        price[tokenId] = 0;
        onSale[tokenId] = false;
        emit SaleCanceled(tokenId);
        NFT.transferFrom(address(this),msg.sender, tokenId);
    }

    function withdrawOffer(uint tokenId) external {//Sin probar
        Offer[] storage tokenOffers = offers[tokenId];
        bool isBidder;
        uint len = tokenOffers.length;
        for(uint i;i<len;i++) {
            if(isBidder) {
                tokenOffers[i-1] = tokenOffers[i];
            }
            if (tokenOffers[i].bidder==msg.sender) {
                payable(tokenOffers[i].bidder).transfer(tokenOffers[i].amount);
                isBidder=true;
            }
        }
        if(isBidder) {
            tokenOffers.pop();
        }
    }
    

    function buyNFT(uint tokenId) public payable {//Sin probar
        require(msg.value>=price[tokenId],'amount should be higher than price');
        require(onSale[tokenId],'item has to be on sale');
        _payRoyalties(tokenId,  price[tokenId]);
        NFT.transferFrom(address(this),msg.sender, tokenId);

    }

    function _payRoyalties(uint tokenId, uint _price) private  {//Sin probar

        uint priceWithoutFee = _price - (_price*marketFee)/100;
        ownerFunds += _price - priceWithoutFee;

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
        _returnFunds(tokenId);
        seller[tokenId] = zeroAddress;
        price[tokenId] = 0;
        onSale[tokenId] = false;
    }

    function _returnFunds(uint tokenId) private {
        Offer[] storage tokenOffers = offers[tokenId];
        uint len = tokenOffers.length;
        for(uint i=0;i<len;i++) {
            if (tokenOffers[len-1-i].bidder>address(0)) {
                payable(tokenOffers[len-1-i].bidder).transfer(tokenOffers[len-1-i].amount);
                emit FundsReturned(tokenId,tokenOffers[len-1-i].bidder,tokenOffers[len-1-i].amount);
            }
            tokenOffers.pop();
        }
    }

    function acceptOffer(uint tokenId, address bidderAddress) external{//Sin probar
        require(msg.sender == seller[tokenId],'only the seller can accept an offer');
        require(onSale[tokenId],'item has to be on sale');
        Offer[] storage tokenOffers = offers[tokenId];
        uint len = tokenOffers.length;
        bool offerExist;
        uint amount;
        for(uint i;i<len;i++) {
            if (tokenOffers[i].bidder==bidderAddress) {
                offerExist = true;
                amount = tokenOffers[i].amount;
                tokenOffers[i].amount=0;
                tokenOffers[i].bidder=zeroAddress;
                break;
            }
        }
        if(offerExist) {
            _payRoyalties(tokenId, amount);
            NFT.transferFrom(address(this),bidderAddress, tokenId);
        }
            
    }
}


/* flow:
buyer makes an offer;
owner accepts the offer and approves;
buyer can transfer to himself the v1 o create a v2 linked to the previos token;
if he creates a v2 v1 is burnt;
*/
