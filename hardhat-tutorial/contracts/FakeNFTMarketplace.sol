// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FakeNFTMarketplace {
    ///@dev 将代币id的映射保持到所有者地址
    mapping(uint256 => address) public tokens;
    ///@dev 设置每个NFT的购买价格
    uint256 nftPrice = 0.1 ether;

    ///@dev Purchase()接受ETH, 并将给定代币的所有者标记为调用者地址
    ///@param _tokensId 购买的NFT代币Id
    function purchase(uint256 _tokensId) external payable {
        require(msg.value == nftPrice , "This NFT costs 0.1 ether");
        tokens[_tokensId] = msg.sender;
    }
    
    ///@dev 返回一个NFT的价格
    function getPrice() external view returns(uint256){
        return nftPrice;
    }

    ///@dev available() 查看给定的tokenID是否已经被出售
    ///@param _tokenId 查看的tokenId
    function available(uint256 _tokenId) external view returns(bool){
        //address(0) = 0x0000000000000000000000000000000000000000
        //这是Solidity中地址的默认值
        if(tokens[_tokenId] == address(0)){
            return true;
        }
        return false;
    }
}