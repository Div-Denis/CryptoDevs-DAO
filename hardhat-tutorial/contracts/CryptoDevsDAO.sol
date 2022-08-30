// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

//这里添加接口
/**
*IFakeNFTMarketplace的接口
 */
interface IFakeNFTMarketplace {
    /// getPrice() 从IFakeNFTMarketplace返回一个NFT的价格
    /// 返回的价格为wei
    function getPrice() external view returns (uint256);

    /// available() 返回是否已经购买了给定的_tokenID
    /// 返回一个布尔值，如果可用为true,否者为false
    function available(uint256 _tokenId) external view returns(bool);
    
    ///  purchase() 从IFakeNFTMarketplace购买的NFT
    ///  _tokenId 购买NFT的tokenId
    function purchase(uint256 _tokenId) external payable;
}


   //CryptoDevsNFT的最小接口，仅包含两个函数
interface ICryptoDevsNFT {
    // balanceOf 当前款项 返回给定地址拥有的NFT数量
    //owner 所有者 获取NFT数量的地址
    //返回NFT的数量
    function balanceOf(address owner) external view returns(uint256);
    
    /**
    *tokenOfOwnerByIndex 为所有者返回一个给定索引的tokenId
    *@param owner 所有者 获取NFT TokenId的地址
    *@param index 索引 在拥有的代币数组中获取NFT的索引
    * 返回NFT的代币
     */
    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns(uint256); 
}

