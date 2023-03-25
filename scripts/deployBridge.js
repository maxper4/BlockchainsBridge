const main = async () => {
    const contractBridgeFactory = await hre.ethers.getContractFactory("Bridge");
    const tokenContactFactory = await hre.ethers.getContractFactory("TestToken");

    const tokenContact = await tokenContactFactory.deploy();
    await tokenContact.deployed();
    console.log("Token contract deployed to:", tokenContact.address);

    const contractBridge = await contractBridgeFactory.deploy(tokenContact.address);
    await contractBridge.deployed();
    console.log("Bridge contract deployed to:", contractBridge.address);

    await tokenContact.mint(contractBridge.address, hre.ethers.utils.parseEther("10000000"));

    try {
      await hre.run("verify:verify", {
        address: tokenContact.address,
        constructorArguments: []
      })
    } catch (error) {
      console.log(error);
    }

    try {
      await hre.run("verify:verify", {
        address: contractBridge.address,
        constructorArguments: [tokenContact.address]
      })
    }
    catch (error) {
      console.log(error);
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