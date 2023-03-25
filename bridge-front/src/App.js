import React, { useEffect, useState, useRef } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS_BSC, CONTRACT_ADDRESS_ETH, TOKEN_ADDRESS_ETH, TOKEN_ADDRESS_BSC } from "./constants"
import Bridge from "./utils/BridgeContract.json"
import TestToken from "./utils/TokenContract.json"
import './App.css';

const App = () => {
  const [chain, setChain] = useState(-1);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [bridgeContract, _setBridgeContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [decimals, setDecimals] = useState(18);
  const [balance, setBalance] = useState(0);
  const [allowance, setAllowance] = useState(0);
  const [bridgeAmount, setBridgeAmount] = useState(0);
  const [withdrawableAmount, setWithdrawableAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  //use ref to access from setInterval function
  const bridgeContractRef = useRef(bridgeContract);
  const setBridgeContract = (data) => {
    bridgeContractRef.current = data;
    _setBridgeContract(data);
  };

  const init = async () => {
    checkIfWalletIsConnected();

    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    onNetworkChanged(chainId);
  }

  const onNetworkChanged = async (chainId) => {
    if(chainId == "0x5" || chainId == "0x61")
      setChain(chainId);
    else
      setChain(-1);
  }

  const onTokenTransfer = async(from, to, amount) => {
    if(to.toLowerCase() === currentAccount || from.toLowerCase() === currentAccount){
      loadTokenBalance();
      loadWithdrawableAmount();
    }
  }

  const onTokenApproval = async(owner, spender, amount) => {
    if(owner.toLowerCase() === currentAccount) {
      loadTokenAllowance();
    }
  }

  const loadContracts = async () => {
    const { ethereum } = window;

    if (ethereum)
    {
      const provider = new ethers.providers.Web3Provider(ethereum);
      const signer = provider.getSigner();
     
      const bridgeContract = new ethers.Contract(
          chain == "0x5" ? CONTRACT_ADDRESS_ETH : CONTRACT_ADDRESS_BSC,
          Bridge.abi,
          signer
      );
  
      setBridgeContract(bridgeContract);

      const tokenContract = new ethers.Contract(
        chain == "0x5" ? TOKEN_ADDRESS_ETH : TOKEN_ADDRESS_BSC,
        TestToken.abi,
        signer
      );
      setTokenContract(tokenContract);
    }
  }

  const loadDecimals = async () => {
    const decimals = await tokenContract.decimals();
    setDecimals(decimals);
  }

  const loadTokenBalance = async () => {
    const balance = await tokenContract.balanceOf(currentAccount);
    setBalance(balance / (10 ** decimals));
  }

  const loadTokenAllowance = async () => {
    const bridgeContractAddress = chain == "0x5" ? CONTRACT_ADDRESS_ETH : CONTRACT_ADDRESS_BSC;
    const allowance = await tokenContract.allowance(currentAccount, bridgeContractAddress);
    setAllowance(allowance / (10 ** decimals));
  }

  const loadWithdrawableAmount = async () => {
    const claimable = await bridgeContractRef.current.claimableTokens(currentAccount);
    setWithdrawableAmount(claimable / (10 ** decimals));
  }

  const connectWalletAction = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert('Get MetaMask!');
        return;
      }

      const disconnected = localStorage.getItem("disconnected");
      if(disconnected)
      {
        const overrides = {
          eth_accounts: {} 
        }
        await ethereum.request({
          method: 'wallet_requestPermissions', params: [overrides]
        });
      }

      const accounts = await ethereum.request({
        method: 'eth_requestAccounts'
      });

      setCurrentAccount(accounts[0].toLowerCase());

      localStorage.setItem("disconnected", false);
    } catch (error) {
      console.log(error);
    }
}

  const disconnectWalletAction = async () => {
    localStorage.setItem("disconnected", true);
    setCurrentAccount(null);
    setBridgeContract(null);
    setTokenContract(null);
  }

  const checkIfWalletIsConnected = async () => {
    try {
      const { ethereum } = window;
  
      if (!ethereum) {
        console.log('Make sure you have MetaMask!');
        return;
      } else {
  
        const disconnected = localStorage.getItem("disconnected");
        if(disconnected == "true")
        {
          return;
        }
  
        const accounts = await ethereum.request({ method: 'eth_accounts' });
  
        if (accounts.length !== 0) {
          const account = accounts[0];
          setCurrentAccount(account.toLowerCase());
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  const addTokenToMetamask = async() => {
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: chain == "0x5" ? TOKEN_ADDRESS_ETH : TOKEN_ADDRESS_BSC, 
            symbol: "BTKN",
            decimals: "18", 
            image: "", 
          },
        },
      });
    
    } catch (error) {
      console.log(error);
    }
  }

  const deposit = async () => {
    if(bridgeAmount > 0)
    {
      try { 
        setLoading(true);
        const bridgeContractAddress = chain == "0x5" ? CONTRACT_ADDRESS_ETH : CONTRACT_ADDRESS_BSC;
       
        const amount = ethers.utils.parseUnits(bridgeAmount, decimals);
        if(allowance < bridgeAmount)
        {
          await tokenContract.approve(bridgeContractAddress, amount);
        }
        else
        {
          await bridgeContract.deposit(amount);
          setBridgeAmount(0);
        }
        
        setLoading(false);
      } catch(error) {
        console.log(error);
        setLoading(false);
      }
    }
    else
    {
      alert("You need to input a number of token to bridge.");
    }
  }

  const withdraw = async () => {
    if(withdrawableAmount > 0)
    {
      try { 
        setLoading(true);
        await bridgeContract.withdraw();
        setWithdrawableAmount(0);
        setLoading(false);
      } catch(error) {
        console.log(error);
        setLoading(false);
      }
    }
    else
    {
      alert("You don't have any token to claim on this blockchain. Maybe you need to switch to the other one.");
    }
  }

  const mintTestTokens = async () => {
    try { 
      setLoading(true);
      await tokenContract.mint(currentAccount, ethers.utils.parseUnits("10", decimals));
      setWithdrawableAmount(0);
      setLoading(false);
    } catch(error) {
      console.log(error);
      setLoading(false);
    }
  }

  const askToSwitchChain = async (desiredChain) => {
    try { 
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params:[{chainId: desiredChain}]});
    } catch(error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: desiredChain,
                chainName: desiredChain == "0x5" ? "Goerli" : "BSC Testnet",
                rpcUrls: [ desiredChain == "0x5" ? "https://rpc.ankr.com/eth_goerli" : "https://data-seed-prebsc-1-s1.binance.org:8545"],
              },
            ],
          });

          await window.ethereum.request({ method: 'wallet_switchEthereumChain', params:[{chainId: desiredChain}]});
        } catch (addError) {
          console.log(addError)
        }
      }
      else
      {
        console.log(error)
      }
    }
  }

  const onChangeSelectChainValue = (e) => {
    if(e.target.value == "erc") {
      askToSwitchChain("0x5");
    }
    else if(e.target.value == "bsc") {
      askToSwitchChain("0x61");
    }
  }

  const onChangeBridgeAmount = (e) => {
    if(e.target.value <= balance && e.target.value >= 0) {
      setBridgeAmount(e.target.value);
    }
  }
  
  useEffect(() => {
    init();
    
    if(window.ethereum)
    {
      window.ethereum.on("chainChanged", onNetworkChanged);
      
      return () => {
        window.ethereum.removeListener("chainChanged", onNetworkChanged);
      }
    }
  }, []);

  useEffect(() => {
    if(currentAccount != null && chain != -1)
    {
      loadContracts();
    }
  }, [currentAccount, chain]);

  useEffect(() => {
    if(tokenContract != null && currentAccount != null)
    {
      loadDecimals();
      loadTokenBalance();
      loadTokenAllowance();
      setBridgeAmount(0);

      setInterval(loadWithdrawableAmount, 5000);

      tokenContract.on("Transfer", onTokenTransfer);
      tokenContract.on("Approval", onTokenApproval);
      return () => {
        tokenContract.off("Transfer", onTokenTransfer);
        tokenContract.off("Approval", onTokenApproval);
        clearInterval(loadWithdrawableAmount);
      }
    }
      
  }, [tokenContract]);

  useEffect(() => {
    if(bridgeContract != null && currentAccount != null)
    {
      loadWithdrawableAmount();
    }
      
  }, [bridgeContract]);

  const renderContent = () => {
    return (  
      <div>
        <div className="centerFlex">
          <select name="bc" id="bcSelector" value={chain == "0x5" ? "erc" : "bsc" } onChange={onChangeSelectChainValue}>
            <option value="erc">ERC</option>
            <option value="bsc">BSC</option>
          </select>
          <div className="centerAlone">
            <span>Balance : {balance} </span> <br /><br />
            <button onClick={addTokenToMetamask}>Debug: Add token to Metamask</button><br /><br />
            <button onClick={mintTestTokens}>Debug: Get test token</button>
          </div>
       </div>

        <div className="centerAlone">
          <h3> Amount to bridge to {chain != -1 && chain == "0x5" ? "BSC" : "ERC"} : </h3>
          <input type="number" value={bridgeAmount} onChange={onChangeBridgeAmount} /> <button onClick={() => setBridgeAmount(balance)}> Max </button> <br />
          <input type="range" min="0" max={balance} value={bridgeAmount} onChange={onChangeBridgeAmount}></input> <br />
          {
            (loading || bridgeAmount == 0)
            && <button className="disabled"> { allowance < bridgeAmount ? "Approve token" : "Deposit" } </button> 
            || <button onClick={deposit}> { allowance < bridgeAmount ? "Approve token" : "Deposit" } </button> 
          }
          <br /><br />

          <hr />

          <h3> Amount withdrawable from {chain != -1 && chain == "0x5" ? "ERC" : "BSC"} : {withdrawableAmount} </h3>
          {
            (loading || withdrawableAmount == 0) 
            && <button className="disabled"> Withdraw </button>
            || <button onClick={withdraw}> Withdraw </button>
          }
          
        </div>
        <br /><br />
        <p>Once you deposited the amount of token you want to bridge from a blockchain (with the deposit button), you will have to switch to 
          the other blockchain in order to use the withdraw button. You may need to approve the bridge in order to deposit your tokens. </p>
      </div>
   );
  }

  return (
    <div className="App">
      <header>
      <div>
        <h1>Bridge Tokens</h1>
      </div>
        <div className="headerRight">
          {
            currentAccount ?
            (<div>
              <span> Wallet connected : {currentAccount} </span> <button onClick={disconnectWalletAction}> Disconnect </button> </div>)
            :
            (<button onClick={connectWalletAction}> 
              Connect Wallet 
            </button>)
          }
        </div>
      </header>

      <div className="centerDiv">

      { (chain != -1 && currentAccount) &&
        renderContent()
        || (
         currentAccount == null && 
          <div>
            <p> Please connect with Metamask.</p>
            <div className="centerAlone">
            <button onClick={connectWalletAction}> 
            Connect Wallet 
            </button>
            </div>
          </div>
          ||
        <div>
          <p> Please connect to Ethereum or Binance Smart Chain.</p>
          <div className="centerFlex">
            <button onClick={() => askToSwitchChain("0x5")}> Switch to ERC </button>
            <button onClick={() => askToSwitchChain("0x61")}> Switch to BSC </button>
          </div>
        </div>)
      }

    </div>
    </div>
  );
}

export default App;