contract CryptoDevsDAO is Ownable{
    //这里写代码
    
    //DAO合约需要哪些功能（核心功能）
    //1、以合同状态存储已创建的提案
    //2、允许CryptoDevs NFT的持有者创建新提案
    //3、允许CtyptoDevs NFT的持有者对提案进行投票，因为他们尚未投票，并且提案尚未通过它截止日期
    //4、允许CtyptoDevs NFT的持有者在超过截止日期后执行提案，以在提案通过时触发NFT购买
    //附加功能
    //如果需要，允许合约所有者从DAO中提取ETH
    //允许合约接受更多的EHT存款

    //建立一个Proposal的结构，其中包含所有相关信息。 Proposal 提案
    struct Proposal {
        //NFT代币Id- 如果提案通过，从FakeNFTMarketplace购买的NFT的tokenID
        uint256 nftTokenId;
        //截止日期-此提案有效之前的UNIX时间戳，提案可以在截止日期之后执行
        uint256 deadline;
        //赞成票-此提案赞成的票数
        uint256 yayVotes;
        //否决票-此提案否决的票数
        uint256 nayVotes;
        //执行 - 此提案是否已执行。在超过截止日期之前不能执行
        bool executed;
        //选民 - NFT代币Id到布尔值的映射，表示NFT是否已经被用于投票
        mapping(uint256 => bool)voters;
    }
    //创建ID到Proposal的映射
    mapping(uint => Proposal)public proposals;
    //已创建的提案数
    uint256 public numProposals;

    //实例化两个接口
    IFakeNFTMarketplace nftMarketplace;
    ICryptoDevsNFT cryptoDevsNFT;
    
    //创建一个可支付的构造函数来初始化合约
    //FakeNFTmarketplace 和 cryptoDevsNFT的实例
    //该支付允许该建造者在部署时接收ETH押金
    constructor(address _nftMarketplace, address _cryptoDevsNFT) payable{
        nftMarketplace = IFakeNFTMarketplace(_nftMarketplace);
        cryptoDevsNFT = ICryptoDevsNFT(_cryptoDevsNFT);
    }
    
    //创建一个olny函数的修饰符
    //一个至少拥有1个NFT的人才被允许
    modifier nftHolderOnly(){
        require(cryptoDevsNFT.balanceOf(msg.sender) > 0, "NOT_A_DAO_MEMBER");
        _;
    }
    
    // createProposal 允许CryptoDevsNFT持有者在DAO中创建一个新的提案
    //@param _nftTokenId 如果该提案通过，将从FakeFNTMarketplace购买的NFT的tokenId
    // 返回新创建提案的提案索引
    function createProposal(uint256 _nftTokenId) external nftHolderOnly returns(uint256){
        require(nftMarketplace.available(_nftTokenId), "NFT_NOT_FOR-SALE");
        Proposal storage proposal = proposals[numProposals];
        proposal.nftTokenId = _nftTokenId;
        //设置提案的投票截止时间为（当前时间+5分钟）
        proposal.deadline = block.timestamp + 5 minutes;

        numProposals++;
        //因为要返回索引，提案数是从1开始的，索引是从0开始，所以返回值要-1
        return numProposals - 1; 
    }
    
    //创建一个only函数的修饰符
    //如果提案的最终期限还没过，侧调用
    modifier activeProposalOnly(uint256 proposalIndex){
        require(
            proposals[proposalIndex].deadline > block.timestamp,
            "DEADLINE_EXCEEDED"
        );
        _;
    }
    
    //创建一个VOte的枚举，其中包含投票的可能选项
    enum Vote{
        YAY,// YAY = 0
        NAY // NAY = 1
    }
    
    // voteOnProsal() 允许CryptoDevsNFT持有者对积极的建议进行投票
    //@param proposalIndex 提案数组中要投票的提案的索引
    //@param vote 他们想要投票的类型
    function voteOnProposal(uint256 proposalIndex, Vote vote) external nftHolderOnly activeProposalOnly(proposalIndex){
        Proposal storage proposal = proposals[proposalIndex];
        uint256 voterNFTBalance = cryptoDevsNFT.balanceOf(msg.sender);
        uint numVotes = 0;
        
        //计算投票人拥有多少nft
        //还没有对此提案进行投票
        for(uint256 i =0 ; i < voterNFTBalance; i++){
            uint256 tokenId = cryptoDevsNFT.tokenOfOwnerByIndex(msg.sender, i);
            if(proposal.voters[tokenId] == false){
                numVotes++;
                proposal.voters[tokenId] = true;
            }
        }
        require(numVotes > 0 , "ALREADY_VOTED");

        if(vote == Vote.YAY){
            proposal.yayVotes += numVotes;
        }else{
            proposal.nayVotes += numVotes;
        }
    }

    //创造一个only函数的修饰符
    //如果超出了给定提案的最后期限，就会调用
    //如果这个提案没有被执行
    modifier inactiveProposalOnly(uint256 proposalIndex){
        require(
            proposals[proposalIndex].deadline <= block.timestamp,
            "DEADLINE_NOT_EXCEEDED"
        );
        
        require(
            proposals[proposalIndex].executed == false,
            "PROPOSAL_ALREDAY_EXECUTED"
        );
        _;
    }

    // createProposal() 允许任何CryptoDevsNFT持有者在超过最后期限后执行提案
    //@param createProposal 要提案数组中执行的提案的索引
    function executeProposal(uint256 proposalIndex) external nftHolderOnly inactiveProposalOnly(proposalIndex){
        Proposal storage proposal = proposals[proposalIndex];
        //如果赞成票多于反对票
        //就从FakeMarketplace中购买NFT
        if(proposal.yayVotes > proposal.nayVotes){
            uint256 nftPrice = nftMarketplace.getPrice();
            require(address(this).balance >= nftPrice, "NOT_ENOUGH_FUNDS");
            nftMarketplace.purchase{value:nftPrice}(proposal.nftTokenId);
        }
        proposal.executed = true;
    }   
    
    /**
    * withdrawEther() 允许合约所有者（部署者）从合约提取ETH
     */
    function withdrawEther() external onlyOwner{
        payable(owner()).transfer(address(this).balance);
    }   

    //下面两个功能允许该合约接受ETH存款
    //直接从钱包中获取，而调用函数
    receive() external payable{}

    fallback() external payable{}

}