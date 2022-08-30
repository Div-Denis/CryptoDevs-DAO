import { Contract, providers } from 'ethers';
import { formatEther } from 'ethers/lib/utils';
import Head from 'next/head'
import Image from 'next/image'
import { useEffect, useRef,useState } from 'react';
import { CRYPTODEVS_DAO_ABI, CRYPTODEVS_DAO_CONTRACT_ADDRESS, CRYPTODEVS_NFT_ABI, CRYPTODEVS_NFT_CONTRACT_ADDRESS } from '../constans';
import styles from '../styles/Home.module.css'
import Web3Modal from 'web3modal';

export default function Home() {
  /**
   * 状态变量
   */
  //DAO合约的ETH余额
  const [treasuryBalance, setTreasuryBalnace] = useState("0");
  //DAO合约中创建的提案数
  const [numProposals, setNumProposals] = useState("0");
  //用户的CryptoDevsNFT的余额
  const [nftBalance,setNFTBalance] = useState(0);
  //购买的fakenft代币ID，在创建提案时使用
  const [fakeNftTokenId,setFakeNftTokenId] = useState("");
  //数组，包含在DAO合约中创建的所有提案
  const [proposals,setProposals] = useState([]);
  //跟踪时创建提案还是查看提案
  const [selectedTab ,setSelectedTab] = useState("");
  //跟踪是否在加载
  const [loading, setLoading] = useState(false);
  //跟踪连接用户 ，连接上为true,否为false
  const [walletConnected,setWalletConnected] = useState(false);
  //
  const web3ModalRef = useRef();

  //连接钱包
  const connectWallet = async() =>{
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  //读取DAO合约的ETH余额，并设置状态变量为‘treasuryBalance’
  const getDaoTreasuryBalance = async () =>{
    try {
      const provider = await getProviderOrSigner();
      const balance = await provider.getBalance(
        CRYPTODEVS_DAO_CONTRACT_ADDRESS
      );
      setTreasuryBalnace(balance.toString());
    } catch (err) {
      console.error(err);
    }
  };
   
  //读取DAO合约中提案的数量，并设置numProposal状态变量
  const getNumProposalsInDAO = async () => {
    try {
      const provider = await getProviderOrSigner();
      const contract  = getDaoContractInstance(provider);
      const daoNumProposals = await contract.numProposals();
      setNumProposals(daoNumProposals.toString());
    } catch (err) {
      console.error(err);
    }
  };

  //读取用户的CryptoDevs NFTs的余额，并设置nftBalance状态变量
  const getUserNFTBalance = async () =>{
    try {
      const signer = await getProviderOrSigner(true);
      const nftContract = getCryptoDevsNFTContractInstance(signer);
      const balance = await nftContract.balanceOf(signer.getAddress());
      setNFTBalance(parseInt(balance.toString()));
    } catch (err) {
      console.error(err);
    }
  };

  //调用合约中的createProposal函数，使用fakeNFTTokenId中的tokenis
  //创建提案
  const createProposal = async () => {
    try {
      const signer = await getProviderOrSigner(true);
      const  daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.createProposal(fakeNftTokenId);
      setLoading(true);
      await txn.wait();
      await getNumProposalsInDAO();
      setLoading(false);
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  };

  //从DAO合约中获取和解析一个提案的辅助函数
  //给定提案的ID
  //并将返回的数据转换为以恶搞JAVAsCRIPT对象，该对象具有我们可以使用的值
  const fetchProposalById = async (id) =>{
    try {
      const provider = await getProviderOrSigner();
      const daoContract = getDaoContractInstance(provider);
      const proposal = await daoContract.proposals(id);
      const parsedProposal = {
        proposalId : id,
        nftTokenId: proposal.nftTokenId.toString(),
        deadline: new Date(parseInt(proposal.deadline.toString()) * 1000),
        yayVotes: proposal.yayVotes.toString(),
        nayVotes: proposal.nayVotes.toString(),
        executed: proposal.executed,
      };
      return parsedProposal;
    } catch (err) {
      console.error();
    }
  };

  //运行循环numProposals来获取DAO中的所有提案
  //并设置提案状态变量
  const fetchAllProposals = async () => {
    try {
      const proposals = [];
      for(let i = 0; i < numProposals; i++){
        const proposal = await fetchProposalById(i);
        proposals.push(proposal);
      };
      setProposals(proposals);
      return proposals;
    } catch (err) {
      console.error(err);
    }
  };

  //调用合约中的voteOnProposal函数，使用提案的ID和投票来传递
  const voteOnProposal = async (proposalId, _vote) => {
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);

      let vote = _vote === "YAY" ? 0 :1 ;
      const tsn = await daoContract.voteOnProposal(proposalId,vote);
      setLoading(true);
      await tsn.wait();
      setLoading(true);
      await fetchAllProposals();
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  };

  //调用合约中的executPropodal函数，使用proposalId传递
  const executeProposal = async (proposalId) =>{
    try {
      const signer = await getProviderOrSigner(true);
      const daoContract = getDaoContractInstance(signer);
      const txn = await daoContract.executeProposal(proposalId);
      setLoading(true);
      await txn.wait();
      setLoading(false);
      await fetchAllProposals();
    } catch (error) {
      console.error(error);
      window.alert(error.data.message);
    }
  };



  //把CryptoDAOContract的实例 封装函数
  //给个供应者/签名者
  const getDaoContractInstance = (providerOrSigner) => {
    return new Contract(
      CRYPTODEVS_DAO_CONTRACT_ADDRESS,
      CRYPTODEVS_DAO_ABI,
      providerOrSigner
    );
  };
  //把CryptoDevsNFTContract的实例 封装函数
  //给个供应者/签名者
  const getCryptoDevsNFTContractInstance = (providerOrSigner) =>{
    return new Contract(
      CRYPTODEVS_NFT_CONTRACT_ADDRESS,
      CRYPTODEVS_NFT_ABI,
      providerOrSigner
    );
  };

  //助手功能 帮助你连接钱包获取供应者或者签名的实例
  const getProviderOrSigner = async(needSigner = false) => {
     const provider = await web3ModalRef.current.connect();
     const web3Provider = new providers.Web3Provider(provider);

     const{chainId} = await web3Provider.getNetwork();
     if(chainId !== 4){
      window.alert("Please switch to the Rinkeby network!");
      throw new Error("Please switch to the Rinkeby network!");
     }

     if(needSigner){
      const signer = web3Provider.getSigner();
      return signer;
     }
     return web3Provider;
  };

  //每次WalletConnect更改时运行的代码
  //所有当钱包连接或断开时
  //如果没链接上钱包就提示用户连接钱包
  //然后调用辅助函数还获取
  //DAO的库余额，用户NFT余额，以及DAOZ中的提案数量
  useEffect(() => {
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network:"rinkeby",
        providerOptions:{},
        disableInjectedProvider:false,
      });
      //如果连接上了钱包就执行下面的代码
      connectWallet().then(() => {
        getDaoTreasuryBalance();
        getUserNFTBalance();
        getNumProposalsInDAO();
      });
    }
  },[walletConnected]);

  //这段代码在每次selectedTab的值改变时就会运行
  //用于在用户切换时重新获取DAO中的所有提议
  //到查看提案的选项卡
  useEffect(() => {
    if(selectedTab === "View Proposals"){
      fetchAllProposals();
    }
  },[selectedTab]);

  //基于‘selectedTed’渲染选择卡的内容
  function renderTabs(){
    if(selectedTab === "Create Proposals"){
      return renderCreateProposalTab();
    }else if(selectedTab === "View Proposals"){
      return rendeViewProposalsTab();
    }
    return null;
  }

  //渲染‘创建提案’标题内容
  function renderCreateProposalTab(){
    if(loading){
      return(
        <div className={styles.description}>
          Loading...Waiting for transaction...
        </div>
      );
    }else if (nftBalance === 0){
      return(
        <div className={styles.description}>
          You do mot own any CryptoDevs NFTs.<br/>
          <b>You cannot create or vote on proposals</b>
        </div>
      );
    }else{
      return(
      <div className={styles.container}>
          <label>Fake NFT Token ID to Purchase:</label>
          <input 
             placeholder = "0"
             type="number"
             onChange={(e) => setFakeNftTokenId(e.target.value)}
             />
             <button className={styles.button2} onClick={createProposal}>
              Craete
             </button>
      </div>
      );
    }
  }

  //呈现查看提案的标签内容
  function rendeViewProposalsTab(){
    if(loading){
      return(
        <div className={styles.description}>
          Loading...Waiting for transaction...
        </div>
      );
    }else if(proposals.length === 0 ){
      return(
        <div className={styles.description}>
          No proposals have been created
        </div>
      );
    }else{
      return(
        <div>
          {proposals.map((p,index) => (
              <div key={index} className = {styles.proposalCard}>
              <p>Proposal ID:{p.proposalId}</p>
              <p>Fake NFT to Purchase:{p.nftTokenId}</p>
              <p>Deadline:{p.deadline.toLocaleString()}</p>
              <p>Yay Votes:{p.yayVotes}</p>
              <p>Nay Votes:{p.nayVotes}</p>
              <p>executed?:{p.executed.toString()}</p>
              {/*截止时间还没到并且提案还没结束，查看投票的反正票数 */}
              {p.deadline.getTime() > Date.now() && ! p.executed ? (
                <div className={styles.flex}>
                  <button 
                     className={styles.button2}
                     onClick = {() => voteOnProposal(p.proposalId,"YAY")}
                     >
                      Vote YAY
                     </button>
                     <button 
                        className={styles.button2}
                        onClick={() => voteOnProposal(p.proposalId,"NAY")}
                        >
                        Vote NAY
                      </button>
                </div>
              ):p.deadline.getTime() < Date.now() && !p.executed ?(
                 <div className={styles.flex}>
                   <button 
                     className={StyleSheet.button2}
                     onClick = {() => executeProposal(p.proposalId)}
                     >
                      Executed Proposal{" "}
                      {p.yayVotes > p.nayVotes ? "(YAY)":"(NAY)"}
                     </button>
                 </div>
              ):(
                <div className={styles.description}>Proposal Executed</div>
              )}
            </div>
          ))}
        
        </div>
      );
    }
  }
  


  return (
   <div>
    <Head>
      <title>CryptoDevs DAO</title>
      <meta nam = "description" content='CryptoDevs DAO'/>
      <link rel='icon' href='/favicon.ico'/>
    </Head>

    <div className={styles.main}>
      <h1 className={styles.title}> Welcome to Crypto Devs</h1>
      <br/>
      <div className={styles.description}> Welcome to DAO</div>
      <div className={styles.description}>
        Your CryptoDevs NFC balance:{nftBalance}
        <br/>
        Treasury Balance: {treasuryBalance} ETH
        <br/>
        Total Number of Proposals:{numProposals}
      </div>
      <div className={styles.flex}>
        <button
          className={styles.button}
          onClick = {() => setSelectedTab("Create Proposals")}
          >
            Crate Proposal
          </button>
          <button 
            className={styles.button}
            onClick = {() => setSelectedTab("View Proposals")}
           >
              View Proposals
            </button>
      </div>
      {renderTabs()}
      <div>
        <img className={styles.image} src = "/cryptodevs/0.svg"/>
      </div>
    </div>

    <footer className={styles.footer}>
      Made with 😀 by Crypto Devs
    </footer>
   </div>
   
  );
}
