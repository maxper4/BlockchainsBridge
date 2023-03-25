const main = async () => {
    require('dotenv').config();
    const { ethers, Wallet } = require("ethers");
    const Bridge = require("../artifacts/contracts/Bridge.sol/Bridge.json").abi;
    
    const providerBsc = new ethers.providers.JsonRpcProvider( "https://data-seed-prebsc-1-s1.binance.org:8545/" );
    const alchemyProvider = new ethers.providers.JsonRpcProvider(process.env.STAGING_ALCHEMY_KEY);

    const signerEth = new ethers.Wallet(process.env.PRIVATE_KEY, alchemyProvider);
    const signerBsc =  new Wallet(process.env.PRIVATE_KEY, providerBsc);
    
    const bridgeEth = new ethers.Contract(process.env.ADDRESS_ETH_BRIDGE, Bridge, signerEth);
    const bridgeBsc = new ethers.Contract(process.env.ADDRESS_BSC_BRIDGE, Bridge, signerBsc);

    let lastInfosEthNonce = await bridgeEth.nonceOtherChain();
    let lastInfosBscNonce = await bridgeBsc.nonceOtherChain();

    const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

    console.log("Bot ready and connected.");

    //bot running all 15sec
    while(true){
      await run();
      await sleep(15000);
    }

    async function run() {
        const ethNonce = await bridgeEth.nonceThisChain();
        const bscInfosNonce = await bridgeBsc.nonceOtherChain();
        const bscNonce = await bridgeBsc.nonceThisChain();
        const ethInfosNonce = await bridgeEth.nonceOtherChain();

          if(lastInfosEthNonce > ethInfosNonce || lastInfosBscNonce > bscInfosNonce)
        {
          console.log("WARNING: Bot is running too fast.");
          return;
        }//security measure in case the bot is running faster than confirmation time on blockchains, otherwise it could write multiple time the same deposits
      

        //eth deposit to claim on bsc
        if(ethNonce > bscInfosNonce)
        {
            const depositsToWrite = await bridgeEth.getDepositsSinceStartingNonce(bscInfosNonce);
            console.log("Depositing to bsc:");
            console.log(depositsToWrite);
            lastInfosBscNonce += depositsToWrite.depositors.length;
            await bridgeBsc.updateDeposits(depositsToWrite.depositors, depositsToWrite.amount);
        }
        
        //bsc deposit to claim on eth
        if(bscNonce > ethInfosNonce)
        {
            const depositsToWrite = await bridgeBsc.getDepositsSinceStartingNonce(ethInfosNonce);
            console.log("Depositing to eth:");
            console.log(depositsToWrite);
            lastInfosEthNonce += depositsToWrite.depositors.length;
            await bridgeEth.updateDeposits(depositsToWrite.depositors, depositsToWrite.amount);
        }
    }
  };
  
  const runMain = async () => {
    try {
      await main();
      process.exit(0);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  };
  
  runMain();